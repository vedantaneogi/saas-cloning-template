"""Idempotent seed application.

Schema (`$schema: "linear-seed/v1"`):

```json
{
  "$schema": "linear-seed/v1",
  "workspaces": [
    {
      "slug": "demo",
      "name": "Demo",
      "icon_color": "#f59e0b",
      "members": [{"name": "Navtesh", "email": "...", "initials": "NM", "color": "#5e6ad2"}],
      "workspace_labels": [{"name": "Bug", "color": "#eb5757"}],
      "teams": [
        {
          "key": "ENG",
          "name": "Engineering",
          "icon_color": "#22c55e",
          "cycles_enabled": true,
          "states": [{"name": "Todo", "group": "unstarted", "position": 1}],
          "labels": [{"name": "Backend", "color": "#5e6ad2"}],
          "issues": [
            {
              "identifier": "ENG-1",
              "title": "...",
              "description": "...",
              "priority": 1,
              "state": "In Progress",
              "assignee_email": "...",
              "labels": ["Backend"],
              "estimate": 5,
              "sub_issues": [...],
              "relations": [{"type": "blocks", "target": "ENG-46"}],
              "comments": [{"author_email": "...", "body": "..."}]
            }
          ]
        }
      ]
    }
  ]
}
```

Idempotency: every entity is matched by a stable key (slug/email/key/identifier);
existing rows update in-place, missing rows are created.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

import secrets

from app.db.models import (
    Comment,
    CustomerRequest,
    CustomerRequestStatus,
    Cycle,
    Document,
    Initiative,
    InitiativeStatus,
    Issue,
    IssueRelation,
    Label,
    Member,
    Project,
    ProjectMilestone,
    ProjectState,
    ProjectUpdate as ProjectUpdateModel,
    RelationType,
    StateGroup,
    Team,
    UpdateHealth,
    Workspace,
    WorkflowState,
)


def _make_slug(name: str) -> str:
    base = "".join(c if c.isalnum() or c == "-" else "-" for c in name.lower()).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return f"{base}-{secrets.token_hex(6)}"


def _parse_dt(value):
    """Accept ISO 8601 strings or datetime objects; return datetime or None."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value
    from datetime import datetime
    s = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None

ACCEPTED_SCHEMAS = {"linear-seed/v1"}

DEFAULT_STATES = [
    {"name": "Backlog", "group": "backlog", "position": 0, "color": "#95a2b3"},
    {"name": "Todo", "group": "unstarted", "position": 1, "color": "#e2e2e2"},
    {"name": "In Progress", "group": "started", "position": 2, "color": "#f2c94c"},
    {"name": "In Review", "group": "started", "position": 3, "color": "#5e6ad2"},
    {"name": "Done", "group": "completed", "position": 4, "color": "#5e6ad2"},
    {"name": "Canceled", "group": "canceled", "position": 5, "color": "#95a2b3"},
]


def _err(path: list[str], message: str, expected: Any = None, got: Any = None) -> Exception:
    return ValueError(
        {
            "path": "/".join(path),
            "message": message,
            "expected": expected,
            "got": got,
        }
    )


