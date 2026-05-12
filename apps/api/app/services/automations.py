"""Automation engine.

Tiny rule evaluator wired into the issue mutation paths. Each `Automation`
row pairs a `trigger` (with config) and an `action` (with config). When
`run_event(...)` fires, every enabled rule for the workspace+team whose
trigger matches gets applied.

Stays intentionally side-effecty: rules can mutate the issue and produce
follow-up comments. The caller commits.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy.orm import Session

from app.db.models import (
    Automation,
    AutomationAction,
    AutomationTrigger,
    Comment,
    Issue,
    Label,
    Member,
    StateGroup,
    Team,
    WorkflowState,
)


def _matches_team(rule: Automation, team_id: str | None) -> bool:
    return rule.team_id is None or rule.team_id == team_id


def _cfg(value: str) -> dict:
    try:
        return json.loads(value or "{}")
    except json.JSONDecodeError:
        return {}


def _state_in_group(db: Session, team_id: str, group: str) -> WorkflowState | None:
    try:
        g = StateGroup(group)
    except ValueError:
        return None
    return (
        db.query(WorkflowState)
        .filter_by(team_id=team_id, group=g)
        .order_by(WorkflowState.position.asc())
        .first()
    )


def _apply_action(db: Session, rule: Automation, issue: Issue) -> None:
    action_cfg = _cfg(rule.action_config)
    if rule.action == AutomationAction.move_to_state:
        target = _state_in_group(db, issue.team_id, action_cfg.get("state_group", "completed"))
        if target:
            issue.state_id = target.id
    elif rule.action == AutomationAction.assign_to_member:
        mid = action_cfg.get("member_id")
        if mid:
            issue.assignee_id = mid
    elif rule.action == AutomationAction.add_label:
        lid = action_cfg.get("label_id")
        if lid:
            label = db.query(Label).filter_by(id=lid).first()
            if label and label not in issue.labels:
                issue.labels.append(label)
    elif rule.action == AutomationAction.add_comment:
        body = action_cfg.get("body") or f"Automation `{rule.name}` ran."
        db.add(Comment(issue_id=issue.id, author_id=None, body=body))
    elif rule.action == AutomationAction.archive:
        issue.archived_at = datetime.now(timezone.utc)
    elif rule.action == AutomationAction.set_priority:
        p = action_cfg.get("priority")
        if isinstance(p, int) and 0 <= p <= 4:
            issue.priority = p
    elif rule.action == AutomationAction.rotate_assign:
        ids = list(action_cfg.get("member_ids") or [])
        if not ids:
            return
        cursor = int(action_cfg.get("cursor", 0)) % len(ids)
        issue.assignee_id = ids[cursor]
        action_cfg["cursor"] = (cursor + 1) % len(ids)
        rule.action_config = json.dumps(action_cfg)


def _trigger_matches(rule: Automation, event: AutomationTrigger, payload: dict) -> bool:
    if rule.trigger != event:
        return False
    cfg = _cfg(rule.trigger_config)
    if event == AutomationTrigger.on_status_change:
        wanted_to = cfg.get("to_state_group")
        wanted_from = cfg.get("from_state_group")
        if wanted_to and payload.get("to_state_group") != wanted_to:
            return False
        if wanted_from and payload.get("from_state_group") != wanted_from:
            return False
        return True
    if event == AutomationTrigger.on_label_added:
        wanted_label = cfg.get("label_id")
        return not wanted_label or payload.get("label_id") == wanted_label
    return True


def run_event(
    db: Session,
    workspace_id: str,
    issue: Issue,
    event: AutomationTrigger,
    payload: dict | None = None,
) -> int:
    """Run every enabled rule matching (workspace, issue.team_id, event).

    Returns the number of rules applied. Caller is responsible for commit.
    """
    payload = payload or {}
    rules: Iterable[Automation] = (
        db.query(Automation)
        .filter(Automation.workspace_id == workspace_id, Automation.enabled.is_(True), Automation.trigger == event)
        .all()
    )
    n = 0
    for rule in rules:
        if not _matches_team(rule, issue.team_id):
            continue
        if not _trigger_matches(rule, event, payload):
            continue
        _apply_action(db, rule, issue)
        n += 1
    return n


def run_scheduled(db: Session, workspace_id: str) -> dict:
    """Apply scheduled (stale_in_state) rules across the workspace.

    Returns a summary dict: {applied: N, by_rule: {rule_id: count}}.
    Designed to be invoked by an admin endpoint — no cron in-process.
    """
    rules = (
        db.query(Automation)
        .filter(Automation.workspace_id == workspace_id, Automation.enabled.is_(True), Automation.trigger == AutomationTrigger.stale_in_state)
        .all()
    )
    summary = {"applied": 0, "by_rule": {}}
    now = datetime.now(timezone.utc)
    for rule in rules:
        cfg = _cfg(rule.trigger_config)
        group = cfg.get("state_group")
        days = int(cfg.get("days", 14) or 14)
        if not group:
            continue
        try:
            sg = StateGroup(group)
        except ValueError:
            continue
        threshold = now - timedelta(days=days)
        q = (
            db.query(Issue)
            .join(WorkflowState, Issue.state_id == WorkflowState.id)
            .filter(WorkflowState.group == sg)
            .filter(Issue.updated_at <= threshold)
            .filter(Issue.archived_at.is_(None))
        )
        if rule.team_id:
            q = q.filter(Issue.team_id == rule.team_id)
        else:
            # Workspace-wide: limit to issues in teams of this workspace.
            team_ids = [t.id for t in db.query(Team).filter_by(workspace_id=workspace_id).all()]
            if not team_ids:
                continue
            q = q.filter(Issue.team_id.in_(team_ids))
        hits = q.all()
        for issue in hits:
            _apply_action(db, rule, issue)
        summary["by_rule"][rule.id] = len(hits)
        summary["applied"] += len(hits)
    return summary
