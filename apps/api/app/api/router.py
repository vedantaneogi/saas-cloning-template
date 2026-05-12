"""FastAPI router — issues + workspaces + seeding."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db, get_workspace
from app.db.models import (
    Comment,
    CommentReaction,
    CustomerRequest,
    CustomerRequestStatus,
    Cycle,
    Document,
    EstimateScale,
    Initiative,
    InitiativeStatus,
    Issue,
    IssueLink,
    IssueLinkStatus,
    IssueLinkType,
    IssueRelation,
    Label,
    Member,
    MemberRole,
    Notification,
    NotificationKind,
    Project,
    ProjectMilestone,
    ProjectState,
    ProjectUpdate as ProjectUpdateModel,
    SavedView,
    StateGroup,
    Team,
    TeamMembership,
    UpdateHealth,
    Workspace,
    WorkflowState,
)
from app.services import notifications as notif
from app.schemas import (
    CommentCreateIn,
    CommentMentionOut,
    CommentOut,
    ReactionGroupOut,
    ReactionToggleIn,
    CustomerRequestCreateIn,
    CustomerRequestLinkIn,
    CustomerRequestOut,
    CustomerRequestPatchIn,
    CycleCreateIn,
    CycleOut,
    CyclePatchIn,
    DocumentCreateIn,
    DocumentOut,
    DocumentPatchIn,
    IssueLinkCreateIn,
    IssueLinkOut,
    IssueMoveIn,
    LabelCreateIn,
    LabelPatchIn,
    MemberRolePatchIn,
    TeamCreateIn,
    TeamPatchIn,
    WorkflowStateCreateIn,
    WorkflowStatePatchIn,
    InitiativeCreateIn,
    InitiativeDetailOut,
    InitiativeOut,
    InitiativePatchIn,
    IssueBulkIn,
    IssueBulkOut,
    IssueCreateIn,
    IssueDetailOut,
    IssueOut,
    IssuePatchIn,
    IssueRelationOut,
    LabelOut,
    MemberOut,
    MilestoneCreateIn,
    NotificationCountOut,
    NotificationOut,
    TriageCreateIn,
    ProjectCreateIn,
    ProjectDetailOut,
    ProjectMilestoneOut,
    ProjectOut,
    ProjectPatchIn,
    ProjectUpdateOut,
    SavedViewCreateIn,
    SavedViewOut,
    SavedViewPatchIn,
    SeedRequest,
    TeamOut,
    UpdateCreateIn,
    WorkflowStateOut,
    WorkspaceOut,
)
from app.services.seed import apply_seed

router = APIRouter(prefix="/api")


# --- helpers ------------------------------------------------------------

def _issue_query(db: Session) -> "selectinload":  # type: ignore[name-defined]
    """Common eager-loads so the serializer doesn't N+1."""
    return (
        selectinload(Issue.state),
        selectinload(Issue.team),
        selectinload(Issue.assignee),
        selectinload(Issue.labels),
        selectinload(Issue.parent),
        selectinload(Issue.cycle),
    )


def _issue_dict(issue: Issue, child_counts: dict[str, tuple[int, int]] | None = None) -> dict:
    cc = child_counts.get(issue.id) if child_counts else None
    return {
        "id": issue.id,
        "identifier": issue.identifier,
        "title": issue.title,
        "description": issue.description,
        "priority": issue.priority,
        "estimate": issue.estimate,
        "due_date": issue.due_date,
        "updated_at": issue.updated_at,
        "state": WorkflowStateOut.model_validate(issue.state),
        "team": TeamOut.model_validate(issue.team),
        "assignee": MemberOut.model_validate(issue.assignee) if issue.assignee else None,
        "labels": [LabelOut.model_validate(l) for l in issue.labels],
        "parent_identifier": issue.parent.identifier if issue.parent else None,
        "project_id": issue.project.id if issue.project else None,
        "project_name": issue.project.name if issue.project else None,
        "project_slug_id": issue.project.slug_id if issue.project else None,
        "cycle_id": issue.cycle.id if issue.cycle else None,
        "cycle_number": issue.cycle.number if issue.cycle else None,
        "is_triage": bool(issue.is_triage),
        "triage_source": issue.triage_source,
        "archived_at": issue.archived_at,
        "child_count": cc[0] if cc else 0,
        "child_done_count": cc[1] if cc else 0,
    }


# --- Comment helpers ----------------------------------------------------

_MENTION_RE = re.compile(r"@([A-Za-z][A-Za-z0-9_-]{0,40})\b")


def _resolve_mentions(db: Session, workspace_id: str, body: str) -> list[Member]:
    """Match `@Name` tokens in `body` against members in this workspace.
    Resolves on first-name (case-insensitive) and falls back to full-name."""
    tokens = {m.group(1).lower() for m in _MENTION_RE.finditer(body or "")}
    if not tokens:
        return []
    members = db.query(Member).filter_by(workspace_id=workspace_id).all()
    out: list[Member] = []
    seen: set[str] = set()
    for m in members:
        first = (m.name.split()[0] if m.name else "").lower()
        full = (m.name or "").lower().replace(" ", "")
        if (first in tokens or full in tokens) and m.id not in seen:
            out.append(m)
            seen.add(m.id)
    return out


def _reactions_for(c: Comment, current_member_id: str | None) -> list[dict]:
    by_emoji: dict[str, list[CommentReaction]] = defaultdict(list)
    for r in c.reactions:
        by_emoji[r.emoji].append(r)
    return [
        {
            "emoji": emoji,
            "count": len(rows),
            "member_ids": [r.member_id for r in rows],
            "member_names": [r.member.name for r in rows if r.member is not None],
            "reacted": bool(current_member_id and any(r.member_id == current_member_id for r in rows)),
        }
        for emoji, rows in by_emoji.items()
    ]


def _comment_dict(db: Session, c: Comment, workspace_id: str, current_member_id: str | None) -> dict:
    mentions = [
        {"member_id": m.id, "name": m.name}
        for m in _resolve_mentions(db, workspace_id, c.body)
    ]
    return {
        "id": c.id,
        "body": c.body,
        "author": MemberOut.model_validate(c.author) if c.author else None,
        "created_at": c.created_at,
        "parent_id": c.parent_id,
        "reactions": _reactions_for(c, current_member_id),
        "mentions": mentions,
        "replies": [],
    }


def _project_dict(p: Project, *, with_counts: bool = True, db: Session | None = None) -> dict:
    counts = (0, 0)
    if with_counts and db is not None:
        rows = (
            db.query(Issue.id, WorkflowState.group)
            .join(WorkflowState, Issue.state_id == WorkflowState.id)
            .filter(Issue.project_id == p.id)
            .all()
        )
        completed = sum(1 for _, g in rows if g in (StateGroup.completed, StateGroup.canceled))
        counts = (len(rows), completed)
    return {
        "id": p.id,
        "slug_id": p.slug_id,
        "name": p.name,
        "description": p.description,
        "icon_color": p.icon_color,
        "state": p.state.value if hasattr(p.state, "value") else p.state,
        "lead": MemberOut.model_validate(p.lead) if p.lead else None,
        "start_date": p.start_date,
        "target_date": p.target_date,
        "issue_count": counts[0],
        "completed_issue_count": counts[1],
        "initiative_id": p.initiative.id if p.initiative else None,
        "initiative_name": p.initiative.name if p.initiative else None,
        "initiative_slug_id": p.initiative.slug_id if p.initiative else None,
    }


def _child_counts(db: Session, parent_ids: list[str]) -> dict[str, tuple[int, int]]:
    if not parent_ids:
        return {}
    rows = (
        db.query(Issue.parent_id, WorkflowState.group)
        .join(WorkflowState, Issue.state_id == WorkflowState.id)
        .filter(Issue.parent_id.in_(parent_ids))
        .all()
    )
    totals: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for pid, group in rows:
        totals[pid][0] += 1
        if group in (StateGroup.completed, StateGroup.canceled):
            totals[pid][1] += 1
    return {pid: (t[0], t[1]) for pid, t in totals.items()}


# --- routes -------------------------------------------------------------

@router.get("/workspaces/{slug}", response_model=WorkspaceOut)
def get_workspace_route(ws: Workspace = Depends(get_workspace)) -> Workspace:
    return ws


