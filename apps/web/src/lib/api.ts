// API client used by both server components (during SSR) and client components (in the browser).
// - In the browser, we use a *relative* base ("") so requests go to the same origin and are
//   proxied through Next.js rewrites (see next.config.ts) to the actual API host. That makes
//   the deployment portable: the public hostname doesn't need to be baked into the build.
// - In the Node runtime (SSR + RSC), we hit the API directly via API_URL (or the localhost
//   fallback) so we skip a hop through the Next server.

const isBrowser = typeof window !== "undefined";
const API_BASE = isBrowser ? "" : (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");

export type StateGroup = "backlog" | "unstarted" | "started" | "completed" | "canceled";

export type MemberRole = "admin" | "member" | "guest";

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  role?: MemberRole;
  email?: string | null;
}

export interface WorkflowState {
  id: string;
  name: string;
  group: StateGroup;
  color: string;
  position: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export type EstimateScale = "none" | "linear" | "fibonacci" | "exponential" | "tshirt";

export interface Team {
  id: string;
  key: string;
  name: string;
  icon_color: string;
  cycles_enabled: boolean;
  estimate_scale?: EstimateScale;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  icon_color: string;
  teams: Team[];
}

export interface IssueRelation {
  type: string;
  target_identifier: string;
  target_title: string;
  target_state_group: StateGroup;
  target_priority: 0 | 1 | 2 | 3 | 4;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  member_ids: string[];
  member_names: string[];
  reacted: boolean;
}

export interface CommentMention {
  member_id: string;
  name: string;
}

export interface Comment {
  id: string;
  body: string;
  author: Member | null;
  created_at: string;
  parent_id?: string | null;
  reactions?: ReactionGroup[];
  mentions?: CommentMention[];
  replies?: Comment[];
}

export type IssueLinkType = "github_pr" | "github_branch" | "figma" | "url";
export type IssueLinkStatus = "open" | "merged" | "closed" | "draft";

export interface IssueLink {
  id: string;
  url: string;
  title: string;
  type: IssueLinkType;
  status: IssueLinkStatus | null;
  created_at: string;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: 0 | 1 | 2 | 3 | 4;
  estimate: number | null;
  due_date: string | null;
  updated_at: string;
  state: WorkflowState;
  team: Team;
  assignee: Member | null;
  labels: Label[];
  parent_identifier: string | null;
  project_id: string | null;
  project_name: string | null;
  project_slug_id: string | null;
  cycle_id: string | null;
  cycle_number: number | null;
  is_triage: boolean;
  triage_source: string | null;
  archived_at: string | null;
  child_count: number;
  child_done_count: number;
}

export interface IssueDetail extends Issue {
  sub_issues: Issue[];
  relations: IssueRelation[];
  comments: Comment[];
  links: IssueLink[];
}

export type ProjectState = "planned" | "started" | "paused" | "completed" | "canceled";
export type UpdateHealth = "onTrack" | "atRisk" | "offTrack";

export interface ProjectMilestone {
  id: string;
  name: string;
  target_date: string | null;
  position: number;
  description: string | null;
}

export interface ProjectUpdate {
  id: string;
  body: string;
  health: UpdateHealth;
  author: Member | null;
  created_at: string;
}

export interface Project {
  id: string;
  slug_id: string;
  name: string;
  description: string | null;
  icon_color: string;
  state: ProjectState;
  lead: Member | null;
  start_date: string | null;
  target_date: string | null;
  issue_count: number;
  completed_issue_count: number;
  initiative_id: string | null;
  initiative_name: string | null;
  initiative_slug_id: string | null;
}

export interface ProjectDetail extends Project {
  milestones: ProjectMilestone[];
  updates: ProjectUpdate[];
  members: Member[];
}

export type InitiativeStatus = "planned" | "active" | "completed" | "canceled";

export interface Initiative {
  id: string;
  slug_id: string;
  name: string;
  description: string | null;
  icon_color: string;
  status: InitiativeStatus;
  owner: Member | null;
  target_date: string | null;
  project_count: number;
  completed_project_count: number;
}

export interface InitiativeDetail extends Initiative {
  projects: Project[];
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = API_BASE.replace(/\/$/, "") + path;
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError(url);
    throw new Error(`API ${res.status} ${url}`);
  }
  return res.json();
}

export class NotFoundError extends Error {
  constructor(url: string) {
    super(`Not found: ${url}`);
  }
}

