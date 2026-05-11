"""Pydantic schemas for the API surface."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


# --- Atoms --------------------------------------------------------------

class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    initials: str
    color: str


class WorkflowStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    group: str
    color: str
    position: int


class LabelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    color: str


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    key: str
    name: str
    icon_color: str
    cycles_enabled: bool


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug: str
    name: str
    icon_color: str
    teams: list[TeamOut] = []


class IssueRelationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    type: str
    target_identifier: str
    target_title: str
    target_state_group: str
    target_priority: int = 0


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    body: str
    author: MemberOut | None
    created_at: datetime


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    identifier: str
    title: str
    description: str | None
    priority: int
    estimate: int | None
    due_date: datetime | None
    updated_at: datetime
    state: WorkflowStateOut
    team: TeamOut
    assignee: MemberOut | None
    labels: list[LabelOut]
    parent_identifier: str | None = None
    project_id: str | None = None
    project_name: str | None = None
    project_slug_id: str | None = None
    cycle_id: str | None = None
    cycle_number: int | None = None
    is_triage: bool = False
    triage_source: str | None = None
    child_count: int = 0
    child_done_count: int = 0


class IssueDetailOut(IssueOut):
    sub_issues: list[IssueOut] = []
    relations: list[IssueRelationOut] = []
    comments: list[CommentOut] = []


# --- Project schemas ----------------------------------------------------

class ProjectMilestoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    target_date: datetime | None
    position: int
    description: str | None = None


class ProjectUpdateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    body: str
    health: str
    author: "MemberOut | None"
    created_at: datetime


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug_id: str
    name: str
    description: str | None
    icon_color: str
    state: str
    lead: MemberOut | None
    start_date: datetime | None
    target_date: datetime | None
    issue_count: int = 0
    completed_issue_count: int = 0
    initiative_id: str | None = None
    initiative_name: str | None = None
    initiative_slug_id: str | None = None


class ProjectDetailOut(ProjectOut):
    milestones: list[ProjectMilestoneOut] = []
    updates: list[ProjectUpdateOut] = []
    members: list[MemberOut] = []


class ProjectCreateIn(BaseModel):
    name: str
    description: str | None = None
    state: str = "planned"
    icon_color: str = "#5e6ad2"
    lead_id: str | None = None
    initiative_id: str | None = None
    target_date: datetime | None = None
    start_date: datetime | None = None


class ProjectPatchIn(BaseModel):
    name: str | None = None
    description: str | None = None
    state: str | None = None
    icon_color: str | None = None
    lead_id: str | None = None
    initiative_id: str | None = None
    target_date: datetime | None = None
    start_date: datetime | None = None
    clear_target_date: bool = False
    clear_lead: bool = False
    clear_initiative: bool = False


# --- Initiatives --------------------------------------------------------

class InitiativeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug_id: str
    name: str
    description: str | None
    icon_color: str
    status: str
    owner: MemberOut | None
    target_date: datetime | None
    project_count: int = 0
    completed_project_count: int = 0


class InitiativeDetailOut(InitiativeOut):
    projects: list[ProjectOut] = []


class InitiativeCreateIn(BaseModel):
    name: str
    description: str | None = None
    icon_color: str = "#bb87fc"
    status: str = "planned"
    owner_id: str | None = None
    target_date: datetime | None = None


class InitiativePatchIn(BaseModel):
    name: str | None = None
    description: str | None = None
    icon_color: str | None = None
    status: str | None = None
    owner_id: str | None = None
    target_date: datetime | None = None
    clear_target_date: bool = False
    clear_owner: bool = False


class MilestoneCreateIn(BaseModel):
    name: str
    target_date: datetime | None = None
    description: str | None = None


class UpdateCreateIn(BaseModel):
    body: str
    health: str = "onTrack"


# --- Cycle schemas ------------------------------------------------------

class CycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    team_id: str
    team_key: str
    number: int
    name: str
    description: str | None
    starts_at: datetime
    ends_at: datetime
    completed_at: datetime | None
    status: str
    issue_count: int = 0
    completed_issue_count: int = 0


class CycleCreateIn(BaseModel):
    name: str
    description: str | None = None
    starts_at: datetime
    ends_at: datetime


class CyclePatchIn(BaseModel):
    name: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    completed_at: datetime | None = None
    clear_completed_at: bool = False


# --- Mutation inputs ----------------------------------------------------

class IssueCreateIn(BaseModel):
    title: str
    description: str | None = None
    priority: int = 0
    state_id: str | None = None
    state_name: str | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    label_ids: list[str] = []
    estimate: int | None = None
    parent_identifier: str | None = None
    is_triage: bool = False
    triage_source: str | None = None


class TriageCreateIn(BaseModel):
    """Inbound issue from an external source (Slack, Zendesk, email, etc.).
    Lands in the team's triage queue."""
    title: str
    description: str | None = None
    source: str | None = "external"
    priority: int = 0


