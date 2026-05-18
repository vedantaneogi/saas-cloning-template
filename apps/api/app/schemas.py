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
    role: str = "member"
    email: str | None = None
    # Populated by the members-list endpoint. Other endpoints that
    # return a MemberOut leave these as None — the Members page is the
    # only consumer.
    joined_at: datetime | None = None
    last_active_at: datetime | None = None
    team_keys: list[str] = []


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
    estimate_scale: str = "fibonacci"


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


class ReactionGroupOut(BaseModel):
    """One entry per distinct emoji on a comment. `reacted` is true if the
    current user is among `member_ids`."""

    emoji: str
    count: int
    member_ids: list[str] = []
    member_names: list[str] = []
    reacted: bool = False


class CommentMentionOut(BaseModel):
    """A member resolved from an @mention in the comment body."""

    member_id: str
    name: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    body: str
    author: MemberOut | None
    created_at: datetime
    parent_id: str | None = None
    reactions: list[ReactionGroupOut] = []
    mentions: list[CommentMentionOut] = []
    replies: list["CommentOut"] = []


class ReactionToggleIn(BaseModel):
    emoji: str
    member_id: str | None = None


# --- Issue links --------------------------------------------------------

class IssueLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    url: str
    title: str
    type: str
    status: str | None = None
    created_at: datetime


class IssueLinkCreateIn(BaseModel):
    url: str
    title: str | None = None
    type: str | None = None
    status: str | None = None


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    identifier: str
    title: str
    description: str | None
    priority: int
    estimate: int | None
    due_date: datetime | None
    created_at: datetime | None = None
    updated_at: datetime
    state: WorkflowStateOut
    team: TeamOut
    assignee: MemberOut | None
    creator: MemberOut | None = None
    labels: list[LabelOut]
    parent_identifier: str | None = None
    project_id: str | None = None
    project_name: str | None = None
    project_slug_id: str | None = None
    cycle_id: str | None = None
    cycle_number: int | None = None
    is_triage: bool = False
    triage_source: str | None = None
    archived_at: datetime | None = None
    child_count: int = 0
    child_done_count: int = 0


class IssueDetailOut(IssueOut):
    sub_issues: list[IssueOut] = []
    relations: list[IssueRelationOut] = []
    comments: list[CommentOut] = []
    links: list[IssueLinkOut] = []
    subscribers: list[MemberOut] = []
    subscribed: bool = False


class IssueMoveIn(BaseModel):
    team_key: str


class IssueRelationCreateIn(BaseModel):
    type: str  # blocks | blocked_by | related | duplicate
    target_identifier: str


class IssueSubscribeIn(BaseModel):
    member_id: str | None = None


class ProjectResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    url: str
    title: str
    icon: str
    created_at: datetime


class ProjectResourceCreateIn(BaseModel):
    url: str
    title: str | None = None
    icon: str | None = None


class CycleCompleteIn(BaseModel):
    rollover_to: str | None = None  # next cycle id; defaults to next upcoming cycle on same team


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
    priority: int = 0
    lead: MemberOut | None
    creator: MemberOut | None = None
    start_date: datetime | None
    target_date: datetime | None
    issue_count: int = 0
    completed_issue_count: int = 0
    initiative_id: str | None = None
    initiative_name: str | None = None
    initiative_slug_id: str | None = None
    team_keys: list[str] = []
    member_ids: list[str] = []
    label_ids: list[str] = []
    dependency_ids: list[str] = []
    template_id: str | None = None
    health: str | None = None
    health_updated_at: datetime | None = None
    next_milestone: "NextMilestoneSummary | None" = None
    created_at: datetime | None = None


class NextMilestoneSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    target_date: datetime | None = None


class ProjectDetailOut(ProjectOut):
    milestones: list[ProjectMilestoneOut] = []
    updates: list[ProjectUpdateOut] = []
    members: list[MemberOut] = []
    resources: list["ProjectResourceOut"] = []
    teams: list[TeamOut] = []


class ProjectCreateIn(BaseModel):
    name: str
    description: str | None = None
    state: str = "planned"
    priority: int = 0
    icon_color: str = "#5e6ad2"
    lead_id: str | None = None
    initiative_id: str | None = None
    target_date: datetime | None = None
    start_date: datetime | None = None
    member_ids: list[str] | None = None