export function getWorkspace(slug: string): Promise<Workspace> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}`);
}

export function listTeamIssues(slug: string, teamKey: string, view: "active" | "backlog" | "all"): Promise<Issue[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/issues?view=${view}`);
}

export function getIssue(slug: string, identifier: string): Promise<IssueDetail> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}`);
}

export function myIssues(slug: string, scope: string): Promise<Issue[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/my/${encodeURIComponent(scope)}`);
}

export function myIssueCounts(slug: string): Promise<Record<string, number>> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/my/counts`);
}

export function listMembers(slug: string): Promise<Member[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/members`);
}

export function listTeamLabels(slug: string, teamKey: string): Promise<Label[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/labels`);
}

export function listWorkspaceLabels(slug: string): Promise<Label[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/labels`);
}

export function listTeamStates(slug: string, teamKey: string): Promise<WorkflowState[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/states`);
}

// --- Settings: labels, states, team patch ----------------------------

export function createWorkspaceLabel(slug: string, body: { name: string; color?: string }): Promise<Label> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createTeamLabel(slug: string, teamKey: string, body: { name: string; color?: string }): Promise<Label> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchLabel(slug: string, labelId: string, body: { name?: string; color?: string }): Promise<Label> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/labels/${encodeURIComponent(labelId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteLabel(slug: string, labelId: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/labels/${encodeURIComponent(labelId)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export function createWorkflowState(slug: string, teamKey: string, body: { name: string; group: string; position?: number; color?: string }): Promise<WorkflowState> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/states`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchWorkflowState(slug: string, teamKey: string, stateId: string, body: Partial<{ name: string; group: string; position: number; color: string }>): Promise<WorkflowState> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/states/${encodeURIComponent(stateId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteWorkflowState(slug: string, teamKey: string, stateId: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/states/${encodeURIComponent(stateId)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (res.status === 409) throw new Error("State is in use by one or more issues — reassign them first.");
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export function patchTeam(slug: string, teamKey: string, body: Partial<{ name: string; icon_color: string; cycles_enabled: boolean; estimate_scale: EstimateScale }>): Promise<Team> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface IssueCreateInput {
  title: string;
  description?: string;
  priority?: number;
  state_id?: string;
  state_name?: string;
  assignee_id?: string;
  label_ids?: string[];
  estimate?: number;
  parent_identifier?: string;
}

export interface IssuePatchInput {
  title?: string;
  description?: string;
  priority?: number;
  state_id?: string;
  assignee_id?: string | null;
  project_id?: string | null;
  milestone_id?: string | null;
  cycle_id?: string | null;
  label_ids?: string[];
  estimate?: number;
  due_date?: string;
  parent_identifier?: string | null;
  clear_due_date?: boolean;
  clear_estimate?: boolean;
  clear_project?: boolean;
  clear_milestone?: boolean;
  clear_cycle?: boolean;
  clear_parent?: boolean;
}

export function createIssue(slug: string, teamKey: string, body: IssueCreateInput): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchIssue(slug: string, identifier: string, body: IssuePatchInput): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function postComment(slug: string, identifier: string, body: string, parentId?: string | null): Promise<Comment> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, parent_id: parentId ?? null }),
  });
}

export function toggleReaction(slug: string, commentId: string, emoji: string, memberId?: string): Promise<ReactionGroup[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji, member_id: memberId ?? null }),
  });
}

export function createIssueLink(slug: string, identifier: string, body: { url: string; title?: string; type?: IssueLinkType; status?: IssueLinkStatus }): Promise<IssueLink> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteIssueLink(slug: string, identifier: string, linkId: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/links/${encodeURIComponent(linkId)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export function archiveIssue(slug: string, identifier: string): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export function unarchiveIssue(slug: string, identifier: string): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/unarchive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export function moveIssue(slug: string, identifier: string, teamKey: string): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_key: teamKey }),
  });
}

export function patchMemberRole(slug: string, memberId: string, role: MemberRole): Promise<Member> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function deleteIssue(slug: string, identifier: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export function duplicateIssue(slug: string, identifier: string): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export interface IssueBulkPatch {
  state_id?: string;
  priority?: number;
  assignee_id?: string;
  project_id?: string;
  add_label_ids?: string[];
  remove_label_ids?: string[];
  clear_project?: boolean;
  clear_assignee?: boolean;
}

export function bulkPatchIssues(slug: string, identifiers: string[], patch: IssueBulkPatch): Promise<{ updated: number; deleted: number; not_found: string[] }> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifiers, op: "patch", patch }),
  });
}

