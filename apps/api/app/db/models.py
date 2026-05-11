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


class Member(Base):
    __tablename__ = "members"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    initials: Mapped[str] = mapped_column(String(4), nullable=False)
    color: Mapped[str] = mapped_column(String(16), default="#5e6ad2")

    workspace: Mapped["Workspace"] = relationship(back_populates="members")

    __table_args__ = (UniqueConstraint("workspace_id", "email", name="uq_members_workspace_id_email"),)


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(UUID(), primary_key=True, default=_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    icon_color: Mapped[str] = mapped_column(String(16), default="#22c55e")
    cycles_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    next_issue_number: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="teams")
    states: Mapped[list["WorkflowState"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    labels: Mapped[list["Label"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    issues: Mapped[list["Issue"]] = relationship(back_populates="team", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("workspace_id", "key", name="uq_teams_workspace_id_key"),)


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
    comments: Mapped[list["Comment"]] = relationship(back_populates="issue", cascade="all, delete-orphan", order_by="Comment.created_at")
    outgoing_relations: Mapped[list["IssueRelation"]] = relationship(
        back_populates="source", foreign_keys="IssueRelation.source_id", cascade="all, delete-orphan"
    )


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
    slug_id: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
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
    slug_id: Mapped[str] = mapped_column(String(16), nullable=False, unique=True, index=True)
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
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    issue: Mapped["Issue"] = relationship(back_populates="comments")
    author: Mapped["Member | None"] = relationship()


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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recipient: Mapped["Member"] = relationship(foreign_keys=[recipient_id])
    actor: Mapped["Member | None"] = relationship(foreign_keys=[actor_id])
    issue: Mapped["Issue | None"] = relationship()
    comment: Mapped["Comment | None"] = relationship()


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