# --- Documents ----------------------------------------------------------

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug_id: str
    title: str
    icon: str
    body: str
    creator: MemberOut | None
    project_id: str | None = None
    project_name: str | None = None
    project_slug_id: str | None = None
    created_at: datetime
    updated_at: datetime


class DocumentCreateIn(BaseModel):
    title: str = "Untitled"
    icon: str = "📄"
    body: str = ""
    project_id: str | None = None
    creator_id: str | None = None


class DocumentPatchIn(BaseModel):
    title: str | None = None
    icon: str | None = None
    body: str | None = None
    project_id: str | None = None
    clear_project: bool = False


# --- Customer requests --------------------------------------------------

class CustomerRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_name: str
    customer_email: str | None
    source: str
    title: str
    body: str | None
    status: str
    issue_identifier: str | None = None
    issue_title: str | None = None
    created_at: datetime
    updated_at: datetime


class CustomerRequestCreateIn(BaseModel):
    customer_name: str
    customer_email: str | None = None
    source: str = "email"
    title: str
    body: str | None = None


class CustomerRequestPatchIn(BaseModel):
    status: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    title: str | None = None
    body: str | None = None


class CustomerRequestLinkIn(BaseModel):
    issue_identifier: str


# --- Settings (admin) ---------------------------------------------------

class LabelCreateIn(BaseModel):
    name: str
    color: str = "#5e6ad2"


class LabelPatchIn(BaseModel):
    name: str | None = None
    color: str | None = None


class WorkflowStateCreateIn(BaseModel):
    name: str
    group: str
    position: int = 0
    color: str = "#95a2b3"


class WorkflowStatePatchIn(BaseModel):
    name: str | None = None
    group: str | None = None
    position: int | None = None
    color: str | None = None


class TeamPatchIn(BaseModel):
    name: str | None = None
    icon_color: str | None = None
    cycles_enabled: bool | None = None


class TeamCreateIn(BaseModel):
    key: str
    name: str
    icon_color: str = "#22c55e"
    cycles_enabled: bool = False


class IssuePatchIn(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: int | None = None
    state_id: str | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    milestone_id: str | None = None
    cycle_id: str | None = None
    label_ids: list[str] | None = None
    estimate: int | None = None
    due_date: datetime | None = None
    clear_due_date: bool = False
    clear_estimate: bool = False
    clear_project: bool = False
    clear_milestone: bool = False
    clear_cycle: bool = False


class CommentCreateIn(BaseModel):
    body: str
    author_id: str | None = None


# --- Saved views --------------------------------------------------------

class SavedViewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    icon_color: str
    base: str
    query: str
    favorite: bool
    position: int
    team_key: str | None = None


class SavedViewCreateIn(BaseModel):
    name: str
    icon_color: str = "#5e6ad2"
    base: str = "active"
    query: str = ""
    team_key: str | None = None
    favorite: bool = False


class SavedViewPatchIn(BaseModel):
    name: str | None = None
    icon_color: str | None = None
    favorite: bool | None = None
    query: str | None = None
    base: str | None = None


# --- Bulk issue operations ---------------------------------------------

class IssueBulkPatch(BaseModel):
    """Subset of IssuePatchIn fields that bulk-apply cleanly to many issues."""
    state_id: str | None = None
    priority: int | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    add_label_ids: list[str] = []
    remove_label_ids: list[str] = []
    clear_project: bool = False
    clear_assignee: bool = False


class IssueBulkIn(BaseModel):
    identifiers: list[str]
    op: str = "patch"  # "patch" | "delete"
    patch: IssueBulkPatch | None = None


class IssueBulkOut(BaseModel):
    updated: int = 0
    deleted: int = 0
    not_found: list[str] = []


# --- Notifications ------------------------------------------------------

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    kind: str
    body: str | None
    read_at: datetime | None
    created_at: datetime
    actor: MemberOut | None = None
    issue_identifier: str | None = None
    issue_title: str | None = None


class NotificationCountOut(BaseModel):
    unread: int


# --- Seed schema --------------------------------------------------------

class SeedRequest(BaseModel):
    schema_: str
    workspaces: list[dict]
    reset: bool = False

    model_config = ConfigDict(populate_by_name=True)