@router.get("/workspaces/{slug}/teams/{team_key}/issues", response_model=list[IssueOut])
def list_team_issues(
    team_key: str,
    view: str = Query("active"),
    priority: str | None = Query(None),
    label: str | None = Query(None),
    assignee: str | None = Query(None),
    state: str | None = Query(None),
    project: str | None = Query(None),
    sort: str = Query("default"),
    archived: bool = Query(False),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")

    group_filter: tuple[StateGroup, ...]
    if view == "active":
        group_filter = (StateGroup.unstarted, StateGroup.started)
    elif view == "backlog":
        group_filter = (StateGroup.backlog,)
    elif view == "all":
        group_filter = tuple(StateGroup)
    elif view == "archived":
        group_filter = tuple(StateGroup)
        archived = True
    else:
        raise HTTPException(400, f"unknown view: {view}")

    q = (
        db.query(Issue)
        .join(WorkflowState, Issue.state_id == WorkflowState.id)
        .filter(
            Issue.team_id == team.id,
            WorkflowState.group.in_(group_filter),
            Issue.parent_id.is_(None),
            Issue.is_triage.is_(False),
            Issue.archived_at.is_(None) if not archived else Issue.archived_at.isnot(None),
        )
        .options(*_issue_query(db))
    )

    # Compound filters (comma-separated ids/values)
    if priority:
        vals = [int(x) for x in priority.split(",") if x.strip().isdigit()]
        if vals:
            q = q.filter(Issue.priority.in_(vals))
    if assignee:
        ids = [x for x in assignee.split(",") if x]
        if "none" in ids:
            others = [x for x in ids if x != "none"]
            if others:
                q = q.filter((Issue.assignee_id.in_(others)) | (Issue.assignee_id.is_(None)))
            else:
                q = q.filter(Issue.assignee_id.is_(None))
        elif ids:
            q = q.filter(Issue.assignee_id.in_(ids))
    if label:
        ids = [x for x in label.split(",") if x]
        if ids:
            q = q.filter(Issue.labels.any(Label.id.in_(ids)))
    if state:
        ids = [x for x in state.split(",") if x]
        if ids:
            q = q.filter(Issue.state_id.in_(ids))
    if project:
        ids = [x for x in project.split(",") if x]
        if "none" in ids:
            others = [x for x in ids if x != "none"]
            if others:
                q = q.filter((Issue.project_id.in_(others)) | (Issue.project_id.is_(None)))
            else:
                q = q.filter(Issue.project_id.is_(None))
        elif ids:
            q = q.filter(Issue.project_id.in_(ids))

    # Sorting
    if sort == "priority":
        q = q.order_by(Issue.priority.asc(), Issue.created_at.desc())
    elif sort == "updated":
        q = q.order_by(Issue.updated_at.desc())
    elif sort == "created":
        q = q.order_by(Issue.created_at.desc())
    elif sort == "due":
        q = q.order_by(Issue.due_date.asc().nullslast(), Issue.priority.asc())
    else:
        q = q.order_by(WorkflowState.position, Issue.priority, Issue.created_at)

    issues = q.all()
    counts = _child_counts(db, [i.id for i in issues])
    return [_issue_dict(i, counts) for i in issues]


# --- Projects -----------------------------------------------------------

import secrets

def _make_slug(name: str) -> str:
    base = "".join(c if c.isalnum() or c == "-" else "-" for c in name.lower()).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return f"{base}-{secrets.token_hex(6)}"


@router.get("/workspaces/{slug}/projects", response_model=list[ProjectOut])
def list_projects(
    state: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    q = db.query(Project).filter_by(workspace_id=ws.id).options(selectinload(Project.lead), selectinload(Project.initiative))
    if state:
        try:
            q = q.filter(Project.state == ProjectState(state))
        except ValueError:
            raise HTTPException(400, f"unknown state: {state}")
    projects = q.order_by(Project.created_at).all()
    return [_project_dict(p, db=db) for p in projects]


@router.get("/workspaces/{slug}/projects/{slug_id}", response_model=ProjectDetailOut)
def get_project(
    slug_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    # slug_id from URL may be the full "name-slug-xxxxxxxxxxxx" or just the suffix
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    p = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id)
        .filter((Project.slug_id == slug_id) | (Project.slug_id.like(f"%-{suffix}")))
        .options(selectinload(Project.lead), selectinload(Project.initiative), selectinload(Project.milestones), selectinload(Project.updates).selectinload(ProjectUpdateModel.author))
        .first()
    )
    if not p:
        raise HTTPException(404, f"project not found: {slug_id}")
    base = _project_dict(p, db=db)
    members: list[Member] = []
    if p.lead:
        members.append(p.lead)
    base["milestones"] = [ProjectMilestoneOut.model_validate(m).model_dump() for m in p.milestones]
    base["updates"] = [
        {
            "id": u.id,
            "body": u.body,
            "health": u.health.value if hasattr(u.health, "value") else u.health,
            "author": MemberOut.model_validate(u.author).model_dump() if u.author else None,
            "created_at": u.created_at,
        }
        for u in p.updates
    ]
    base["members"] = [MemberOut.model_validate(m).model_dump() for m in members]
    return base


@router.get("/workspaces/{slug}/projects/{slug_id}/issues", response_model=list[IssueOut])
def list_project_issues(
    slug_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    p = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id)
        .filter((Project.slug_id == slug_id) | (Project.slug_id.like(f"%-{suffix}")))
        .first()
    )
    if not p:
        raise HTTPException(404, f"project not found: {slug_id}")
    issues = (
        db.query(Issue)
        .filter(Issue.project_id == p.id, Issue.parent_id.is_(None), Issue.is_triage.is_(False))
        .options(*_issue_query(db))
        .order_by(WorkflowState.position, Issue.priority, Issue.created_at)
        .join(WorkflowState, Issue.state_id == WorkflowState.id)
        .all()
    )
    counts = _child_counts(db, [i.id for i in issues])
    return [_issue_dict(i, counts) for i in issues]


@router.post("/workspaces/{slug}/projects", response_model=ProjectOut)
def create_project(
    body: ProjectCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    try:
        state = ProjectState(body.state)
    except ValueError:
        raise HTTPException(400, f"unknown state: {body.state}")
    initiative_id = None
    if body.initiative_id:
        ini = db.query(Initiative).filter_by(id=body.initiative_id, workspace_id=ws.id).first()
        if not ini:
            raise HTTPException(400, "initiative does not belong to workspace")
        initiative_id = ini.id
    project = Project(
        workspace_id=ws.id,
        slug_id=_make_slug(body.name),
        name=body.name,
        description=body.description,
        icon_color=body.icon_color,
        state=state,
        lead_id=body.lead_id,
        initiative_id=initiative_id,
        start_date=body.start_date,
        target_date=body.target_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _project_dict(project, db=db)


@router.patch("/workspaces/{slug}/projects/{slug_id}", response_model=ProjectOut)
def patch_project(
    slug_id: str,
    body: ProjectPatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    p = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id)
        .filter((Project.slug_id == slug_id) | (Project.slug_id.like(f"%-{suffix}")))
        .first()
    )
    if not p:
        raise HTTPException(404, f"project not found: {slug_id}")
    if body.name is not None:
        p.name = body.name
    if body.description is not None:
        p.description = body.description
    if body.icon_color is not None:
        p.icon_color = body.icon_color
    if body.state is not None:
        try:
            p.state = ProjectState(body.state)
        except ValueError:
            raise HTTPException(400, f"unknown state: {body.state}")
    if body.clear_lead:
        p.lead_id = None
    elif body.lead_id is not None:
        p.lead_id = body.lead_id
    if body.clear_target_date:
        p.target_date = None
    elif body.target_date is not None:
        p.target_date = body.target_date
    if body.start_date is not None:
        p.start_date = body.start_date
    if body.clear_initiative:
        p.initiative_id = None
    elif body.initiative_id is not None:
        ini = db.query(Initiative).filter_by(id=body.initiative_id, workspace_id=ws.id).first()
        if not ini:
            raise HTTPException(400, "initiative does not belong to workspace")
        p.initiative_id = ini.id
    db.commit()
    db.refresh(p)
    return _project_dict(p, db=db)


@router.post("/workspaces/{slug}/projects/{slug_id}/milestones", response_model=ProjectMilestoneOut)
def create_milestone(
    slug_id: str,
    body: MilestoneCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> ProjectMilestone:
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    p = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id)
        .filter((Project.slug_id == slug_id) | (Project.slug_id.like(f"%-{suffix}")))
        .first()
    )
    if not p:
        raise HTTPException(404, f"project not found: {slug_id}")
    position = db.query(ProjectMilestone).filter_by(project_id=p.id).count()
    m = ProjectMilestone(project_id=p.id, name=body.name, target_date=body.target_date, position=position, description=body.description)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.post("/workspaces/{slug}/projects/{slug_id}/updates", response_model=ProjectUpdateOut)
def create_project_update(
    slug_id: str,
    body: UpdateCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    p = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id)
        .filter((Project.slug_id == slug_id) | (Project.slug_id.like(f"%-{suffix}")))
        .first()
    )
    if not p:
        raise HTTPException(404, f"project not found: {slug_id}")
    try:
        health = UpdateHealth(body.health)
    except ValueError:
        raise HTTPException(400, f"unknown health: {body.health}")
    first_member = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
    u = ProjectUpdateModel(project_id=p.id, body=body.body, health=health, author_id=first_member.id if first_member else None)
    db.add(u)
    db.commit()
    db.refresh(u)
    return {
        "id": u.id,
        "body": u.body,
        "health": u.health.value,
        "author": MemberOut.model_validate(u.author).model_dump() if u.author else None,
        "created_at": u.created_at,
    }


