"""SQLAlchemy models. Shape mirrors Linear's data model at the level our
captured surfaces need: workspaces, teams, members, workflow states, labels,
issues (with sub-issues, relations, labels, comments).

Projects/initiatives/cycles/documents are intentionally deferred to the next
slice — add when their UI surfaces ship.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# Portable UUID column — stores as 36-char string so dev SQLite works
# alongside prod Postgres.
def UUID() -> "String":  # type: ignore[valid-type]
    return String(36)


class StateGroup(str, enum.Enum):
    backlog = "backlog"
    unstarted = "unstarted"
    started = "started"
    completed = "completed"
    canceled = "canceled"


class RelationType(str, enum.Enum):
    blocks = "blocks"
    blocked_by = "blocked_by"
    related = "related"
    duplicate = "duplicate"


class ProjectState(str, enum.Enum):
    planned = "planned"
    started = "started"
    paused = "paused"
    completed = "completed"
    canceled = "canceled"


class UpdateHealth(str, enum.Enum):
    onTrack = "onTrack"
    atRisk = "atRisk"
    offTrack = "offTrack"


class CycleStatus(str, enum.Enum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"


class NotificationKind(str, enum.Enum):
    assigned = "assigned"
    status_changed = "status_changed"
    commented = "commented"
    mentioned = "mentioned"
    subscribed = "subscribed"


class InitiativeStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    completed = "completed"
    canceled = "canceled"


class CustomerRequestStatus(str, enum.Enum):
    pending = "pending"
    linked = "linked"
    resolved = "resolved"
    canceled = "canceled"


class MemberRole(str, enum.Enum):
    admin = "admin"
    member = "member"
    guest = "guest"


class EstimateScale(str, enum.Enum):
    none = "none"
    linear = "linear"        # 1..5
    fibonacci = "fibonacci"  # 1,2,3,5,8
    exponential = "exponential"  # 1,2,4,8,16
    tshirt = "tshirt"        # XS..XL → 1,2,3,5,8


class IssueLinkType(str, enum.Enum):
    github_pr = "github_pr"
    github_branch = "github_branch"
    figma = "figma"
    url = "url"


class IssueLinkStatus(str, enum.Enum):
    open = "open"
    merged = "merged"
    closed = "closed"
    draft = "draft"


class User(Base):
    """Authentication identity. One User can be a Member in many workspaces."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    initials: Mapped[str] = mapped_column(String(4), nullable=False)
    color: Mapped[str] = mapped_column(String(16), default="#5e6ad2")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["Member"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    icon_color: Mapped[str] = mapped_column(String(16), default="#f59e0b")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    teams: Mapped[list["Team"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    members: Mapped[list["Member"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    labels: Mapped[list["Label"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    invites: Mapped[list["WorkspaceInvite"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")


class Member(Base):
    __tablename__ = "members"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    initials: Mapped[str] = mapped_column(String(4), nullable=False)
    color: Mapped[str] = mapped_column(String(16), default="#5e6ad2")
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role"), default=MemberRole.member, nullable=False
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["User | None"] = relationship(back_populates="members")
    team_memberships: Mapped[list["TeamMembership"]] = relationship(
        back_populates="member", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("workspace_id", "email", name="uq_members_workspace_id_email"),)


class WorkspaceInvite(Base):
    """Pending invitation to join a workspace. Consumed when the invitee accepts."""

    __tablename__ = "workspace_invites"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="invite_role"), default=MemberRole.member, nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    invited_by_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="invites")
    invited_by: Mapped["Member | None"] = relationship()


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    icon_color: Mapped[str] = mapped_column(String(16), default="#22c55e")
    cycles_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    next_issue_number: Mapped[int] = mapped_column(Integer, default=1)
    estimate_scale: Mapped[EstimateScale] = mapped_column(
        Enum(EstimateScale, name="estimate_scale"), default=EstimateScale.fibonacci, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="teams")
    states: Mapped[list["WorkflowState"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    labels: Mapped[list["Label"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    issues: Mapped[list["Issue"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    memberships: Mapped[list["TeamMembership"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("workspace_id", "key", name="uq_teams_workspace_id_key"),)


class TeamMembership(Base):
    """Join row binding a Member to a Team (with a per-team role override).
    A workspace-level role lives on Member.role; per-team role is optional."""

    __tablename__ = "team_memberships"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[MemberRole | None] = mapped_column(Enum(MemberRole, name="team_member_role"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped["Team"] = relationship(back_populates="memberships")
    member: Mapped["Member"] = relationship(back_populates="team_memberships")

    __table_args__ = (UniqueConstraint("team_id", "member_id", name="uq_team_memberships_team_member"),)


class WorkflowState(Base):
    __tablename__ = "workflow_states"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    group: Mapped[StateGroup] = mapped_column(Enum(StateGroup, name="state_group"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(16), default="#95a2b3")

    team: Mapped["Team"] = relationship(back_populates="states")


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )
    team_id: Mapped[str | None] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    color: Mapped[str] = mapped_column(String(16), default="#5e6ad2")

    workspace: Mapped["Workspace | None"] = relationship(back_populates="labels")
    team: Mapped["Team | None"] = relationship(back_populates="labels")


issue_labels = Table(
    "issue_labels",
    Base.metadata,
    Column("issue_id", ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)


issue_subscribers = Table(
    "issue_subscribers",
    Base.metadata,
    Column("issue_id", ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
)


project_teams = Table(
    "project_teams",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("team_id", ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
)


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    identifier: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    state_id: Mapped[str] = mapped_column(ForeignKey("workflow_states.id", ondelete="RESTRICT"), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("issues.id", ondelete="SET NULL"), nullable=True)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    milestone_id: Mapped[str | None] = mapped_column(ForeignKey("project_milestones.id", ondelete="SET NULL"), nullable=True)
    cycle_id: Mapped[str | None] = mapped_column(ForeignKey("cycles.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_triage: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    triage_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    team: Mapped["Team"] = relationship(back_populates="issues")
    state: Mapped["WorkflowState"] = relationship()
    assignee: Mapped["Member | None"] = relationship()
    project: Mapped["Project | None"] = relationship(back_populates="issues", foreign_keys=[project_id])
    milestone: Mapped["ProjectMilestone | None"] = relationship(foreign_keys=[milestone_id])
    cycle: Mapped["Cycle | None"] = relationship(back_populates="issues", foreign_keys=[cycle_id])
    parent: Mapped["Issue | None"] = relationship(remote_side="Issue.id", back_populates="children")
    children: Mapped[list["Issue"]] = relationship(back_populates="parent")
    labels: Mapped[list["Label"]] = relationship(secondary=issue_labels)
    subscribers: Mapped[list["Member"]] = relationship(secondary=issue_subscribers)
    comments: Mapped[list["Comment"]] = relationship(back_populates="issue", cascade="all, delete-orphan", order_by="Comment.created_at")
    outgoing_relations: Mapped[list["IssueRelation"]] = relationship(
        back_populates="source", foreign_keys="IssueRelation.source_id", cascade="all, delete-orphan"
    )
    links: Mapped[list["IssueLink"]] = relationship(
        back_populates="issue", cascade="all, delete-orphan", order_by="IssueLink.created_at"
    )


class IssueLink(Base):
    """External link attached to an issue — GitHub PR, branch, Figma, or generic URL."""

    __tablename__ = "issue_links"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    issue_id: Mapped[str] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    type: Mapped[IssueLinkType] = mapped_column(
        Enum(IssueLinkType, name="issue_link_type"), default=IssueLinkType.url, nullable=False
    )
    status: Mapped[IssueLinkStatus | None] = mapped_column(
        Enum(IssueLinkStatus, name="issue_link_status"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    issue: Mapped["Issue"] = relationship(back_populates="links")


class Cycle(Base):
    """Time-boxed sprint for a team. Active/upcoming/completed is derived from
    `starts_at`/`ends_at` versus now."""

    __tablename__ = "cycles"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped["Team"] = relationship()
    issues: Mapped[list["Issue"]] = relationship(back_populates="cycle", foreign_keys="Issue.cycle_id")

    __table_args__ = (UniqueConstraint("team_id", "number", name="uq_cycles_team_number"),)


class Initiative(Base):
    """Strategic grouping of projects under a shared goal."""

    __tablename__ = "initiatives"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    slug_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_color: Mapped[str] = mapped_column(String(16), default="#bb87fc")
    status: Mapped[InitiativeStatus] = mapped_column(Enum(InitiativeStatus, name="initiative_status"), default=InitiativeStatus.planned)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    target_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship()
    owner: Mapped["Member | None"] = relationship()
    projects: Mapped[list["Project"]] = relationship(back_populates="initiative", foreign_keys="Project.initiative_id")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    slug_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_color: Mapped[str] = mapped_column(String(16), default="#5e6ad2")
    state: Mapped[ProjectState] = mapped_column(Enum(ProjectState, name="project_state"), default=ProjectState.planned)
    lead_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    initiative_id: Mapped[str | None] = mapped_column(ForeignKey("initiatives.id", ondelete="SET NULL"), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    target_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship()
    lead: Mapped["Member | None"] = relationship()
    initiative: Mapped["Initiative | None"] = relationship(back_populates="projects", foreign_keys=[initiative_id])
    issues: Mapped[list["Issue"]] = relationship(back_populates="project", foreign_keys="Issue.project_id")
    milestones: Mapped[list["ProjectMilestone"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectMilestone.position", foreign_keys="ProjectMilestone.project_id"
    )
    updates: Mapped[list["ProjectUpdate"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectUpdate.created_at.desc()"
    )
    resources: Mapped[list["ProjectResource"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectResource.created_at"
    )
    teams: Mapped[list["Team"]] = relationship(secondary=project_teams)


class ProjectResource(Base):
    """External link attached to a project (doc, dashboard, etc.)."""

    __tablename__ = "project_resources"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(8), default="🔗")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="resources")


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="milestones", foreign_keys=[project_id])


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    health: Mapped[UpdateHealth] = mapped_column(Enum(UpdateHealth, name="update_health"), default=UpdateHealth.onTrack)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="updates")
    author: Mapped["Member | None"] = relationship()


class CustomerRequest(Base):
    """Inbound customer feedback (Zendesk ticket, Slack message, email, etc.)
    that may eventually be linked to one of our Issues."""

    __tablename__ = "customer_requests"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="email")
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CustomerRequestStatus] = mapped_column(
        Enum(CustomerRequestStatus, name="customer_request_status"),
        default=CustomerRequestStatus.pending,
        nullable=False,
    )
    issue_id: Mapped[str | None] = mapped_column(ForeignKey("issues.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace: Mapped["Workspace"] = relationship()
    issue: Mapped["Issue | None"] = relationship()


class Document(Base):
    """Workspace- or project-scoped doc page (markdown body)."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    slug_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")
    icon: Mapped[str] = mapped_column(String(8), default="📄")
    body: Mapped[str] = mapped_column(Text, default="")
    creator_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace: Mapped["Workspace"] = relationship()
    project: Mapped["Project | None"] = relationship()
    creator: Mapped["Member | None"] = relationship()


class DocumentComment(Base):
    """Threaded comment on a document. Flat one-level threads via parent_id."""

    __tablename__ = "document_comments"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("document_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship()
    author: Mapped["Member | None"] = relationship()


class DocumentVersion(Base):
    """Append-only snapshot of a document's body. Captured on save when body
    actually changed; provides a basic version history."""

    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    author_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship()
    author: Mapped["Member | None"] = relationship()


class IssueRelation(Base):
    __tablename__ = "issue_relations"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    source_id: Mapped[str] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[RelationType] = mapped_column(Enum(RelationType, name="relation_type"), nullable=False)

    source: Mapped["Issue"] = relationship(foreign_keys=[source_id], back_populates="outgoing_relations")
    target: Mapped["Issue"] = relationship(foreign_keys=[target_id])

    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "type", name="uq_issue_relations_source_target_type"),
    )


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    issue_id: Mapped[str] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    issue: Mapped["Issue"] = relationship(back_populates="comments")
    author: Mapped["Member | None"] = relationship()
    parent: Mapped["Comment | None"] = relationship(remote_side="Comment.id", back_populates="replies")
    replies: Mapped[list["Comment"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", order_by="Comment.created_at"
    )
    reactions: Mapped[list["CommentReaction"]] = relationship(
        back_populates="comment", cascade="all, delete-orphan", order_by="CommentReaction.created_at"
    )


class CommentReaction(Base):
    """One row per (comment, member, emoji). Toggling re-adds or removes."""

    __tablename__ = "comment_reactions"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    comment_id: Mapped[str] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    comment: Mapped["Comment"] = relationship(back_populates="reactions")
    member: Mapped["Member"] = relationship()

    __table_args__ = (
        UniqueConstraint("comment_id", "member_id", "emoji", name="uq_comment_reactions_unique"),
    )


class Notification(Base):
    """One row per actionable update for a specific recipient. Generated by
    issue/comment/etc. mutations."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[NotificationKind] = mapped_column(Enum(NotificationKind, name="notification_kind"), nullable=False)
    issue_id: Mapped[str | None] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=True)
    comment_id: Mapped[str | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recipient: Mapped["Member"] = relationship(foreign_keys=[recipient_id])
    actor: Mapped["Member | None"] = relationship(foreign_keys=[actor_id])
    issue: Mapped["Issue | None"] = relationship()
    comment: Mapped["Comment | None"] = relationship()


class NotificationPreference(Base):
    """Per-member mute settings keyed by scope.

    scope_type ∈ {'team', 'project'}; scope_id is the relevant id. When a row
    exists with muted=True, notifications for activity inside that scope are
    suppressed for the member. Workspace-wide muting is opt-in via a row with
    scope_type='workspace' and scope_id=workspace_id (rarely used).
    """

    __tablename__ = "notification_preferences"
    __table_args__ = (
        UniqueConstraint("member_id", "scope_type", "scope_id", name="uq_notif_prefs_member_scope"),
    )

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    scope_type: Mapped[str] = mapped_column(String(16), nullable=False)
    scope_id: Mapped[str] = mapped_column(String(36), nullable=False)
    muted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    member: Mapped["Member"] = relationship()


class SavedView(Base):
    """User-saved view: a named filter/group/sort/display combination, optionally
    scoped to a team. Workspace-scoped when team_id is null."""

    __tablename__ = "saved_views"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    icon_color: Mapped[str] = mapped_column(String(16), default="#5e6ad2")
    # base view: active | backlog | all
    base: Mapped[str] = mapped_column(String(16), default="active")
    # serialized query string (without leading '?')
    query: Mapped[str] = mapped_column(Text, default="")
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship()
    team: Mapped["Team | None"] = relationship()


class TemplateKind(str, enum.Enum):
    issue = "issue"
    project = "project"
    document = "document"


class IntegrationKind(str, enum.Enum):
    github = "github"
    slack = "slack"
    figma = "figma"


class WorkspaceIntegration(Base):
    """One row per workspace × integration kind.

    `config` is JSON: stores the inbound webhook secret + per-integration
    knobs (e.g., default Slack team_id for triage routing).
    """

    __tablename__ = "workspace_integrations"
    __table_args__ = (
        UniqueConstraint("workspace_id", "kind", name="uq_workspace_integrations"),
    )

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[IntegrationKind] = mapped_column(Enum(IntegrationKind, name="integration_kind"), nullable=False)
    config: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship()


class AutomationTrigger(str, enum.Enum):
    on_issue_create = "on_issue_create"
    on_status_change = "on_status_change"
    on_label_added = "on_label_added"
    on_cycle_end = "on_cycle_end"
    stale_in_state = "stale_in_state"  # scheduled


class AutomationAction(str, enum.Enum):
    move_to_state = "move_to_state"
    assign_to_member = "assign_to_member"
    add_label = "add_label"
    add_comment = "add_comment"
    archive = "archive"
    set_priority = "set_priority"
    rotate_assign = "rotate_assign"  # round-robin among configured members


class Automation(Base):
    """Workflow rule. team_id null means workspace-wide.

    `trigger_config` shape varies by trigger:
      on_status_change: {to_state_group: "completed", from_state_group: null}
      on_label_added:   {label_id: "..."}
      stale_in_state:   {state_group: "started", days: 14}
    `action_config`:
      move_to_state:    {state_group: "canceled"}
      assign_to_member: {member_id: "..."}
      add_label:        {label_id: "..."}
      add_comment:      {body: "..."}
      set_priority:     {priority: 2}
      rotate_assign:    {member_ids: ["..", ".."], cursor: 0}
    """

    __tablename__ = "automations"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trigger: Mapped[AutomationTrigger] = mapped_column(Enum(AutomationTrigger, name="automation_trigger"), nullable=False)
    trigger_config: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    action: Mapped[AutomationAction] = mapped_column(Enum(AutomationAction, name="automation_action"), nullable=False)
    action_config: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship()
    team: Mapped["Team | None"] = relationship()


class Template(Base):
    """Reusable issue / project / document scaffold.

    `body` is a JSON-encoded string (`Text` for portability) interpreted per
    kind:
      - issue:    {title, description, priority, label_ids, estimate, state_id}
      - project:  {name, description, icon_color, milestones: [{name, target_date_offset_days}]}
      - document: {title, body, icon}
    """

    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True)
    kind: Mapped[TemplateKind] = mapped_column(Enum(TemplateKind, name="template_kind"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship()
    team: Mapped["Team | None"] = relationship()