def apply_seed(db: Session, payload: dict) -> dict:
    schema = payload.get("schema_") or payload.get("$schema")
    if schema not in ACCEPTED_SCHEMAS:
        raise _err(["$schema"], "unsupported schema", expected=sorted(ACCEPTED_SCHEMAS), got=schema)

    summary = {"workspaces": 0, "teams": 0, "members": 0, "labels": 0, "issues": 0, "projects": 0}

    for w in payload.get("workspaces", []) or []:
        ws = _upsert_workspace(db, w)
        summary["workspaces"] += 1

        members_by_email: dict[str, Member] = {}
        for m in w.get("members", []) or []:
            mem = _upsert_member(db, ws, m)
            members_by_email[m.get("email", "")] = mem
            summary["members"] += 1

        ws_labels: dict[str, Label] = {l.name.lower(): l for l in ws.labels}
        for l in w.get("workspace_labels", []) or []:
            lbl = _upsert_label(db, l, workspace=ws, team=None)
            ws_labels[lbl.name.lower()] = lbl
            summary["labels"] += 1

        # Initiatives (created BEFORE projects so project.initiative resolves)
        initiatives_by_name: dict[str, Initiative] = {i.name.lower(): i for i in db.query(Initiative).filter_by(workspace_id=ws.id).all()}
        for ini_def in w.get("initiatives", []) or []:
            ini = _upsert_initiative(db, ws, ini_def, members_by_email, initiatives_by_name)
            initiatives_by_name[ini.name.lower()] = ini

        # Projects (created BEFORE issues so issue.project assignment works)
        projects_by_name: dict[str, Project] = {p.name.lower(): p for p in db.query(Project).filter_by(workspace_id=ws.id).all()}
        for proj_def in w.get("projects", []) or []:
            project = _upsert_project(db, ws, proj_def, members_by_email, projects_by_name, initiatives_by_name)
            summary["projects"] += 1

        # Documents (created after projects so project references resolve)
        documents_by_title: dict[str, Document] = {d.title.lower(): d for d in db.query(Document).filter_by(workspace_id=ws.id).all()}
        for doc_def in w.get("documents", []) or []:
            _upsert_document(db, ws, doc_def, members_by_email, projects_by_name, documents_by_title)

        # Customer requests (defer issue linking to a post-pass below)
        existing_crs: dict[str, CustomerRequest] = {c.title.lower(): c for c in db.query(CustomerRequest).filter_by(workspace_id=ws.id).all()}
        pending_links: list[tuple[CustomerRequest, str]] = []
        for cr_def in w.get("customer_requests", []) or []:
            cr = _upsert_customer_request(db, ws, cr_def, existing_crs)
            if cr_def.get("issue_identifier"):
                pending_links.append((cr, cr_def["issue_identifier"]))

        for t in w.get("teams", []) or []:
            team = _upsert_team(db, ws, t)
            summary["teams"] += 1

            # workflow states (per team) — keep an authoritative dict so we
            # don't re-read team.states before SQLAlchemy refreshes it.
            states_def = t.get("states") or DEFAULT_STATES
            states_map: dict[str, WorkflowState] = {s.name.lower(): s for s in team.states}
            for s in states_def:
                _upsert_state(db, team, s, states_map)

            # team labels
            team_labels = {l.name.lower(): l for l in team.labels}
            for l in t.get("labels", []) or []:
                lbl = _upsert_label(db, l, workspace=None, team=team)
                team_labels[lbl.name.lower()] = lbl
                summary["labels"] += 1

            # cycles (created before issues so cycle_number references resolve)
            cycles_by_number: dict[int, Cycle] = {c.number: c for c in db.query(Cycle).filter_by(team_id=team.id).all()}
            for cyc_def in t.get("cycles", []) or []:
                cyc = _upsert_cycle(db, team, cyc_def, cycles_by_number)
                cycles_by_number[cyc.number] = cyc

            # issues
            for it in t.get("issues", []) or []:
                _upsert_issue(
                    db,
                    team=team,
                    issue_def=it,
                    states=states_map,
                    workspace_labels=ws_labels,
                    team_labels=team_labels,
                    members=members_by_email,
                    projects=projects_by_name,
                    cycles=cycles_by_number,
                )
                summary["issues"] += 1

            # triage issues (separate so they get is_triage=True automatically)
            for it in t.get("triage_issues", []) or []:
                triage_def = {**it, "is_triage": True}
                _upsert_issue(
                    db,
                    team=team,
                    issue_def=triage_def,
                    states=states_map,
                    workspace_labels=ws_labels,
                    team_labels=team_labels,
                    members=members_by_email,
                    projects=projects_by_name,
                    cycles=cycles_by_number,
                )
                summary["issues"] += 1

        db.flush()

        # second pass: relations (after all issues exist)
        for t in w.get("teams", []) or []:
            for it in t.get("issues", []) or []:
                for r in it.get("relations", []) or []:
                    _upsert_relation(db, source_identifier=it["identifier"], target_identifier=r["target"], rtype=r["type"])

        # Link customer requests to issues (now that issues are flushed)
        for cr, identifier in pending_links:
            issue = db.query(Issue).filter_by(identifier=identifier).first()
            if issue:
                cr.issue_id = issue.id
                if cr.status == CustomerRequestStatus.pending:
                    cr.status = CustomerRequestStatus.linked

    db.commit()
    return {"status": "ok", "applied": summary}


def _upsert_workspace(db: Session, w: dict) -> Workspace:
    ws = db.query(Workspace).filter_by(slug=w["slug"]).first()
    if not ws:
        ws = Workspace(slug=w["slug"], name=w["name"], icon_color=w.get("icon_color", "#f59e0b"))
        db.add(ws)
    else:
        ws.name = w["name"]
        ws.icon_color = w.get("icon_color", ws.icon_color)
    db.flush()
    return ws