@router.get("/workspaces/{slug}/issues/{identifier}", response_model=IssueDetailOut)
def get_issue(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .options(
            *_issue_query(db),
            selectinload(Issue.comments).selectinload(Comment.author),
            selectinload(Issue.comments).selectinload(Comment.reactions).selectinload(CommentReaction.member),
            selectinload(Issue.links),
        )
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")

    subs = (
        db.query(Issue)
        .filter(Issue.parent_id == issue.id)
        .options(*_issue_query(db))
        .order_by(Issue.created_at)
        .all()
    )
    sub_counts = _child_counts(db, [s.id for s in subs])

    relations = (
        db.query(IssueRelation)
        .filter(IssueRelation.source_id == issue.id)
        .all()
    )
    targets = {t.id: t for t in db.query(Issue).filter(Issue.id.in_([r.target_id for r in relations])).options(selectinload(Issue.state)).all()} if relations else {}

    body = _issue_dict(issue, _child_counts(db, [issue.id]))
    body["sub_issues"] = [_issue_dict(s, sub_counts) for s in subs]
    body["relations"] = [
        IssueRelationOut(
            type=r.type.value,
            target_identifier=targets[r.target_id].identifier if r.target_id in targets else "",
            target_title=targets[r.target_id].title if r.target_id in targets else "",
            target_state_group=(targets[r.target_id].state.group.value if r.target_id in targets else "started"),
            target_priority=targets[r.target_id].priority if r.target_id in targets else 0,
        ).model_dump()
        for r in relations
        if r.target_id in targets
    ]

    # Default current-user = first member in workspace (used for `reacted` flag).
    current = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
    current_id = current.id if current else None

    # Group comments by thread: top-level comments hold their replies.
    by_id: dict[str, dict] = {}
    roots: list[dict] = []
    for c in issue.comments:
        d = _comment_dict(db, c, ws.id, current_id)
        by_id[c.id] = d
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id]["replies"].append(d)
        else:
            roots.append(d)
    body["comments"] = roots

    body["links"] = [
        {
            "id": ln.id,
            "url": ln.url,
            "title": ln.title or ln.url,
            "type": ln.type.value if hasattr(ln.type, "value") else ln.type,
            "status": ln.status.value if (ln.status and hasattr(ln.status, "value")) else (ln.status or None),
            "created_at": ln.created_at,
        }
        for ln in issue.links
    ]
    return body


@router.get("/workspaces/{slug}/my/counts")
def my_issue_counts(
    member_id: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    if not member_id:
        first_member = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
        if not first_member:
            return {"assigned": 0, "created": 0, "subscribed": 0, "activity": 0}
        member_id = first_member.id
    base = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.assignee_id == member_id)
    )
    n = base.count()
    return {"assigned": n, "created": n, "subscribed": n, "activity": n}


@router.get("/workspaces/{slug}/my/{scope}", response_model=list[IssueOut])
def my_issues(
    scope: str,
    member_id: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    if scope not in {"assigned", "created", "subscribed", "activity"}:
        raise HTTPException(400, f"unknown scope: {scope}")
    if not member_id:
        member = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
        if not member:
            return []
        member_id = member.id

    q = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.is_triage.is_(False))
        .options(*_issue_query(db))
    )
    if scope == "assigned":
        q = q.filter(Issue.assignee_id == member_id)
    elif scope == "created":
        q = q.filter(Issue.assignee_id == member_id)  # TODO: track creator separately
    elif scope == "subscribed":
        q = q.filter(Issue.assignee_id == member_id)
    else:
        q = q.filter(Issue.assignee_id == member_id).order_by(Issue.updated_at.desc())

    issues = q.all()
    counts = _child_counts(db, [i.id for i in issues])
    return [_issue_dict(i, counts) for i in issues]


@router.get("/workspaces/{slug}/members", response_model=list[MemberOut])
def list_members(ws: Workspace = Depends(get_workspace), db: Session = Depends(get_db)) -> list[Member]:
    return db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).all()


@router.get("/workspaces/{slug}/teams/{team_key}/labels", response_model=list[LabelOut])
def list_team_labels(team_key: str, ws: Workspace = Depends(get_workspace), db: Session = Depends(get_db)) -> list[Label]:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    workspace_labels = db.query(Label).filter_by(workspace_id=ws.id, team_id=None).all()
    return list(team.labels) + workspace_labels


@router.get("/workspaces/{slug}/teams/{team_key}/states", response_model=list[WorkflowStateOut])
def list_team_states(team_key: str, ws: Workspace = Depends(get_workspace), db: Session = Depends(get_db)) -> list[WorkflowState]:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    return sorted(team.states, key=lambda s: s.position)