class ProjectPatchIn(BaseModel):
    name: str | None = None
    description: str | None = None
    state: str | None = None
    priority: int | None = None
    icon_color: str | None = None
    lead_id: str | None = None
    initiative_id: str | None = None
    target_date: datetime | None = None
    start_date: datetime | None = None
    team_ids: list[str] | None = None
    member_ids: list[str] | None = None
    label_ids: list[str] | None = None
    dependency_ids: list[str] | None = None
    template_id: str | None = None
    clear_start_date: bool = False
    clear_target_date: bool = False
    clear_lead: bool = False
    clear_initiative: bool = False
    clear_template: bool = False


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
    cycle_id: str | None = None
    due_date: datetime | None = None
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
    customer_id: str | None = None
    customer_name: str
    customer_email: str | None
    source: str
    title: str
    body: str | None
    status: str
    is_important: bool = False
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
    customer_id: str | None = None
    # Optional: when set, the server creates a new Issue under this
    # team (and project, if any) and links the request to it. Matches
    # the "this request will be added to <new issue / existing project>"
    # selector on the customer detail page.
    team_key: str | None = None
    project_id: str | None = None


class CustomerRequestPatchIn(BaseModel):
    status: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    title: str | None = None
    body: str | None = None
    is_important: bool | None = None


class CustomerRequestLinkIn(BaseModel):
    issue_identifier: str


# --- Customers ----------------------------------------------------------

class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug: str
    name: str
    owner: MemberOut | None = None
    status: str
    tier: str | None = None
    annual_revenue: int | None = None
    size: int | None = None
    logo_url: str | None = None
    domains: list[str] = []
    request_count: int = 0
    created_at: datetime


class CustomerCreateIn(BaseModel):
    name: str
    owner_id: str | None = None
    status: str = "active"
    tier: str | None = None
    annual_revenue: int | None = None
    size: int | None = None
    logo_url: str | None = None
    domains: list[str] = []


class CustomerPatchIn(BaseModel):
    name: str | None = None
    owner_id: str | None = None
    clear_owner: bool = False
    status: str | None = None
    tier: str | None = None
    clear_tier: bool = False
    annual_revenue: int | None = None
    clear_annual_revenue: bool = False
    size: int | None = None
    clear_size: bool = False
    logo_url: str | None = None
    clear_logo: bool = False
    domains: list[str] | None = None


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
    estimate_scale: str | None = None


class TeamCreateIn(BaseModel):
    key: str
    name: str
    icon_color: str = "#22c55e"
    cycles_enabled: bool = False
    estimate_scale: str = "fibonacci"


class MemberRolePatchIn(BaseModel):
    role: str


class TeamPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    team_key: str
    favorite: bool
    sub_issue_added: bool
    sub_issue_resolved: bool
    sub_triage_added: bool


class TeamPreferencePatchIn(BaseModel):
    favorite: bool | None = None
    sub_issue_added: bool | None = None
    sub_issue_resolved: bool | None = None
    sub_triage_added: bool | None = None


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
    parent_identifier: str | None = None
    clear_due_date: bool = False
    clear_estimate: bool = False
    clear_project: bool = False
    clear_milestone: bool = False
    clear_cycle: bool = False
    clear_parent: bool = False


class CommentCreateIn(BaseModel):
    body: str
    author_id: str | None = None
    parent_id: str | None = None


# --- Saved views --------------------------------------------------------

class SavedViewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    icon_color: str
    base: str
    scope: str = "issues"
    description: str | None = None
    query: str
    favorite: bool
    position: int
    team_key: str | None = None
    owner: MemberOut | None = None
    owner_id: str | None = None
    last_used_at: datetime | None = None
    created_at: datetime | None = None


class SavedViewCreateIn(BaseModel):
    name: str
    icon_color: str = "#5e6ad2"
    base: str = "active"
    scope: str = "issues"
    description: str | None = None
    query: str = ""
    team_key: str | None = None
    favorite: bool = False
    # When true, the new view is personal to the current member (owner_id
    # set on the server). When false, it's workspace-shared. The frontend
    # picker maps "Personal" -> personal=True, anything else -> False.
    personal: bool = True


class SavedViewPatchIn(BaseModel):
    name: str | None = None
    icon_color: str | None = None
    favorite: bool | None = None
    query: str | None = None
    base: str | None = None
    description: str | None = None
    # Allow flipping between personal (owner_id = caller) and shared
    # (owner_id null). Owners can also reassign by passing a new member id.
    personal: bool | None = None


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
