"""Inbound webhook receivers for GitHub / Slack.

These are *receiver* endpoints — no OAuth flow, no outbound calls. To wire
up GitHub, the user copies the URL + secret from the workspace's integration
settings and pastes them into the repo's webhook config. Slack is the same
pattern: post-message → workspace's URL with the shared secret.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import (
    IntegrationKind,
    Issue,
    IssueLink,
    IssueLinkStatus,
    IssueLinkType,
    StateGroup,
    Team,
    Workspace,
    WorkflowState,
    WorkspaceIntegration,
)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def _load_integration(db: Session, slug: str, kind: IntegrationKind) -> tuple[Workspace, WorkspaceIntegration, dict]:
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(404, "workspace not found")
    integ = db.query(WorkspaceIntegration).filter_by(workspace_id=ws.id, kind=kind, enabled=True).first()
    if not integ:
        raise HTTPException(404, f"{kind.value} integration not configured")
    try:
        config = json.loads(integ.config or "{}")
    except json.JSONDecodeError:
        config = {}
    return ws, integ, config


def _verify_github_signature(secret: str, signature_header: str | None, body: bytes) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


_ISSUE_REF_RE = re.compile(r"\b([A-Z][A-Z0-9]{0,8}-\d+)\b")


def _find_issue_refs(text: str) -> list[str]:
    if not text:
        return []
    return list(dict.fromkeys(_ISSUE_REF_RE.findall(text)))  # preserve first-seen order


def _gh_status_for(action: str | None, pr: dict | None) -> IssueLinkStatus:
    if pr and pr.get("merged"):
        return IssueLinkStatus.merged
    if action == "closed":
        return IssueLinkStatus.closed
    if pr and pr.get("draft"):
        return IssueLinkStatus.draft
    return IssueLinkStatus.open


def _upsert_pr_link(db: Session, issue: Issue, url: str, title: str, status: IssueLinkStatus, link_type: IssueLinkType) -> IssueLink:
    link = db.query(IssueLink).filter_by(issue_id=issue.id, url=url).first()
    if link:
        link.title = title[:512]
        link.status = status
        link.type = link_type
        return link
    link = IssueLink(
        issue_id=issue.id,
        url=url,
        title=title[:512],
        type=link_type,
        status=status,
    )
    db.add(link)
    return link


@router.post("/github/{slug}")
async def github_webhook(
    slug: str,
    request: Request,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    raw = await request.body()
    ws, integ, config = _load_integration(db, slug, IntegrationKind.github)
    secret = (config.get("secret") or "").strip()
    if not secret:
        raise HTTPException(400, "github integration has no secret configured")
    if not _verify_github_signature(secret, x_hub_signature_256, raw):
        raise HTTPException(401, "bad signature")

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(400, "invalid json")

    matched = 0
    updated_links = 0
    if x_github_event == "pull_request":
        pr = payload.get("pull_request") or {}
        action = payload.get("action")
        title = pr.get("title", "")
        body = pr.get("body", "") or ""
        url = pr.get("html_url") or pr.get("url") or ""
        branch = (pr.get("head") or {}).get("ref", "")
        status = _gh_status_for(action, pr)
        refs = _find_issue_refs(f"{title}\n{body}\n{branch}")
        for ref in refs:
            issue = (
                db.query(Issue)
                .join(Team, Issue.team_id == Team.id)
                .filter(Team.workspace_id == ws.id, Issue.identifier == ref)
                .first()
            )
            if not issue:
                continue
            matched += 1
            if url:
                _upsert_pr_link(db, issue, url, title or ref, status, IssueLinkType.github_pr)
                updated_links += 1
    elif x_github_event == "push":
        commits = payload.get("commits") or []
        repo = (payload.get("repository") or {}).get("html_url", "")
        for c in commits:
            msg = (c.get("message") or "")
            url = c.get("url") or ""
            refs = _find_issue_refs(msg)
            for ref in refs:
                issue = (
                    db.query(Issue)
                    .join(Team, Issue.team_id == Team.id)
                    .filter(Team.workspace_id == ws.id, Issue.identifier == ref)
                    .first()
                )
                if not issue:
                    continue
                matched += 1
                if url:
                    _upsert_pr_link(db, issue, url, msg[:120], IssueLinkStatus.merged, IssueLinkType.github_branch)
                    updated_links += 1

    db.commit()
    return {"ok": True, "event": x_github_event, "refs_matched": matched, "links_updated": updated_links}


@router.post("/slack/{slug}")
async def slack_webhook(
    slug: str,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Generic Slack intake. Accepts a simple JSON body:

        { "secret": "...",       # must match integration config
          "team_key": "ENG",      # optional; defaults to config default
          "title": "ASK: ...",
          "body": "...",
          "actor": "user-name" }

    Creates a triage issue in the target team.
    """
    payload = await request.json()
    ws, integ, config = _load_integration(db, slug, IntegrationKind.slack)
    expected_secret = (config.get("secret") or "").strip()
    if not expected_secret:
        raise HTTPException(400, "slack integration has no secret configured")
    if (payload.get("secret") or "") != expected_secret:
        raise HTTPException(401, "bad secret")

    team_key = payload.get("team_key") or config.get("default_team_key")
    if not team_key:
        raise HTTPException(400, "team_key required (or set default_team_key in config)")
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")

    state = (
        db.query(WorkflowState)
        .filter_by(team_id=team.id)
        .order_by(WorkflowState.position)
        .first()
    )
    if not state:
        raise HTTPException(400, "team has no workflow states")

    n = db.query(Issue).filter(Issue.team_id == team.id, Issue.identifier.startswith(f"{team.key}-")).count()
    identifier = f"{team.key}-{n + 1}"
    title = (payload.get("title") or "Slack request")[:255]
    body = payload.get("body") or ""
    actor = payload.get("actor") or "Slack"
    full_body = f"From {actor} (Slack):\n\n{body}" if body else f"From {actor} (Slack)"

    issue = Issue(
        identifier=identifier,
        team_id=team.id,
        state_id=state.id,
        title=title,
        description=full_body,
        is_triage=True,
        triage_source="slack",
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return {"ok": True, "identifier": issue.identifier}