export function bulkDeleteIssues(slug: string, identifiers: string[]): Promise<{ updated: number; deleted: number; not_found: string[] }> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifiers, op: "delete" }),
  });
}

// --- Projects -----------------------------------------------------------

export function listProjects(slug: string, state?: ProjectState): Promise<Project[]> {
  const qs = state ? `?state=${encodeURIComponent(state)}` : "";
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects${qs}`);
}

export function getProject(slug: string, projectSlug: string): Promise<ProjectDetail> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}`);
}

export function listProjectIssues(slug: string, projectSlug: string): Promise<Issue[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}/issues`);
}

export function createProject(
  slug: string,
  body: { name: string; description?: string; state?: ProjectState; icon_color?: string; lead_id?: string; target_date?: string }
): Promise<Project> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchProject(
  slug: string,
  projectSlug: string,
  body: Partial<{ name: string; description: string; state: ProjectState; icon_color: string; lead_id: string; initiative_id: string; target_date: string; clear_target_date: boolean; clear_lead: boolean; clear_initiative: boolean }>
): Promise<Project> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Documents ----------------------------------------------------------

export interface Document {
  id: string;
  slug_id: string;
  title: string;
  icon: string;
  body: string;
  creator: Member | null;
  project_id: string | null;
  project_name: string | null;
  project_slug_id: string | null;
  created_at: string;
  updated_at: string;
}

export function listDocuments(slug: string, projectId?: string): Promise<Document[]> {
  const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents${qs}`);
}

export function getDocument(slug: string, docSlug: string): Promise<Document> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}`);
}

export function createDocument(slug: string, body: { title?: string; icon?: string; body?: string; project_id?: string }): Promise<Document> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchDocument(slug: string, docSlug: string, body: Partial<{ title: string; icon: string; body: string; project_id: string; clear_project: boolean }>): Promise<Document> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteDocument(slug: string, docSlug: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

// --- Customer requests --------------------------------------------------

export type CustomerRequestStatus = "pending" | "linked" | "resolved" | "canceled";

export interface CustomerRequest {
  id: string;
  customer_name: string;
  customer_email: string | null;
  source: string;
  title: string;
  body: string | null;
  status: CustomerRequestStatus;
  issue_identifier: string | null;
  issue_title: string | null;
  created_at: string;
  updated_at: string;
}

export function listCustomerRequests(slug: string, status?: CustomerRequestStatus): Promise<CustomerRequest[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/customer-requests${qs}`);
}

export function getCustomerRequest(slug: string, id: string): Promise<CustomerRequest> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/customer-requests/${encodeURIComponent(id)}`);
}

export function patchCustomerRequest(
  slug: string,
  id: string,
  body: Partial<{ status: CustomerRequestStatus; customer_name: string; customer_email: string; title: string; body: string }>
): Promise<CustomerRequest> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/customer-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function linkCustomerRequest(slug: string, id: string, issueIdentifier: string): Promise<CustomerRequest> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/customer-requests/${encodeURIComponent(id)}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issue_identifier: issueIdentifier }),
  });
}

export function unlinkCustomerRequest(slug: string, id: string): Promise<CustomerRequest> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/customer-requests/${encodeURIComponent(id)}/unlink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export function listIssueCustomerRequests(slug: string, identifier: string): Promise<CustomerRequest[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/customer-requests`);
}

// --- Initiatives --------------------------------------------------------

export function listInitiatives(slug: string): Promise<Initiative[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/initiatives`);
}

export function getInitiative(slug: string, initiativeSlug: string): Promise<InitiativeDetail> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/initiatives/${encodeURIComponent(initiativeSlug)}`);
}

export function createInitiative(
  slug: string,
  body: { name: string; description?: string; icon_color?: string; status?: InitiativeStatus; owner_id?: string; target_date?: string }
): Promise<Initiative> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/initiatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchInitiative(
  slug: string,
  initiativeSlug: string,
  body: Partial<{ name: string; description: string; icon_color: string; status: InitiativeStatus; owner_id: string; target_date: string; clear_target_date: boolean; clear_owner: boolean }>
): Promise<Initiative> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/initiatives/${encodeURIComponent(initiativeSlug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createProjectUpdate(slug: string, projectSlug: string, body: { body: string; health: UpdateHealth }): Promise<ProjectUpdate> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}/updates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Cycles -------------------------------------------------------------

export type CycleStatus = "upcoming" | "active" | "completed";

export interface Cycle {
  id: string;
  team_id: string;
  team_key: string;
  number: number;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  status: CycleStatus;
  issue_count: number;
  completed_issue_count: number;
}

export function listCycles(slug: string, teamKey: string): Promise<Cycle[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/cycles`);
}

export function getActiveCycle(slug: string, teamKey: string): Promise<Cycle | null> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/cycles/active`);
}