def _upsert_member(db: Session, ws: Workspace, m: dict) -> Member:
    email = m.get("email")
    mem = None
    if email:
        mem = db.query(Member).filter_by(workspace_id=ws.id, email=email).first()
    if not mem:
        mem = Member(
            workspace_id=ws.id,
            name=m["name"],
            email=email,
            initials=m.get("initials", m["name"][:2].upper()),
            color=m.get("color", "#5e6ad2"),
        )
        db.add(mem)
    else:
        mem.name = m["name"]
        mem.initials = m.get("initials", mem.initials)
        mem.color = m.get("color", mem.color)
    db.flush()
    return mem


def _upsert_team(db: Session, ws: Workspace, t: dict) -> Team:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=t["key"]).first()
    if not team:
        team = Team(
            workspace_id=ws.id,
            key=t["key"],
            name=t["name"],
            icon_color=t.get("icon_color", "#22c55e"),
            cycles_enabled=t.get("cycles_enabled", False),
        )
        db.add(team)
    else:
        team.name = t["name"]
        team.icon_color = t.get("icon_color", team.icon_color)
        team.cycles_enabled = t.get("cycles_enabled", team.cycles_enabled)
    db.flush()
    return team


def _upsert_state(db: Session, team: Team, s: dict, existing: dict[str, WorkflowState]) -> WorkflowState:
    state = existing.get(s["name"].lower())
    if not state:
        state = WorkflowState(
            team_id=team.id,
            name=s["name"],
            group=StateGroup(s["group"]),
            position=s.get("position", 0),
            color=s.get("color", "#95a2b3"),
        )
        db.add(state)
        existing[s["name"].lower()] = state
    else:
        state.group = StateGroup(s["group"])
        state.position = s.get("position", state.position)
        state.color = s.get("color", state.color)
    db.flush()
    return state


def _upsert_label(db: Session, l: dict, workspace: Workspace | None, team: Team | None) -> Label:
    q = db.query(Label).filter_by(name=l["name"])
    if workspace:
        q = q.filter_by(workspace_id=workspace.id, team_id=None)
    elif team:
        q = q.filter_by(team_id=team.id, workspace_id=None)
    label = q.first()
    if not label:
        label = Label(
            workspace_id=workspace.id if workspace else None,
            team_id=team.id if team else None,
            name=l["name"],
            color=l.get("color", "#5e6ad2"),
        )
        db.add(label)
    else:
        label.color = l.get("color", label.color)
    db.flush()
    return label


def _upsert_customer_request(
    db: Session,
    ws: Workspace,
    c: dict,
    by_title: dict[str, CustomerRequest],
) -> CustomerRequest:
    existing = by_title.get(c["title"].lower())
    try:
        status = CustomerRequestStatus(c.get("status", "pending"))
    except ValueError:
        status = CustomerRequestStatus.pending
    if not existing:
        existing = CustomerRequest(
            workspace_id=ws.id,
            customer_name=c["customer_name"],
            customer_email=c.get("customer_email"),
            source=c.get("source", "email"),
            title=c["title"],
            body=c.get("body"),
            status=status,
        )
        db.add(existing)
    else:
        existing.customer_name = c["customer_name"]
        existing.customer_email = c.get("customer_email", existing.customer_email)
        existing.source = c.get("source", existing.source)
        existing.body = c.get("body", existing.body)
        existing.status = status
    db.flush()
    by_title[c["title"].lower()] = existing
    return existing


def _upsert_document(
    db: Session,
    ws: Workspace,
    d: dict,
    members: dict[str, Member],
    projects: dict[str, Project],
    by_title: dict[str, Document],
) -> Document:
    existing = by_title.get(d["title"].lower())
    project = None
    if d.get("project"):
        project = projects.get(d["project"].lower())
    creator = members.get(d.get("creator_email", ""))
    if not existing:
        existing = Document(
            workspace_id=ws.id,
            project_id=project.id if project else None,
            slug_id=_make_slug(d["title"]),
            title=d["title"],
            icon=d.get("icon", "📄"),
            body=d.get("body", ""),
            creator_id=creator.id if creator else None,
        )
        db.add(existing)
    else:
        existing.title = d["title"]
        existing.icon = d.get("icon", existing.icon)
        existing.body = d.get("body", existing.body)
        if project:
            existing.project_id = project.id
        if creator:
            existing.creator_id = creator.id
    db.flush()
    by_title[d["title"].lower()] = existing
    return existing