@router.post("/workspaces/{slug}/teams/{team_key}/issues", response_model=IssueOut)
def create_issue(
    team_key: str,
    body: IssueCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")

    # Resolve state: explicit state_id wins, else state_name lookup, else first by position
    state = None
    if body.state_id:
        state = db.query(WorkflowState).filter_by(id=body.state_id, team_id=team.id).first()
    elif body.state_name:
        state = (
            db.query(WorkflowState)
            .filter_by(team_id=team.id)
            .filter(WorkflowState.name.ilike(body.state_name))
            .first()
        )
    if not state:
        state = (
            db.query(WorkflowState)
            .filter_by(team_id=team.id)
            .order_by(WorkflowState.position)
            .first()
        )
    if not state:
        raise HTTPException(400, "team has no workflow states; seed defaults first")

    # Next issue number for the team identifier
    last_num = (
        db.query(Issue)
        .filter(Issue.team_id == team.id, Issue.identifier.startswith(f"{team.key}-"))
        .count()
    )
    identifier = f"{team.key}-{last_num + 1}"

    parent_id = None
    if body.parent_identifier:
        parent = db.query(Issue).filter_by(identifier=body.parent_identifier).first()
        parent_id = parent.id if parent else None

    issue = Issue(
        identifier=identifier,
        team_id=team.id,
        state_id=state.id,
        parent_id=parent_id,
        assignee_id=body.assignee_id,
        project_id=body.project_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        estimate=body.estimate,
        is_triage=body.is_triage,
        triage_source=body.triage_source,
    )
    db.add(issue)
    db.flush()
    if body.label_ids:
        labels = db.query(Label).filter(Label.id.in_(body.label_ids)).all()
        issue.labels = labels
    notif.issue_assigned(db, issue=issue, previous_assignee_id=None, actor_id=None)
    db.commit()
    db.refresh(issue)
    return _issue_dict(issue)


@router.patch("/workspaces/{slug}/issues/{identifier}", response_model=IssueOut)
def patch_issue(
    identifier: str,
    body: IssuePatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")

    # Capture pre-mutation state so we can emit notifications after the commit
    prev_assignee_id = issue.assignee_id
    prev_state_name = issue.state.name if issue.state else None
    new_state_name = prev_state_name

    if body.title is not None:
        issue.title = body.title
    if body.description is not None:
        issue.description = body.description
    if body.priority is not None:
        issue.priority = body.priority
    if body.clear_estimate:
        issue.estimate = None
    elif body.estimate is not None:
        issue.estimate = body.estimate
    if body.clear_due_date:
        issue.due_date = None
    elif body.due_date is not None:
        issue.due_date = body.due_date
    if body.state_id is not None:
        # Validate state belongs to issue's team
        state = db.query(WorkflowState).filter_by(id=body.state_id, team_id=issue.team_id).first()
        if not state:
            raise HTTPException(400, "state_id does not belong to issue's team")
        issue.state_id = state.id
        new_state_name = state.name
    if body.assignee_id is not None:
        # Empty string means unassign
        issue.assignee_id = body.assignee_id or None
    if body.clear_project:
        issue.project_id = None
    elif body.project_id is not None:
        issue.project_id = body.project_id or None
    if body.clear_milestone:
        issue.milestone_id = None
    elif body.milestone_id is not None:
        issue.milestone_id = body.milestone_id or None
    if body.clear_cycle:
        issue.cycle_id = None
    elif body.cycle_id is not None:
        # Cycle must belong to issue's team
        cyc = db.query(Cycle).filter_by(id=body.cycle_id, team_id=issue.team_id).first()
        if not cyc:
            raise HTTPException(400, "cycle does not belong to issue's team")
        issue.cycle_id = cyc.id
    if body.label_ids is not None:
        labels = db.query(Label).filter(Label.id.in_(body.label_ids)).all() if body.label_ids else []
        issue.labels = labels
    if body.clear_parent:
        issue.parent_id = None
    elif body.parent_identifier is not None:
        if not body.parent_identifier:
            issue.parent_id = None
        else:
            parent = (
                db.query(Issue)
                .join(Team, Issue.team_id == Team.id)
                .filter(Team.workspace_id == ws.id, Issue.identifier == body.parent_identifier)
                .first()
            )
            if not parent or parent.id == issue.id:
                raise HTTPException(400, "invalid parent_identifier")
            issue.parent_id = parent.id

    db.flush()
    # Emit notifications (actor unresolved for now — uses None; future: pull from auth)
    notif.issue_assigned(db, issue=issue, previous_assignee_id=prev_assignee_id, actor_id=None)
    notif.issue_status_changed(db, issue=issue, previous_state_name=prev_state_name, new_state_name=new_state_name, actor_id=None)
    db.commit()
    db.refresh(issue)
    return _issue_dict(issue, _child_counts(db, [issue.id]))


@router.delete("/workspaces/{slug}/issues/{identifier}", status_code=204)
def delete_issue(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    db.delete(issue)
    db.commit()


# --- Triage -------------------------------------------------------------

@router.get("/workspaces/{slug}/teams/{team_key}/triage", response_model=list[IssueOut])
def list_triage(
    team_key: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    issues = (
        db.query(Issue)
        .filter(Issue.team_id == team.id, Issue.is_triage.is_(True), Issue.parent_id.is_(None))
        .options(*_issue_query(db))
        .order_by(Issue.created_at.desc())
        .all()
    )
    return [_issue_dict(i) for i in issues]


@router.get("/workspaces/{slug}/teams/{team_key}/triage/count")
def triage_count(
    team_key: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    n = db.query(Issue).filter(Issue.team_id == team.id, Issue.is_triage.is_(True)).count()
    return {"count": n}


@router.post("/workspaces/{slug}/teams/{team_key}/triage", response_model=IssueOut)
def create_triage_issue(
    team_key: str,
    body: TriageCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    """Simulates an incoming issue from an external source (Slack, email, etc.)."""
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
        raise HTTPException(400, "team has no workflow states; seed defaults first")

    last_num = db.query(Issue).filter(Issue.team_id == team.id, Issue.identifier.startswith(f"{team.key}-")).count()
    identifier = f"{team.key}-{last_num + 1}"
    issue = Issue(
        identifier=identifier,
        team_id=team.id,
        state_id=state.id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        is_triage=True,
        triage_source=body.source,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return _issue_dict(issue)


@router.post("/workspaces/{slug}/issues/{identifier}/triage/accept", response_model=IssueOut)
def accept_triage(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .options(*_issue_query(db))
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    issue.is_triage = False
    db.commit()
    db.refresh(issue)
    return _issue_dict(issue)


@router.post("/workspaces/{slug}/issues/{identifier}/triage/decline", status_code=204)
def decline_triage(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    """Decline a triage issue — removes it from the queue (delete)."""
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    db.delete(issue)
    db.commit()


@router.post("/workspaces/{slug}/issues/bulk", response_model=IssueBulkOut)
def bulk_issues(
    body: IssueBulkIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    if not body.identifiers:
        return {"updated": 0, "deleted": 0, "not_found": []}
    issues = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier.in_(body.identifiers))
        .options(selectinload(Issue.labels))
        .all()
    )
    found = {i.identifier for i in issues}
    not_found = [x for x in body.identifiers if x not in found]

    if body.op == "delete":
        for i in issues:
            db.delete(i)
        db.commit()
        return {"updated": 0, "deleted": len(issues), "not_found": not_found}

    if body.op != "patch":
        raise HTTPException(400, f"unknown op: {body.op}")
    p = body.patch
    if not p:
        return {"updated": 0, "deleted": 0, "not_found": not_found}

    add_labels: list[Label] = []
    remove_label_ids: set[str] = set()
    if p.add_label_ids:
        add_labels = db.query(Label).filter(Label.id.in_(p.add_label_ids)).all()
    if p.remove_label_ids:
        remove_label_ids = set(p.remove_label_ids)

    updated = 0
    for i in issues:
        prev_assignee_id = i.assignee_id
        prev_state_name = i.state.name if i.state else None
        new_state_name = prev_state_name
        if p.priority is not None:
            i.priority = p.priority
        if p.state_id is not None:
            st = db.query(WorkflowState).filter_by(id=p.state_id, team_id=i.team_id).first()
            if st:
                i.state_id = st.id
                new_state_name = st.name
        if p.clear_assignee:
            i.assignee_id = None
        elif p.assignee_id is not None:
            i.assignee_id = p.assignee_id or None
        notif.issue_assigned(db, issue=i, previous_assignee_id=prev_assignee_id, actor_id=None)
        notif.issue_status_changed(db, issue=i, previous_state_name=prev_state_name, new_state_name=new_state_name, actor_id=None)
        if p.clear_project:
            i.project_id = None
        elif p.project_id is not None:
            i.project_id = p.project_id or None
        if add_labels or remove_label_ids:
            current = {l.id: l for l in i.labels}
            for l in add_labels:
                current[l.id] = l
            for rid in remove_label_ids:
                current.pop(rid, None)
            i.labels = list(current.values())
        updated += 1
    db.commit()
    return {"updated": updated, "deleted": 0, "not_found": not_found}


@router.post("/workspaces/{slug}/issues/{identifier}/duplicate", response_model=IssueOut)
def duplicate_issue(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    src = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .options(selectinload(Issue.labels))
        .first()
    )
    if not src:
        raise HTTPException(404, f"issue not found: {identifier}")

    team = db.query(Team).filter_by(id=src.team_id).first()
    last_num = db.query(Issue).filter(Issue.team_id == team.id, Issue.identifier.startswith(f"{team.key}-")).count()
    new_identifier = f"{team.key}-{last_num + 1}"

    dup = Issue(
        identifier=new_identifier,
        team_id=src.team_id,
        state_id=src.state_id,
        assignee_id=src.assignee_id,
        title=src.title + " (copy)",
        description=src.description,
        priority=src.priority,
        estimate=src.estimate,
    )
    db.add(dup)
    db.flush()
    dup.labels = list(src.labels)
    db.commit()
    db.refresh(dup)
    return _issue_dict(dup)


@router.post("/workspaces/{slug}/issues/{identifier}/comments", response_model=CommentOut)
def create_comment(
    identifier: str,
    body: CommentCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")

    author_id = body.author_id
    if not author_id:
        first_member = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
        author_id = first_member.id if first_member else None

    parent_id = body.parent_id or None
    if parent_id:
        parent = db.query(Comment).filter_by(id=parent_id, issue_id=issue.id).first()
        if not parent:
            raise HTTPException(400, "parent comment not found on this issue")
        # Flatten threading: only allow replies one level deep.
        if parent.parent_id:
            parent_id = parent.parent_id

    comment = Comment(issue_id=issue.id, author_id=author_id, body=body.body, parent_id=parent_id)
    db.add(comment)
    db.flush()

    issue_full = (
        db.query(Issue)
        .options(selectinload(Issue.comments), selectinload(Issue.team))
        .filter(Issue.id == issue.id)
        .first()
    )
    if issue_full:
        notif.issue_commented(db, issue=issue_full, comment=comment, actor_id=author_id)
        # @mention notifications
        for mention in _resolve_mentions(db, ws.id, body.body):
            if mention.id != author_id:
                notif.comment_mentioned(
                    db, issue=issue_full, comment=comment, mentioned_id=mention.id, actor_id=author_id
                )

    db.commit()
    db.refresh(comment)

    return _comment_dict(db, comment, ws.id, author_id)


# --- Comment reactions --------------------------------------------------

@router.post("/workspaces/{slug}/comments/{comment_id}/reactions", response_model=list[ReactionGroupOut])
def toggle_reaction(
    comment_id: str,
    body: ReactionToggleIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    comment = (
        db.query(Comment)
        .join(Issue, Comment.issue_id == Issue.id)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Comment.id == comment_id)
        .options(selectinload(Comment.reactions).selectinload(CommentReaction.member))
        .first()
    )
    if not comment:
        raise HTTPException(404, "comment not found")

    member_id = body.member_id
    if not member_id:
        first = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
        member_id = first.id if first else None
    if not member_id:
        raise HTTPException(400, "no workspace members to attribute reaction")

    emoji = body.emoji.strip()
    if not emoji:
        raise HTTPException(400, "emoji is required")

    existing = (
        db.query(CommentReaction)
        .filter_by(comment_id=comment.id, member_id=member_id, emoji=emoji)
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(CommentReaction(comment_id=comment.id, member_id=member_id, emoji=emoji))
        issue = db.query(Issue).filter_by(id=comment.issue_id).first()
        if issue and comment.author_id and comment.author_id != member_id:
            notif.comment_reacted(db, issue=issue, comment=comment, emoji=emoji, actor_id=member_id)

    db.commit()
    db.refresh(comment)
    return _reactions_for(comment, member_id)


# --- Issue links --------------------------------------------------------

def _infer_link_type_and_status(url: str) -> tuple[IssueLinkType, IssueLinkStatus | None]:
    u = (url or "").lower()
    if "github.com" in u and "/pull/" in u:
        return IssueLinkType.github_pr, IssueLinkStatus.open
    if "github.com" in u and ("/tree/" in u or "/compare/" in u):
        return IssueLinkType.github_branch, None
    if "figma.com" in u:
        return IssueLinkType.figma, None
    return IssueLinkType.url, None


@router.post("/workspaces/{slug}/issues/{identifier}/links", response_model=IssueLinkOut)
def create_issue_link(
    identifier: str,
    body: IssueLinkCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")

    inferred_type, inferred_status = _infer_link_type_and_status(body.url)
    type_ = IssueLinkType(body.type) if body.type else inferred_type
    status_: IssueLinkStatus | None
    if body.status:
        status_ = IssueLinkStatus(body.status)
    else:
        status_ = inferred_status

    title = (body.title or "").strip() or _derive_link_title(body.url, type_)
    link = IssueLink(
        issue_id=issue.id,
        url=body.url,
        title=title,
        type=type_,
        status=status_,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {
        "id": link.id,
        "url": link.url,
        "title": link.title or link.url,
        "type": link.type.value,
        "status": link.status.value if link.status else None,
        "created_at": link.created_at,
    }


def _derive_link_title(url: str, type_: IssueLinkType) -> str:
    if type_ == IssueLinkType.github_pr:
        m = re.search(r"/([^/]+)/([^/]+)/pull/(\d+)", url)
        if m:
            return f"{m.group(1)}/{m.group(2)}#{m.group(3)}"
    if type_ == IssueLinkType.github_branch:
        m = re.search(r"/([^/]+)/([^/]+)/(?:tree|compare)/([^/?]+)", url)
        if m:
            return f"{m.group(1)}/{m.group(2)} · {m.group(3)}"
    return url


@router.delete("/workspaces/{slug}/issues/{identifier}/links/{link_id}", status_code=204)
def delete_issue_link(
    identifier: str,
    link_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    link = db.query(IssueLink).filter_by(id=link_id, issue_id=issue.id).first()
    if not link:
        raise HTTPException(404, "link not found")
    db.delete(link)
    db.commit()


# --- Archive / unarchive ------------------------------------------------

@router.post("/workspaces/{slug}/issues/{identifier}/archive", response_model=IssueOut)
def archive_issue(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .options(*_issue_query(db))
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    issue.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(issue)
    return _issue_dict(issue, _child_counts(db, [issue.id]))


@router.post("/workspaces/{slug}/issues/{identifier}/unarchive", response_model=IssueOut)
def unarchive_issue(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .options(*_issue_query(db))
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    issue.archived_at = None
    db.commit()
    db.refresh(issue)
    return _issue_dict(issue, _child_counts(db, [issue.id]))


# --- Move between teams -------------------------------------------------

@router.post("/workspaces/{slug}/issues/{identifier}/move", response_model=IssueOut)
def move_issue(
    identifier: str,
    body: IssueMoveIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .options(*_issue_query(db))
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    new_team = db.query(Team).filter_by(workspace_id=ws.id, key=body.team_key).first()
    if not new_team:
        raise HTTPException(404, f"team not found: {body.team_key}")
    if new_team.id == issue.team_id:
        return _issue_dict(issue, _child_counts(db, [issue.id]))

    # Pick a workflow state on the target team matching the current group.
    src_group = issue.state.group
    target_state = (
        db.query(WorkflowState)
        .filter(WorkflowState.team_id == new_team.id, WorkflowState.group == src_group)
        .order_by(WorkflowState.position)
        .first()
    )
    if target_state is None:
        target_state = (
            db.query(WorkflowState)
            .filter(WorkflowState.team_id == new_team.id)
            .order_by(WorkflowState.position)
            .first()
        )
    if target_state is None:
        raise HTTPException(400, f"target team {new_team.key} has no workflow states")

    issue.team_id = new_team.id
    issue.state_id = target_state.id
    issue.identifier = f"{new_team.key}-{new_team.next_issue_number}"
    new_team.next_issue_number += 1
    # Moving across teams drops team-scoped artifacts.
    issue.cycle_id = None
    # Labels stay attached, but team-scoped labels become foreign — drop them.
    issue.labels = [l for l in issue.labels if l.workspace_id is not None or l.team_id == new_team.id]

    db.commit()
    db.refresh(issue)
    return _issue_dict(issue, _child_counts(db, [issue.id]))


# --- Member role --------------------------------------------------------

@router.patch("/workspaces/{slug}/members/{member_id}", response_model=MemberOut)
def patch_member_role(
    member_id: str,
    body: MemberRolePatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    member = db.query(Member).filter_by(id=member_id, workspace_id=ws.id).first()
    if not member:
        raise HTTPException(404, "member not found")
    try:
        member.role = MemberRole(body.role)
    except ValueError:
        raise HTTPException(400, f"unknown role: {body.role}")
    db.commit()
    db.refresh(member)
    return MemberOut.model_validate(member).model_dump()


# --- Initiatives --------------------------------------------------------

def _initiative_dict(i: Initiative, *, db: Session | None = None, with_projects: bool = False) -> dict:
    project_count = completed = 0
    projects_out: list[dict] = []
    if db is not None:
        projects = (
            db.query(Project)
            .filter(Project.initiative_id == i.id)
            .options(selectinload(Project.lead), selectinload(Project.initiative))
            .order_by(Project.created_at)
            .all()
        )
        project_count = len(projects)
        completed = sum(1 for p in projects if p.state in (ProjectState.completed, ProjectState.canceled))
        if with_projects:
            projects_out = [_project_dict(p, db=db) for p in projects]
    out = {
        "id": i.id,
        "slug_id": i.slug_id,
        "name": i.name,
        "description": i.description,
        "icon_color": i.icon_color,
        "status": i.status.value if hasattr(i.status, "value") else i.status,
        "owner": MemberOut.model_validate(i.owner) if i.owner else None,
        "target_date": i.target_date,
        "project_count": project_count,
        "completed_project_count": completed,
    }
    if with_projects:
        out["projects"] = projects_out
    return out


@router.get("/workspaces/{slug}/initiatives", response_model=list[InitiativeOut])
def list_initiatives(
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    inis = (
        db.query(Initiative)
        .filter_by(workspace_id=ws.id)
        .options(selectinload(Initiative.owner))
        .order_by(Initiative.created_at)
        .all()
    )
    return [_initiative_dict(i, db=db) for i in inis]


def _find_initiative(db: Session, ws: Workspace, slug_id: str) -> Initiative | None:
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    return (
        db.query(Initiative)
        .filter(Initiative.workspace_id == ws.id)
        .filter((Initiative.slug_id == slug_id) | (Initiative.slug_id.like(f"%-{suffix}")))
        .options(selectinload(Initiative.owner))
        .first()
    )


@router.get("/workspaces/{slug}/initiatives/{slug_id}", response_model=InitiativeDetailOut)
def get_initiative(
    slug_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    ini = _find_initiative(db, ws, slug_id)
    if not ini:
        raise HTTPException(404, f"initiative not found: {slug_id}")
    return _initiative_dict(ini, db=db, with_projects=True)


@router.post("/workspaces/{slug}/initiatives", response_model=InitiativeOut)
def create_initiative(
    body: InitiativeCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    try:
        status = InitiativeStatus(body.status)
    except ValueError:
        raise HTTPException(400, f"unknown status: {body.status}")
    ini = Initiative(
        workspace_id=ws.id,
        slug_id=_make_slug(body.name),
        name=body.name,
        description=body.description,
        icon_color=body.icon_color,
        status=status,
        owner_id=body.owner_id,
        target_date=body.target_date,
    )
    db.add(ini)
    db.commit()
    db.refresh(ini)
    return _initiative_dict(ini, db=db)


@router.patch("/workspaces/{slug}/initiatives/{slug_id}", response_model=InitiativeOut)
def patch_initiative(
    slug_id: str,
    body: InitiativePatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    ini = _find_initiative(db, ws, slug_id)
    if not ini:
        raise HTTPException(404, f"initiative not found: {slug_id}")
    if body.name is not None:
        ini.name = body.name
    if body.description is not None:
        ini.description = body.description
    if body.icon_color is not None:
        ini.icon_color = body.icon_color
    if body.status is not None:
        try:
            ini.status = InitiativeStatus(body.status)
        except ValueError:
            raise HTTPException(400, f"unknown status: {body.status}")
    if body.clear_owner:
        ini.owner_id = None
    elif body.owner_id is not None:
        ini.owner_id = body.owner_id
    if body.clear_target_date:
        ini.target_date = None
    elif body.target_date is not None:
        ini.target_date = body.target_date
    db.commit()
    db.refresh(ini)
    return _initiative_dict(ini, db=db)


# --- Cycles -------------------------------------------------------------

def _cycle_status(c: Cycle) -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if c.completed_at:
        return "completed"
    starts = c.starts_at if c.starts_at.tzinfo else c.starts_at.replace(tzinfo=timezone.utc)
    ends = c.ends_at if c.ends_at.tzinfo else c.ends_at.replace(tzinfo=timezone.utc)
    if now < starts:
        return "upcoming"
    if now > ends:
        return "completed"
    return "active"


def _cycle_dict(c: Cycle, db: Session | None = None) -> dict:
    total = done = 0
    if db is not None:
        rows = (
            db.query(Issue.id, WorkflowState.group)
            .join(WorkflowState, Issue.state_id == WorkflowState.id)
            .filter(Issue.cycle_id == c.id)
            .all()
        )
        total = len(rows)
        done = sum(1 for _, g in rows if g in (StateGroup.completed, StateGroup.canceled))
    return {
        "id": c.id,
        "team_id": c.team_id,
        "team_key": c.team.key if c.team else "",
        "number": c.number,
        "name": c.name,
        "description": c.description,
        "starts_at": c.starts_at,
        "ends_at": c.ends_at,
        "completed_at": c.completed_at,
        "status": _cycle_status(c),
        "issue_count": total,
        "completed_issue_count": done,
    }


@router.get("/workspaces/{slug}/teams/{team_key}/cycles", response_model=list[CycleOut])
def list_cycles(
    team_key: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    cycles = db.query(Cycle).filter_by(team_id=team.id).options(selectinload(Cycle.team)).order_by(Cycle.starts_at.desc()).all()
    return [_cycle_dict(c, db) for c in cycles]


@router.get("/workspaces/{slug}/teams/{team_key}/cycles/active", response_model=CycleOut | None)
def active_cycle(
    team_key: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict | None:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    cycles = db.query(Cycle).filter_by(team_id=team.id).options(selectinload(Cycle.team)).all()
    for c in cycles:
        if _cycle_status(c) == "active":
            return _cycle_dict(c, db)
    return None


@router.post("/workspaces/{slug}/teams/{team_key}/cycles", response_model=CycleOut)
def create_cycle(
    team_key: str,
    body: CycleCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    number = db.query(Cycle).filter_by(team_id=team.id).count() + 1
    c = Cycle(
        team_id=team.id,
        number=number,
        name=body.name,
        description=body.description,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _cycle_dict(c, db)


@router.get("/workspaces/{slug}/cycles/{cycle_id}", response_model=CycleOut)
def get_cycle(
    cycle_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    c = (
        db.query(Cycle)
        .join(Team, Cycle.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Cycle.id == cycle_id)
        .options(selectinload(Cycle.team))
        .first()
    )
    if not c:
        raise HTTPException(404, f"cycle not found: {cycle_id}")
    return _cycle_dict(c, db)


@router.patch("/workspaces/{slug}/cycles/{cycle_id}", response_model=CycleOut)
def patch_cycle(
    cycle_id: str,
    body: CyclePatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    c = (
        db.query(Cycle)
        .join(Team, Cycle.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Cycle.id == cycle_id)
        .options(selectinload(Cycle.team))
        .first()
    )
    if not c:
        raise HTTPException(404, f"cycle not found: {cycle_id}")
    if body.name is not None:
        c.name = body.name
    if body.description is not None:
        c.description = body.description
    if body.starts_at is not None:
        c.starts_at = body.starts_at
    if body.ends_at is not None:
        c.ends_at = body.ends_at
    if body.clear_completed_at:
        c.completed_at = None
    elif body.completed_at is not None:
        c.completed_at = body.completed_at
    db.commit()
    db.refresh(c)
    return _cycle_dict(c, db)


@router.get("/workspaces/{slug}/cycles/{cycle_id}/issues", response_model=list[IssueOut])
def list_cycle_issues(
    cycle_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    c = (
        db.query(Cycle)
        .join(Team, Cycle.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Cycle.id == cycle_id)
        .first()
    )
    if not c:
        raise HTTPException(404, f"cycle not found: {cycle_id}")
    issues = (
        db.query(Issue)
        .filter(Issue.cycle_id == c.id, Issue.parent_id.is_(None), Issue.is_triage.is_(False))
        .options(*_issue_query(db))
        .join(WorkflowState, Issue.state_id == WorkflowState.id)
        .order_by(WorkflowState.position, Issue.priority, Issue.created_at)
        .all()
    )
    counts = _child_counts(db, [i.id for i in issues])
    return [_issue_dict(i, counts) for i in issues]


# --- Customer requests --------------------------------------------------

def _customer_request_dict(cr: CustomerRequest) -> dict:
    return {
        "id": cr.id,
        "customer_name": cr.customer_name,
        "customer_email": cr.customer_email,
        "source": cr.source,
        "title": cr.title,
        "body": cr.body,
        "status": cr.status.value if hasattr(cr.status, "value") else cr.status,
        "issue_identifier": cr.issue.identifier if cr.issue else None,
        "issue_title": cr.issue.title if cr.issue else None,
        "created_at": cr.created_at,
        "updated_at": cr.updated_at,
    }


@router.get("/workspaces/{slug}/customer-requests", response_model=list[CustomerRequestOut])
def list_customer_requests(
    status: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    q = (
        db.query(CustomerRequest)
        .filter_by(workspace_id=ws.id)
        .options(selectinload(CustomerRequest.issue))
    )
    if status:
        try:
            q = q.filter(CustomerRequest.status == CustomerRequestStatus(status))
        except ValueError:
            raise HTTPException(400, f"unknown status: {status}")
    items = q.order_by(CustomerRequest.created_at.desc()).all()
    return [_customer_request_dict(c) for c in items]


@router.get("/workspaces/{slug}/customer-requests/{request_id}", response_model=CustomerRequestOut)
def get_customer_request(
    request_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    cr = (
        db.query(CustomerRequest)
        .filter_by(id=request_id, workspace_id=ws.id)
        .options(selectinload(CustomerRequest.issue))
        .first()
    )
    if not cr:
        raise HTTPException(404, f"customer request not found: {request_id}")
    return _customer_request_dict(cr)


@router.post("/workspaces/{slug}/customer-requests", response_model=CustomerRequestOut)
def create_customer_request(
    body: CustomerRequestCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    cr = CustomerRequest(
        workspace_id=ws.id,
        customer_name=body.customer_name,
        customer_email=body.customer_email,
        source=body.source,
        title=body.title,
        body=body.body,
    )
    db.add(cr)
    db.commit()
    db.refresh(cr)
    return _customer_request_dict(cr)


@router.patch("/workspaces/{slug}/customer-requests/{request_id}", response_model=CustomerRequestOut)
def patch_customer_request(
    request_id: str,
    body: CustomerRequestPatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    cr = (
        db.query(CustomerRequest)
        .filter_by(id=request_id, workspace_id=ws.id)
        .options(selectinload(CustomerRequest.issue))
        .first()
    )
    if not cr:
        raise HTTPException(404, f"customer request not found: {request_id}")
    if body.status is not None:
        try:
            cr.status = CustomerRequestStatus(body.status)
        except ValueError:
            raise HTTPException(400, f"unknown status: {body.status}")
    if body.customer_name is not None:
        cr.customer_name = body.customer_name
    if body.customer_email is not None:
        cr.customer_email = body.customer_email
    if body.title is not None:
        cr.title = body.title
    if body.body is not None:
        cr.body = body.body
    db.commit()
    db.refresh(cr)
    return _customer_request_dict(cr)


@router.post("/workspaces/{slug}/customer-requests/{request_id}/link", response_model=CustomerRequestOut)
def link_customer_request(
    request_id: str,
    body: CustomerRequestLinkIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    cr = (
        db.query(CustomerRequest)
        .filter_by(id=request_id, workspace_id=ws.id)
        .options(selectinload(CustomerRequest.issue))
        .first()
    )
    if not cr:
        raise HTTPException(404, f"customer request not found: {request_id}")
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == body.issue_identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {body.issue_identifier}")
    cr.issue_id = issue.id
    cr.status = CustomerRequestStatus.linked
    db.commit()
    db.refresh(cr)
    return _customer_request_dict(cr)


@router.post("/workspaces/{slug}/customer-requests/{request_id}/unlink", response_model=CustomerRequestOut)
def unlink_customer_request(
    request_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    cr = (
        db.query(CustomerRequest)
        .filter_by(id=request_id, workspace_id=ws.id)
        .options(selectinload(CustomerRequest.issue))
        .first()
    )
    if not cr:
        raise HTTPException(404, f"customer request not found: {request_id}")
    cr.issue_id = None
    cr.status = CustomerRequestStatus.pending
    db.commit()
    db.refresh(cr)
    return _customer_request_dict(cr)


@router.get("/workspaces/{slug}/issues/{identifier}/customer-requests", response_model=list[CustomerRequestOut])
def list_issue_customer_requests(
    identifier: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    issue = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.identifier == identifier)
        .first()
    )
    if not issue:
        raise HTTPException(404, f"issue not found: {identifier}")
    items = (
        db.query(CustomerRequest)
        .filter_by(workspace_id=ws.id, issue_id=issue.id)
        .order_by(CustomerRequest.created_at.desc())
        .all()
    )
    return [_customer_request_dict(c) for c in items]


# --- Documents ----------------------------------------------------------

def _document_dict(d: Document) -> dict:
    return {
        "id": d.id,
        "slug_id": d.slug_id,
        "title": d.title,
        "icon": d.icon,
        "body": d.body,
        "creator": MemberOut.model_validate(d.creator).model_dump() if d.creator else None,
        "project_id": d.project.id if d.project else None,
        "project_name": d.project.name if d.project else None,
        "project_slug_id": d.project.slug_id if d.project else None,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


def _find_document(db: Session, ws: Workspace, slug_id: str) -> Document | None:
    suffix = slug_id.rsplit("-", 1)[-1] if "-" in slug_id else slug_id
    return (
        db.query(Document)
        .filter(Document.workspace_id == ws.id)
        .filter((Document.slug_id == slug_id) | (Document.slug_id.like(f"%-{suffix}")))
        .options(selectinload(Document.creator), selectinload(Document.project))
        .first()
    )


@router.get("/workspaces/{slug}/documents", response_model=list[DocumentOut])
def list_documents(
    project_id: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    q = (
        db.query(Document)
        .filter_by(workspace_id=ws.id)
        .options(selectinload(Document.creator), selectinload(Document.project))
    )
    if project_id:
        q = q.filter(Document.project_id == project_id)
    docs = q.order_by(Document.updated_at.desc()).all()
    return [_document_dict(d) for d in docs]


@router.get("/workspaces/{slug}/documents/{slug_id}", response_model=DocumentOut)
def get_document(
    slug_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    d = _find_document(db, ws, slug_id)
    if not d:
        raise HTTPException(404, f"document not found: {slug_id}")
    return _document_dict(d)


@router.post("/workspaces/{slug}/documents", response_model=DocumentOut)
def create_document(
    body: DocumentCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    if body.project_id:
        proj = db.query(Project).filter_by(id=body.project_id, workspace_id=ws.id).first()
        if not proj:
            raise HTTPException(400, "project does not belong to workspace")
    creator_id = body.creator_id
    if not creator_id:
        first = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
        creator_id = first.id if first else None
    d = Document(
        workspace_id=ws.id,
        project_id=body.project_id,
        slug_id=_make_slug(body.title or "Untitled"),
        title=body.title,
        icon=body.icon,
        body=body.body,
        creator_id=creator_id,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _document_dict(d)


@router.patch("/workspaces/{slug}/documents/{slug_id}", response_model=DocumentOut)
def patch_document(
    slug_id: str,
    body: DocumentPatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    d = _find_document(db, ws, slug_id)
    if not d:
        raise HTTPException(404, f"document not found: {slug_id}")
    if body.title is not None:
        d.title = body.title
    if body.icon is not None:
        d.icon = body.icon
    if body.body is not None:
        d.body = body.body
    if body.clear_project:
        d.project_id = None
    elif body.project_id is not None:
        proj = db.query(Project).filter_by(id=body.project_id, workspace_id=ws.id).first()
        if not proj:
            raise HTTPException(400, "project does not belong to workspace")
        d.project_id = proj.id
    db.commit()
    db.refresh(d)
    return _document_dict(d)


@router.delete("/workspaces/{slug}/documents/{slug_id}", status_code=204)
def delete_document(
    slug_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    d = _find_document(db, ws, slug_id)
    if not d:
        raise HTTPException(404, f"document not found: {slug_id}")
    db.delete(d)
    db.commit()


# --- Saved views --------------------------------------------------------

def _view_dict(v: SavedView) -> dict:
    return {
        "id": v.id,
        "name": v.name,
        "icon_color": v.icon_color,
        "base": v.base,
        "query": v.query,
        "favorite": v.favorite,
        "position": v.position,
        "team_key": v.team.key if v.team else None,
    }


@router.get("/workspaces/{slug}/views", response_model=list[SavedViewOut])
def list_saved_views(
    team_key: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    q = db.query(SavedView).filter_by(workspace_id=ws.id).options(selectinload(SavedView.team))
    if team_key:
        team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
        if not team:
            raise HTTPException(404, f"team not found: {team_key}")
        q = q.filter(SavedView.team_id == team.id)
    views = q.order_by(SavedView.position, SavedView.created_at).all()
    return [_view_dict(v) for v in views]


@router.post("/workspaces/{slug}/views", response_model=SavedViewOut)
def create_saved_view(
    body: SavedViewCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    team_id: str | None = None
    if body.team_key:
        team = db.query(Team).filter_by(workspace_id=ws.id, key=body.team_key).first()
        if not team:
            raise HTTPException(404, f"team not found: {body.team_key}")
        team_id = team.id
    if body.base not in {"active", "backlog", "all"}:
        raise HTTPException(400, f"unknown base: {body.base}")
    position = db.query(SavedView).filter_by(workspace_id=ws.id, team_id=team_id).count()
    view = SavedView(
        workspace_id=ws.id,
        team_id=team_id,
        name=body.name.strip()[:120] or "Untitled view",
        icon_color=body.icon_color,
        base=body.base,
        query=body.query.lstrip("?"),
        favorite=body.favorite,
        position=position,
    )
    db.add(view)
    db.commit()
    db.refresh(view)
    return _view_dict(view)


@router.patch("/workspaces/{slug}/views/{view_id}", response_model=SavedViewOut)
def patch_saved_view(
    view_id: str,
    body: SavedViewPatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    v = db.query(SavedView).filter_by(workspace_id=ws.id, id=view_id).first()
    if not v:
        raise HTTPException(404, f"view not found: {view_id}")
    if body.name is not None:
        v.name = body.name.strip()[:120] or v.name
    if body.icon_color is not None:
        v.icon_color = body.icon_color
    if body.favorite is not None:
        v.favorite = body.favorite
    if body.query is not None:
        v.query = body.query.lstrip("?")
    if body.base is not None:
        if body.base not in {"active", "backlog", "all"}:
            raise HTTPException(400, f"unknown base: {body.base}")
        v.base = body.base
    db.commit()
    db.refresh(v)
    return _view_dict(v)


@router.delete("/workspaces/{slug}/views/{view_id}", status_code=204)
def delete_saved_view(
    view_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    v = db.query(SavedView).filter_by(workspace_id=ws.id, id=view_id).first()
    if not v:
        raise HTTPException(404, f"view not found: {view_id}")
    db.delete(v)
    db.commit()


@router.get("/workspaces/{slug}/views/{view_id}", response_model=SavedViewOut)
def get_saved_view(
    view_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    v = (
        db.query(SavedView)
        .filter_by(workspace_id=ws.id, id=view_id)
        .options(selectinload(SavedView.team))
        .first()
    )
    if not v:
        raise HTTPException(404, f"view not found: {view_id}")
    return _view_dict(v)


# --- Notifications ------------------------------------------------------

def _default_member_id(db: Session, ws: Workspace) -> str | None:
    m = db.query(Member).filter_by(workspace_id=ws.id).order_by(Member.name).first()
    return m.id if m else None


def _notification_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "kind": n.kind.value if hasattr(n.kind, "value") else n.kind,
        "body": n.body,
        "read_at": n.read_at,
        "created_at": n.created_at,
        "actor": MemberOut.model_validate(n.actor).model_dump() if n.actor else None,
        "issue_identifier": n.issue.identifier if n.issue else None,
        "issue_title": n.issue.title if n.issue else None,
    }


@router.get("/workspaces/{slug}/notifications", response_model=list[NotificationOut])
def list_notifications(
    member_id: str | None = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(100, ge=1, le=500),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[dict]:
    rid = member_id or _default_member_id(db, ws)
    if not rid:
        return []
    q = (
        db.query(Notification)
        .filter(Notification.workspace_id == ws.id, Notification.recipient_id == rid)
        .options(selectinload(Notification.actor), selectinload(Notification.issue))
    )
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    notes = q.order_by(Notification.created_at.desc()).limit(limit).all()
    return [_notification_dict(n) for n in notes]


@router.get("/workspaces/{slug}/notifications/unread-count", response_model=NotificationCountOut)
def unread_count(
    member_id: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    rid = member_id or _default_member_id(db, ws)
    if not rid:
        return {"unread": 0}
    n = (
        db.query(Notification)
        .filter(Notification.workspace_id == ws.id, Notification.recipient_id == rid, Notification.read_at.is_(None))
        .count()
    )
    return {"unread": n}


@router.post("/workspaces/{slug}/notifications/{notification_id}/read", status_code=204)
def mark_read(
    notification_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    from datetime import datetime, timezone
    n = db.query(Notification).filter_by(id=notification_id, workspace_id=ws.id).first()
    if not n:
        raise HTTPException(404, f"notification not found: {notification_id}")
    if not n.read_at:
        n.read_at = datetime.now(timezone.utc)
        db.commit()


@router.post("/workspaces/{slug}/notifications/read-all", status_code=204)
def mark_all_read(
    member_id: str | None = Query(None),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    from datetime import datetime, timezone
    rid = member_id or _default_member_id(db, ws)
    if not rid:
        return
    now = datetime.now(timezone.utc)
    db.query(Notification).filter(
        Notification.workspace_id == ws.id,
        Notification.recipient_id == rid,
        Notification.read_at.is_(None),
    ).update({Notification.read_at: now})
    db.commit()


# --- Global search ------------------------------------------------------

@router.get("/workspaces/{slug}/search")
def workspace_search(
    q: str = Query("", min_length=0),
    limit: int = Query(8, ge=1, le=50),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> dict:
    """Lightweight cross-entity search. Returns grouped results so the
    command palette can render one section per kind."""
    needle = q.strip()
    if not needle:
        # Empty query → recent issues + all teams + all projects + initiatives (top N each)
        recent_issues = (
            db.query(Issue)
            .join(Team, Issue.team_id == Team.id)
            .filter(Team.workspace_id == ws.id, Issue.is_triage.is_(False))
            .options(selectinload(Issue.state), selectinload(Issue.team))
            .order_by(Issue.updated_at.desc())
            .limit(limit)
            .all()
        )
        projects = db.query(Project).filter_by(workspace_id=ws.id).order_by(Project.created_at.desc()).limit(limit).all()
        teams = db.query(Team).filter_by(workspace_id=ws.id).order_by(Team.name).limit(limit).all()
        initiatives = db.query(Initiative).filter_by(workspace_id=ws.id).order_by(Initiative.created_at.desc()).limit(limit).all()
        documents = db.query(Document).filter_by(workspace_id=ws.id).options(selectinload(Document.project)).order_by(Document.updated_at.desc()).limit(limit).all()
        return {
            "issues": [_search_issue(i) for i in recent_issues],
            "projects": [_search_project(p) for p in projects],
            "teams": [_search_team(t) for t in teams],
            "members": [],
            "views": [],
            "initiatives": [_search_initiative(x) for x in initiatives],
            "documents": [_search_document(d) for d in documents],
        }

    like = f"%{needle}%"
    # Issues: identifier exact-ish match or title substring
    issue_q = (
        db.query(Issue)
        .join(Team, Issue.team_id == Team.id)
        .filter(Team.workspace_id == ws.id, Issue.is_triage.is_(False))
        .filter((Issue.identifier.ilike(like)) | (Issue.title.ilike(like)))
        .options(selectinload(Issue.state), selectinload(Issue.team))
        .order_by(Issue.updated_at.desc())
        .limit(limit)
    )
    projects = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id, Project.name.ilike(like))
        .order_by(Project.created_at.desc())
        .limit(limit)
        .all()
    )
    teams = (
        db.query(Team)
        .filter(Team.workspace_id == ws.id)
        .filter((Team.name.ilike(like)) | (Team.key.ilike(like)))
        .order_by(Team.name)
        .limit(limit)
        .all()
    )
    members = (
        db.query(Member)
        .filter(Member.workspace_id == ws.id, Member.name.ilike(like))
        .order_by(Member.name)
        .limit(limit)
        .all()
    )
    views = (
        db.query(SavedView)
        .filter(SavedView.workspace_id == ws.id, SavedView.name.ilike(like))
        .options(selectinload(SavedView.team))
        .order_by(SavedView.created_at.desc())
        .limit(limit)
        .all()
    )
    initiatives = (
        db.query(Initiative)
        .filter(Initiative.workspace_id == ws.id, Initiative.name.ilike(like))
        .order_by(Initiative.created_at.desc())
        .limit(limit)
        .all()
    )
    documents = (
        db.query(Document)
        .filter(Document.workspace_id == ws.id)
        .filter((Document.title.ilike(like)) | (Document.body.ilike(like)))
        .options(selectinload(Document.project))
        .order_by(Document.updated_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "issues": [_search_issue(i) for i in issue_q.all()],
        "projects": [_search_project(p) for p in projects],
        "teams": [_search_team(t) for t in teams],
        "members": [MemberOut.model_validate(m).model_dump() for m in members],
        "views": [_view_dict(v) for v in views],
        "initiatives": [_search_initiative(x) for x in initiatives],
        "documents": [_search_document(d) for d in documents],
    }


def _search_issue(i: Issue) -> dict:
    return {
        "id": i.id,
        "identifier": i.identifier,
        "title": i.title,
        "priority": i.priority,
        "state_group": i.state.group.value if i.state else "started",
        "team_key": i.team.key if i.team else "",
    }


def _search_project(p: Project) -> dict:
    return {"id": p.id, "slug_id": p.slug_id, "name": p.name, "icon_color": p.icon_color, "state": p.state.value if hasattr(p.state, "value") else p.state}


def _search_team(t: Team) -> dict:
    return {"id": t.id, "key": t.key, "name": t.name, "icon_color": t.icon_color}


def _search_initiative(i: Initiative) -> dict:
    return {"id": i.id, "slug_id": i.slug_id, "name": i.name, "icon_color": i.icon_color, "status": i.status.value if hasattr(i.status, "value") else i.status}


def _search_document(d: Document) -> dict:
    return {"id": d.id, "slug_id": d.slug_id, "title": d.title, "icon": d.icon, "project_name": d.project.name if d.project else None}


# --- Settings: workspace labels ----------------------------------------

@router.get("/workspaces/{slug}/labels", response_model=list[LabelOut])
def list_workspace_labels(
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> list[Label]:
    return db.query(Label).filter_by(workspace_id=ws.id, team_id=None).order_by(Label.name).all()


@router.post("/workspaces/{slug}/labels", response_model=LabelOut)
def create_workspace_label(
    body: LabelCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> Label:
    lbl = Label(workspace_id=ws.id, team_id=None, name=body.name, color=body.color)
    db.add(lbl)
    db.commit()
    db.refresh(lbl)
    return lbl


@router.patch("/workspaces/{slug}/labels/{label_id}", response_model=LabelOut)
def patch_label(
    label_id: str,
    body: LabelPatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> Label:
    lbl = db.query(Label).filter_by(id=label_id).first()
    if not lbl:
        raise HTTPException(404, f"label not found: {label_id}")
    # Authorize: label must belong to the workspace (either directly or via a team).
    if lbl.workspace_id and lbl.workspace_id != ws.id:
        raise HTTPException(404, f"label not found: {label_id}")
    if lbl.team_id:
        team = db.query(Team).filter_by(id=lbl.team_id).first()
        if not team or team.workspace_id != ws.id:
            raise HTTPException(404, f"label not found: {label_id}")
    if body.name is not None:
        lbl.name = body.name
    if body.color is not None:
        lbl.color = body.color
    db.commit()
    db.refresh(lbl)
    return lbl


@router.delete("/workspaces/{slug}/labels/{label_id}", status_code=204)
def delete_label(
    label_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    lbl = db.query(Label).filter_by(id=label_id).first()
    if not lbl:
        raise HTTPException(404, f"label not found: {label_id}")
    if lbl.workspace_id and lbl.workspace_id != ws.id:
        raise HTTPException(404, f"label not found: {label_id}")
    if lbl.team_id:
        team = db.query(Team).filter_by(id=lbl.team_id).first()
        if not team or team.workspace_id != ws.id:
            raise HTTPException(404, f"label not found: {label_id}")
    db.delete(lbl)
    db.commit()


# --- Settings: team labels --------------------------------------------------

@router.post("/workspaces/{slug}/teams/{team_key}/labels", response_model=LabelOut)
def create_team_label(
    team_key: str,
    body: LabelCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> Label:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    lbl = Label(workspace_id=None, team_id=team.id, name=body.name, color=body.color)
    db.add(lbl)
    db.commit()
    db.refresh(lbl)
    return lbl


# --- Settings: workflow states ----------------------------------------------

@router.post("/workspaces/{slug}/teams/{team_key}/states", response_model=WorkflowStateOut)
def create_workflow_state(
    team_key: str,
    body: WorkflowStateCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> WorkflowState:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    try:
        group = StateGroup(body.group)
    except ValueError:
        raise HTTPException(400, f"unknown state group: {body.group}")
    state = WorkflowState(
        team_id=team.id,
        name=body.name,
        group=group,
        position=body.position,
        color=body.color,
    )
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


@router.patch("/workspaces/{slug}/teams/{team_key}/states/{state_id}", response_model=WorkflowStateOut)
def patch_workflow_state(
    team_key: str,
    state_id: str,
    body: WorkflowStatePatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> WorkflowState:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    state = db.query(WorkflowState).filter_by(id=state_id, team_id=team.id).first()
    if not state:
        raise HTTPException(404, f"state not found: {state_id}")
    if body.name is not None:
        state.name = body.name
    if body.group is not None:
        try:
            state.group = StateGroup(body.group)
        except ValueError:
            raise HTTPException(400, f"unknown state group: {body.group}")
    if body.position is not None:
        state.position = body.position
    if body.color is not None:
        state.color = body.color
    db.commit()
    db.refresh(state)
    return state


@router.delete("/workspaces/{slug}/teams/{team_key}/states/{state_id}", status_code=204)
def delete_workflow_state(
    team_key: str,
    state_id: str,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> None:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    state = db.query(WorkflowState).filter_by(id=state_id, team_id=team.id).first()
    if not state:
        raise HTTPException(404, f"state not found: {state_id}")
    in_use = db.query(Issue).filter_by(state_id=state.id).count()
    if in_use > 0:
        raise HTTPException(409, f"state in use by {in_use} issue(s); reassign before deleting")
    db.delete(state)
    db.commit()


# --- Settings: team patch + create -----------------------------------------

@router.patch("/workspaces/{slug}/teams/{team_key}", response_model=TeamOut)
def patch_team(
    team_key: str,
    body: TeamPatchIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> Team:
    team = db.query(Team).filter_by(workspace_id=ws.id, key=team_key).first()
    if not team:
        raise HTTPException(404, f"team not found: {team_key}")
    if body.name is not None:
        team.name = body.name
    if body.icon_color is not None:
        team.icon_color = body.icon_color
    if body.cycles_enabled is not None:
        team.cycles_enabled = body.cycles_enabled
    if body.estimate_scale is not None:
        try:
            team.estimate_scale = EstimateScale(body.estimate_scale)
        except ValueError:
            raise HTTPException(400, f"unknown estimate scale: {body.estimate_scale}")
    db.commit()
    db.refresh(team)
    return team


@router.post("/workspaces/{slug}/teams", response_model=TeamOut)
def create_team(
    body: TeamCreateIn,
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> Team:
    existing = db.query(Team).filter_by(workspace_id=ws.id, key=body.key).first()
    if existing:
        raise HTTPException(409, f"team key already in use: {body.key}")
    try:
        scale = EstimateScale(body.estimate_scale)
    except ValueError:
        raise HTTPException(400, f"unknown estimate scale: {body.estimate_scale}")
    team = Team(
        workspace_id=ws.id,
        key=body.key,
        name=body.name,
        icon_color=body.icon_color,
        cycles_enabled=body.cycles_enabled,
        estimate_scale=scale,
    )
    db.add(team)
    db.flush()
    # Seed default workflow states so the new team is immediately usable
    defaults = [
        ("Backlog", StateGroup.backlog, 0, "#95a2b3"),
        ("Todo", StateGroup.unstarted, 1, "#e2e2e2"),
        ("In Progress", StateGroup.started, 2, "#f2c94c"),
        ("In Review", StateGroup.started, 3, "#5e6ad2"),
        ("Done", StateGroup.completed, 4, "#5e6ad2"),
        ("Canceled", StateGroup.canceled, 5, "#95a2b3"),
    ]
    for name, group, position, color in defaults:
        db.add(WorkflowState(team_id=team.id, name=name, group=group, position=position, color=color))
    db.commit()
    db.refresh(team)
    return team


@router.post("/seed", status_code=200)
def seed_route(body: SeedRequest, db: Session = Depends(get_db)) -> dict:
    return apply_seed(db, body.model_dump(by_alias=False))