export function getCycle(slug: string, cycleId: string): Promise<Cycle> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/cycles/${encodeURIComponent(cycleId)}`);
}

export function listCycleIssues(slug: string, cycleId: string): Promise<Issue[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/cycles/${encodeURIComponent(cycleId)}/issues`);
}

// --- Triage -------------------------------------------------------------

export function listTriage(slug: string, teamKey: string): Promise<Issue[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/triage`);
}

export function getTriageCount(slug: string, teamKey: string): Promise<{ count: number }> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/triage/count`);
}

export function acceptTriage(slug: string, identifier: string): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/triage/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function declineTriage(slug: string, identifier: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/triage/decline`;
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export function createTriageIssue(slug: string, teamKey: string, body: { title: string; description?: string; source?: string; priority?: number }): Promise<Issue> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Saved views --------------------------------------------------------

export interface SavedView {
  id: string;
  name: string;
  icon_color: string;
  base: "active" | "backlog" | "all";
  query: string;
  favorite: boolean;
  position: number;
  team_key: string | null;
}

export function listSavedViews(slug: string, teamKey?: string): Promise<SavedView[]> {
  const qs = teamKey ? `?team_key=${encodeURIComponent(teamKey)}` : "";
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/views${qs}`);
}

export function getSavedView(slug: string, viewId: string): Promise<SavedView> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/views/${encodeURIComponent(viewId)}`);
}

export function createSavedView(
  slug: string,
  body: { name: string; icon_color?: string; base?: string; query?: string; team_key?: string; favorite?: boolean }
): Promise<SavedView> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchSavedView(
  slug: string,
  viewId: string,
  body: Partial<{ name: string; icon_color: string; favorite: boolean; query: string; base: string }>
): Promise<SavedView> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/views/${encodeURIComponent(viewId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteSavedView(slug: string, viewId: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/views/${encodeURIComponent(viewId)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

// --- Global search ------------------------------------------------------

export interface SearchIssue {
  id: string;
  identifier: string;
  title: string;
  priority: 0 | 1 | 2 | 3 | 4;
  state_group: StateGroup;
  team_key: string;
}
export interface SearchProject {
  id: string;
  slug_id: string;
  name: string;
  icon_color: string;
  state: ProjectState;
}
export interface SearchTeam {
  id: string;
  key: string;
  name: string;
  icon_color: string;
}
export interface SearchInitiative {
  id: string;
  slug_id: string;
  name: string;
  icon_color: string;
  status: string;
}
export interface SearchDocument {
  id: string;
  slug_id: string;
  title: string;
  icon: string;
  project_name: string | null;
}
export interface SearchResults {
  issues: SearchIssue[];
  projects: SearchProject[];
  teams: SearchTeam[];
  members: Member[];
  views: SavedView[];
  initiatives: SearchInitiative[];
  documents: SearchDocument[];
}

export function workspaceSearch(slug: string, q: string, limit = 8): Promise<SearchResults> {
  const usp = new URLSearchParams({ q, limit: String(limit) });
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/search?${usp}`);
}

// --- Notifications -----------------------------------------------------

export type NotificationKind = "assigned" | "status_changed" | "commented" | "mentioned" | "subscribed";

export interface Notification {
  id: string;
  kind: NotificationKind;
  body: string | null;
  read_at: string | null;
  created_at: string;
  actor: Member | null;
  issue_identifier: string | null;
  issue_title: string | null;
}

export function listNotifications(slug: string, opts: { unreadOnly?: boolean; memberId?: string } = {}): Promise<Notification[]> {
  const usp = new URLSearchParams();
  if (opts.memberId) usp.set("member_id", opts.memberId);
  if (opts.unreadOnly) usp.set("unread_only", "true");
  const qs = usp.toString();
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notifications${qs ? `?${qs}` : ""}`);
}

export function getUnreadCount(slug: string, memberId?: string): Promise<{ unread: number }> {
  const qs = memberId ? `?member_id=${encodeURIComponent(memberId)}` : "";
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notifications/unread-count${qs}`);
}

export async function markNotificationRead(slug: string, id: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/notifications/${encodeURIComponent(id)}/read`;
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export async function markAllNotificationsRead(slug: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/notifications/read-all`;
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}