def _upsert_initiative(
    db: Session,
    ws: Workspace,
    i: dict,
    members: dict[str, Member],
    by_name: dict[str, Initiative],
) -> Initiative:
    existing = by_name.get(i["name"].lower())
    try:
        status = InitiativeStatus(i.get("status", "planned"))
    except ValueError:
        status = InitiativeStatus.planned
    owner = members.get(i.get("owner_email", ""))
    if not existing:
        existing = Initiative(
            workspace_id=ws.id,
            slug_id=_make_slug(i["name"]),
            name=i["name"],
            description=i.get("description"),
            icon_color=i.get("icon_color", "#bb87fc"),
            status=status,
            owner_id=owner.id if owner else None,
            target_date=_parse_dt(i.get("target_date")),
        )
        db.add(existing)
    else:
        existing.name = i["name"]
        existing.description = i.get("description", existing.description)
        existing.icon_color = i.get("icon_color", existing.icon_color)
        existing.status = status
        if owner:
            existing.owner_id = owner.id
        if i.get("target_date") is not None:
            existing.target_date = _parse_dt(i["target_date"])
    db.flush()
    by_name[i["name"].lower()] = existing
    return existing


def _upsert_project(
    db: Session,
    ws: Workspace,
    p: dict,
    members: dict[str, Member],
    by_name: dict[str, Project],
    initiatives: dict[str, Initiative] | None = None,
) -> Project:
    existing = by_name.get(p["name"].lower())
    state_val = p.get("state", "planned")
    try:
        state = ProjectState(state_val)
    except ValueError:
        state = ProjectState.planned
    lead = members.get(p.get("lead_email", ""))
    initiative = None
    if initiatives and p.get("initiative"):
        initiative = initiatives.get(p["initiative"].lower())
    if not existing:
        existing = Project(
            workspace_id=ws.id,
            slug_id=_make_slug(p["name"]),
            name=p["name"],
            description=p.get("description"),
            icon_color=p.get("icon_color", "#5e6ad2"),
            state=state,
            lead_id=lead.id if lead else None,
            initiative_id=initiative.id if initiative else None,
            target_date=_parse_dt(p.get("target_date")),
            start_date=_parse_dt(p.get("start_date")),
        )
        db.add(existing)
        db.flush()
    else:
        existing.name = p["name"]
        existing.description = p.get("description", existing.description)
        existing.icon_color = p.get("icon_color", existing.icon_color)
        existing.state = state
        if lead:
            existing.lead_id = lead.id
        if initiative:
            existing.initiative_id = initiative.id
        if p.get("target_date") is not None:
            existing.target_date = _parse_dt(p["target_date"])
        if p.get("start_date") is not None:
            existing.start_date = _parse_dt(p["start_date"])
    by_name[p["name"].lower()] = existing

    # Milestones (idempotent by name)
    have = {m.name.lower(): m for m in existing.milestones}
    for i, ms in enumerate(p.get("milestones", []) or []):
        m = have.get(ms["name"].lower())
        if not m:
            db.add(ProjectMilestone(
                project_id=existing.id,
                name=ms["name"],
                target_date=_parse_dt(ms.get("target_date")),
                position=ms.get("position", i),
                description=ms.get("description"),
            ))

    # Updates (idempotent by body content)
    have_bodies = {u.body for u in existing.updates}
    for ud in p.get("updates", []) or []:
        if ud["body"] not in have_bodies:
            try:
                health = UpdateHealth(ud.get("health", "onTrack"))
            except ValueError:
                health = UpdateHealth.onTrack
            author = members.get(ud.get("author_email", ""))
            db.add(ProjectUpdateModel(
                project_id=existing.id,
                body=ud["body"],
                health=health,
                author_id=author.id if author else (lead.id if lead else None),
            ))

    db.flush()
    return existing


def _upsert_cycle(db: Session, team: Team, c: dict, existing: dict[int, Cycle]) -> Cycle:
    number = c.get("number")
    if number is None:
        # auto-assign next number if not specified
        number = (max(existing.keys()) if existing else 0) + 1
    cyc = existing.get(number)
    starts_at = _parse_dt(c.get("starts_at"))
    ends_at = _parse_dt(c.get("ends_at"))
    if not cyc:
        cyc = Cycle(
            team_id=team.id,
            number=number,
            name=c.get("name", f"Cycle {number}"),
            description=c.get("description"),
            starts_at=starts_at,
            ends_at=ends_at,
            completed_at=_parse_dt(c.get("completed_at")),
        )
        db.add(cyc)
    else:
        cyc.name = c.get("name", cyc.name)
        cyc.description = c.get("description", cyc.description)
        if starts_at is not None:
            cyc.starts_at = starts_at
        if ends_at is not None:
            cyc.ends_at = ends_at
        if c.get("completed_at") is not None:
            cyc.completed_at = _parse_dt(c.get("completed_at"))
    db.flush()
    return cyc


def _upsert_issue(
    db: Session,
    *,
    team: Team,
    issue_def: dict,
    states: dict[str, WorkflowState],
    workspace_labels: dict[str, Label],
    team_labels: dict[str, Label],
    members: dict[str, Member],
    parent_id: str | None = None,
    projects: dict[str, Project] | None = None,
    cycles: dict[int, Cycle] | None = None,
) -> Issue:
    identifier = issue_def["identifier"]
    state = states.get(issue_def.get("state", "Backlog").lower())
    if not state:
        raise _err(["issues", identifier, "state"], "unknown state", got=issue_def.get("state"))

    assignee = members.get(issue_def.get("assignee_email", ""))
    project = None
    if projects and issue_def.get("project"):
        project = projects.get(issue_def["project"].lower())

    cycle = None
    if cycles and issue_def.get("cycle_number") is not None:
        cycle = cycles.get(issue_def["cycle_number"])

    issue = db.query(Issue).filter_by(identifier=identifier).first()
    if not issue:
        issue = Issue(
            identifier=identifier,
            team_id=team.id,
            state_id=state.id,
            parent_id=parent_id,
            assignee_id=assignee.id if assignee else None,
            project_id=project.id if project else None,
            cycle_id=cycle.id if cycle else None,
            title=issue_def["title"],
            description=issue_def.get("description"),
            priority=issue_def.get("priority", 0),
            estimate=issue_def.get("estimate"),
            is_triage=bool(issue_def.get("is_triage", False)),
            triage_source=issue_def.get("triage_source") or issue_def.get("source"),
        )
        db.add(issue)
    else:
        issue.state_id = state.id
        issue.assignee_id = assignee.id if assignee else None
        if project:
            issue.project_id = project.id
        if cycle:
            issue.cycle_id = cycle.id
        issue.title = issue_def["title"]
        issue.description = issue_def.get("description")
        issue.priority = issue_def.get("priority", 0)
        issue.estimate = issue_def.get("estimate")
        if "is_triage" in issue_def:
            issue.is_triage = bool(issue_def["is_triage"])
        if issue_def.get("triage_source") is not None or issue_def.get("source") is not None:
            issue.triage_source = issue_def.get("triage_source") or issue_def.get("source")
        if parent_id:
            issue.parent_id = parent_id
    db.flush()

    # Labels
    label_names = issue_def.get("labels") or []
    resolved = []
    for name in label_names:
        lbl = team_labels.get(name.lower()) or workspace_labels.get(name.lower())
        if lbl:
            resolved.append(lbl)
    issue.labels = resolved

    # Comments
    for c in issue_def.get("comments", []) or []:
        author = members.get(c.get("author_email", ""))
        existing = db.query(Comment).filter_by(issue_id=issue.id, body=c["body"]).first()
        if not existing:
            db.add(Comment(issue_id=issue.id, author_id=author.id if author else None, body=c["body"]))

    # Sub-issues (recursive)
    for sub in issue_def.get("sub_issues", []) or []:
        _upsert_issue(
            db,
            team=team,
            issue_def=sub,
            states=states,
            workspace_labels=workspace_labels,
            team_labels=team_labels,
            members=members,
            parent_id=issue.id,
            projects=projects,
            cycles=cycles,
        )

    return issue


def _upsert_relation(db: Session, *, source_identifier: str, target_identifier: str, rtype: str) -> None:
    src = db.query(Issue).filter_by(identifier=source_identifier).first()
    tgt = db.query(Issue).filter_by(identifier=target_identifier).first()
    if not src or not tgt:
        return
    rt = RelationType(rtype)
    existing = db.query(IssueRelation).filter_by(source_id=src.id, target_id=tgt.id, type=rt).first()
    if not existing:
        db.add(IssueRelation(source_id=src.id, target_id=tgt.id, type=rt))
