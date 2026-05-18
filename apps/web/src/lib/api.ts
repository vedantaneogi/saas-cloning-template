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
  // Populated only by the workspace members-list endpoint.
  joined_at?: string | null;
  last_active_at?: string | null;
  team_keys?: string[];
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
  id?: string;
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
  created_at: string | null;
  updated_at: string;
  state: WorkflowState;
  team: Team;
  assignee: Member | null;
  creator: Member | null;
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
  // Filter-funnel metadata surfaced by `_issue_dict` so the my-issues
  // controls don't need a per-row detail fetch.
  subscriber_ids?: string[];
  has_relations?: boolean;
  link_count?: number;
}

export interface IssueDetail extends Issue {
  sub_issues: Issue[];
  relations: IssueRelation[];
  comments: Comment[];
  links: IssueLink[];
  subscribers?: Member[];
  subscribed?: boolean;
}

export type RelationKind = "blocks" | "blocked_by" | "related" | "duplicate";

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
  priority: 0 | 1 | 2 | 3 | 4;
  lead: Member | null;
  creator?: Member | null;
  start_date: string | null;
  target_date: string | null;
  issue_count: number;
  completed_issue_count: number;
  initiative_id: string | null;
  initiative_name: string | null;
  initiative_slug_id: string | null;
  team_keys?: string[];
  member_ids?: string[];
  label_ids?: string[];
  dependency_ids?: string[];
  template_id?: string | null;
  health?: "onTrack" | "atRisk" | "offTrack" | null;
  health_updated_at?: string | null;
  next_milestone?: { id: string; name: string; target_date: string | null } | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDetail extends Project {
  milestones: ProjectMilestone[];
  updates: ProjectUpdate[];
  members: Member[];
  resources?: ProjectResource[];
  teams?: Team[];
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

async function ssrCookieHeader(): Promise<string | null> {
  // Forward the inbound request's cookies to the backend during SSR/RSC.
  if (isBrowser) return null;
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const pairs = jar.getAll().map((c) => `${c.name}=${c.value}`);
    return pairs.length ? pairs.join("; ") : null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = API_BASE.replace(/\/$/, "") + path;
  const baseInit: RequestInit = { cache: "no-store", credentials: "include", ...init };
  if (!isBrowser) {
    const cookieHeader = await ssrCookieHeader();
    if (cookieHeader) {
      baseInit.headers = { ...(baseInit.headers as Record<string, string> | undefined), Cookie: cookieHeader };
    }
  }
  const res = await fetch(url, baseInit);
  if (!res.ok) {
    if (res.status === 401) throw new UnauthorizedError(url);
    if (res.status === 404) throw new NotFoundError(url);
    throw new Error(`API ${res.status} ${url}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class UnauthorizedError extends Error {
  constructor(url: string) {
    super(`Unauthorized: ${url}`);
  }
}

// Same as fetchJson but exported for client components that need an ad-hoc call.
export const fetchJsonForClient = fetchJson;

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

export function myIssues(
  slug: string,
  scope: string,
  opts: { completedWindow?: "day" | "week" | "month" | "all" } = {},
): Promise<Issue[]> {
  const usp = new URLSearchParams();
  if (opts.completedWindow && opts.completedWindow !== "all") {
    usp.set("completed_window", opts.completedWindow);
  }
  const qs = usp.toString();
  return fetchJson(
    `/api/workspaces/${encodeURIComponent(slug)}/my/${encodeURIComponent(scope)}${qs ? `?${qs}` : ""}`,
  );
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
  project_id?: string;
  cycle_id?: string;
  due_date?: string;
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

export function subscribeIssue(slug: string, identifier: string, memberId?: string): Promise<Member[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId ?? null }),
  });
}

export function unsubscribeIssue(slug: string, identifier: string, memberId?: string): Promise<Member[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId ?? null }),
  });
}

export function createIssueRelation(
  slug: string,
  identifier: string,
  body: { type: RelationKind; target_identifier: string }
): Promise<IssueRelation> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/relations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteIssueRelation(slug: string, identifier: string, relationId: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/issues/${encodeURIComponent(identifier)}/relations/${encodeURIComponent(relationId)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export interface ProjectResource {
  id: string;
  url: string;
  title: string;
  icon: string;
  created_at: string;
}

export function createProjectResource(slug: string, projectSlug: string, body: { url: string; title?: string; icon?: string }): Promise<ProjectResource> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteProjectResource(slug: string, projectSlug: string, resourceId: string): Promise<void> {
  const url = `${API_BASE.replace(/\/$/, "")}/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}/resources/${encodeURIComponent(resourceId)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

export function completeCycle(slug: string, cycleId: string, rolloverTo?: string | null): Promise<Cycle> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/cycles/${encodeURIComponent(cycleId)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rollover_to: rolloverTo ?? null }),
  });
}

export async function importTeamCsv(slug: string, teamKey: string, csv: string): Promise<{ created: number; identifiers: string[] }> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/issues/import-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
}

export function teamCsvExportUrl(slug: string, teamKey: string): string {
  return `/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/issues.csv`;
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
  body: { name: string; description?: string; state?: ProjectState; priority?: 0 | 1 | 2 | 3 | 4; icon_color?: string; lead_id?: string; start_date?: string; target_date?: string; member_ids?: string[] }
): Promise<Project> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createTeam(
  slug: string,
  body: { key: string; name: string; icon_color?: string; cycles_enabled?: boolean; estimate_scale?: string }
): Promise<Team> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface TeamPreference {
  team_key: string;
  favorite: boolean;
  sub_issue_added: boolean;
  sub_issue_resolved: boolean;
  sub_triage_added: boolean;
}

export function listTeamPreferences(slug: string): Promise<TeamPreference[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/team-preferences`, {
    cache: "no-store",
  });
}

export function patchTeamPreference(
  slug: string,
  teamKey: string,
  body: Partial<Omit<TeamPreference, "team_key">>,
): Promise<TeamPreference> {
  return fetchJson(
    `/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/preferences`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function leaveTeam(slug: string, teamKey: string): Promise<void> {
  await fetch(
    `/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/membership`,
    { method: "DELETE", credentials: "include" },
  );
}

export function createMilestone(
  slug: string,
  projectSlug: string,
  body: { name: string; target_date?: string; description?: string },
): Promise<ProjectMilestone> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchProject(
  slug: string,
  projectSlug: string,
  body: Partial<{ name: string; description: string; state: ProjectState; priority: 0 | 1 | 2 | 3 | 4; icon_color: string; lead_id: string; initiative_id: string; start_date: string; target_date: string; team_ids: string[]; member_ids: string[]; label_ids: string[]; dependency_ids: string[]; template_id: string; clear_start_date: boolean; clear_target_date: boolean; clear_lead: boolean; clear_initiative: boolean; clear_template: boolean }>
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
  scope?: "issues" | "projects";
  description?: string | null;
  query: string;
  favorite: boolean;
  position: number;
  team_key: string | null;
}

export function listSavedViews(slug: string, teamKey?: string, scope?: "issues" | "projects"): Promise<SavedView[]> {
  const params = new URLSearchParams();
  if (teamKey) params.set("team_key", teamKey);
  if (scope) params.set("scope", scope);
  const qs = params.toString();
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/views${qs ? `?${qs}` : ""}`);
}

export function getSavedView(slug: string, viewId: string): Promise<SavedView> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/views/${encodeURIComponent(viewId)}`);
}

export function createSavedView(
  slug: string,
  body: { name: string; icon_color?: string; base?: string; scope?: "issues" | "projects"; description?: string; query?: string; team_key?: string; favorite?: boolean }
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
  body: Partial<{ name: string; icon_color: string; favorite: boolean; query: string; base: string; description: string }>
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
  state_name: string;
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
  snoozed_until?: string | null;
  created_at: string;
  actor: Member | null;
  issue_identifier: string | null;
  issue_title: string | null;
  // Filter-friendly metadata pulled from the linked issue.
  team_key?: string | null;
  project_id?: string | null;
  initiative_id?: string | null;
  priority?: number | null;
  state_group?: string | null;
}

export function listNotifications(
  slug: string,
  opts: { unreadOnly?: boolean; includeSnoozed?: boolean; memberId?: string } = {},
): Promise<Notification[]> {
  const usp = new URLSearchParams();
  if (opts.memberId) usp.set("member_id", opts.memberId);
  if (opts.unreadOnly) usp.set("unread_only", "true");
  if (opts.includeSnoozed) usp.set("include_snoozed", "true");
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
  const res = await fetch(url, { method: "POST", cache: "no-store", credentials: "include" });
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status} ${url}`);
}

// --- Auth ---------------------------------------------------------------

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  color: string;
}

export interface WorkspaceMembership {
  id: string;
  slug: string;
  name: string;
  icon_color: string;
  role: MemberRole;
}

export interface Me {
  user: CurrentUser;
  workspaces: WorkspaceMembership[];
}

export function getMe(): Promise<Me> {
  return fetchJson(`/api/auth/me`);
}

export function login(email: string, password: string): Promise<Me> {
  return fetchJson(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function signup(body: { email: string; password: string; name: string; workspace_name?: string }): Promise<Me> {
  return fetchJson(`/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function logout(): Promise<void> {
  await fetchJson(`/api/auth/logout`, { method: "POST" });
}

export interface InviteSummary {
  workspace_name: string;
  workspace_slug: string;
  email: string;
  role: string;
  expires_at: string;
  needs_signup: boolean;
}

export function getInviteSummary(token: string): Promise<InviteSummary> {
  return fetchJson(`/api/auth/invites/${encodeURIComponent(token)}`);
}

export function acceptInvite(token: string, body?: { email: string; password: string; name: string }): Promise<Me> {
  return fetchJson(`/api/auth/invites/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "null",
  });
}

// --- Workspace creation + invite management ------------------------------

export function createWorkspace(body: { name: string; slug?: string; icon_color?: string; team_key?: string; team_name?: string }): Promise<Workspace> {
  return fetchJson(`/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  accept_url: string;
  expires_at: string;
  created_at: string;
  team_keys?: string[];
}

export function listInvites(slug: string): Promise<PendingInvite[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/invites`);
}

export function createInvite(
  slug: string,
  body: { email: string; role: MemberRole; team_keys?: string[] },
): Promise<PendingInvite> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function revokeInvite(slug: string, inviteId: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
}

// --- analytics -------------------------------------------------------------

export interface BurndownPoint { date: string; scope: number; done: number; remaining: number }
export interface BurndownIdealPoint { date: string; remaining: number }
export interface CycleBurndown {
  cycle_number: number;
  cycle_name: string;
  starts_at: string | null;
  ends_at: string | null;
  total_estimate: number;
  points: BurndownPoint[];
  ideal: BurndownIdealPoint[];
}

export async function getCycleBurndown(slug: string, teamKey: string, number: number): Promise<CycleBurndown> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/cycles/${number}/burndown`);
}

export interface CycleInsights {
  cycle_number: number;
  issues_total: number;
  issues_completed: number;
  completion_rate: number;
  velocity: number;
  scope_estimate: number;
  scope_changes: number;
}

export async function getCycleInsights(slug: string, teamKey: string, number: number): Promise<CycleInsights> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/cycles/${number}/insights`);
}

export interface ProjectCompletion {
  project_id: string;
  points: { date: string; total: number; done: number }[];
  total: number;
  done: number;
  health: "onTrack" | "atRisk" | "offTrack";
}

export async function getProjectCompletion(slug: string, projectSlug: string): Promise<ProjectCompletion> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectSlug)}/completion`);
}

export interface TeamInsights {
  window_days: number;
  throughput: number;
  velocity_points: number;
  avg_lead_time_days: number;
  open_issues: number;
  per_cycle_velocity: { cycle_number: number; name: string | null; velocity: number }[];
}

export async function getTeamInsights(slug: string, teamKey: string, days = 30): Promise<TeamInsights> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/insights?days=${days}`);
}

// --- templates -------------------------------------------------------------

export type TemplateKind = "issue" | "project" | "document";

export interface IssueTemplateBody {
  title?: string;
  description?: string;
  priority?: 0 | 1 | 2 | 3 | 4;
  label_ids?: string[];
  estimate?: number | null;
  state_id?: string | null;
}
export interface ProjectMilestoneTemplate {
  name: string;
  target_date_offset_days?: number | null;
}
export interface ProjectTemplateBody {
  name?: string;
  description?: string;
  icon_color?: string;
  milestones?: ProjectMilestoneTemplate[];
}
export interface DocumentTemplateBody {
  title?: string;
  body?: string;
  icon?: string | null;
}

export interface Template {
  id: string;
  kind: TemplateKind;
  name: string;
  description: string | null;
  team_id: string | null;
  team_key: string | null;
  body: IssueTemplateBody | ProjectTemplateBody | DocumentTemplateBody;
  created_at: string;
}

export async function listTemplates(slug: string, opts: { kind?: TemplateKind; teamKey?: string } = {}): Promise<Template[]> {
  const params = new URLSearchParams();
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.teamKey) params.set("team_key", opts.teamKey);
  const qs = params.toString();
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/templates${qs ? `?${qs}` : ""}`);
}

export async function createTemplate(slug: string, input: { kind: TemplateKind; name: string; description?: string; team_key?: string; body: Record<string, unknown> }): Promise<Template> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/templates`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTemplate(slug: string, id: string, patch: { name?: string; description?: string; body?: Record<string, unknown> }): Promise<Template> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteTemplate(slug: string, id: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// --- automations -----------------------------------------------------------

export type AutomationTrigger = "on_issue_create" | "on_status_change" | "on_label_added" | "on_cycle_end" | "stale_in_state" | "due_date_passed";
export type AutomationAction = "move_to_state" | "assign_to_member" | "add_label" | "add_comment" | "archive" | "set_priority" | "rotate_assign";

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  team_id: string | null;
  team_key: string | null;
  trigger: AutomationTrigger;
  trigger_config: Record<string, unknown>;
  action: AutomationAction;
  action_config: Record<string, unknown>;
  created_at: string;
}

export async function listAutomations(slug: string): Promise<Automation[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/automations`);
}

export async function createAutomation(slug: string, body: {
  name: string;
  team_key?: string;
  trigger: AutomationTrigger;
  trigger_config?: Record<string, unknown>;
  action: AutomationAction;
  action_config?: Record<string, unknown>;
  enabled?: boolean;
}): Promise<Automation> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/automations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAutomation(slug: string, id: string, patch: {
  name?: string;
  enabled?: boolean;
  trigger_config?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
}): Promise<Automation> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/automations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteAutomation(slug: string, id: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/automations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function runScheduledAutomations(slug: string): Promise<{ applied: number; by_rule: Record<string, number> }> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/automations/run-scheduled`, { method: "POST" });
}

// --- notifications: snooze + prefs + digest -------------------------------

export async function snoozeNotification(slug: string, id: string, minutes: number): Promise<{ id: string; snoozed_until: string }> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notifications/${encodeURIComponent(id)}/snooze`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
}

export async function unsnoozeNotification(slug: string, id: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notifications/${encodeURIComponent(id)}/unsnooze`, { method: "POST" });
}

export interface NotificationPreference {
  id: string;
  scope_type: "team" | "project" | "workspace";
  scope_id: string;
  muted: boolean;
}

export async function listNotificationPrefs(slug: string): Promise<NotificationPreference[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notification-preferences`);
}

export async function upsertNotificationPref(slug: string, body: { scope_type: "team" | "project" | "workspace"; scope_id: string; muted: boolean }): Promise<NotificationPreference> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notification-preferences`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteNotificationPref(slug: string, id: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notification-preferences/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface NotificationDigest {
  period: "daily" | "weekly";
  count: number;
  html: string;
  items: unknown[];
}

export async function getDigest(slug: string, period: "daily" | "weekly" = "daily"): Promise<NotificationDigest> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/notifications/digest?period=${period}`);
}

// --- document comments + versions -----------------------------------------

export interface DocumentComment {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author: Member | null;
}

export async function listDocComments(slug: string, docSlug: string): Promise<DocumentComment[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}/comments`);
}

export async function createDocComment(slug: string, docSlug: string, body: { body: string; parent_id?: string }): Promise<DocumentComment> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteDocComment(slug: string, docSlug: string, commentId: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

export interface DocumentVersion {
  id: string;
  version: number;
  title: string;
  body: string;
  created_at: string;
  author: Member | null;
}

export async function listDocVersions(slug: string, docSlug: string): Promise<DocumentVersion[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}/versions`);
}

export async function restoreDocVersion(slug: string, docSlug: string, versionId: string): Promise<Document> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/documents/${encodeURIComponent(docSlug)}/versions/${encodeURIComponent(versionId)}/restore`, { method: "POST" });
}

// --- workspace integrations ----------------------------------------------

export type IntegrationKind = "github" | "slack" | "figma";

export interface Integration {
  id: string;
  kind: IntegrationKind;
  enabled: boolean;
  config: Record<string, string | null>;
  created_at: string;
}

export async function listIntegrations(slug: string): Promise<Integration[]> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/integrations`);
}

export async function upsertIntegration(slug: string, body: { kind: IntegrationKind; config?: Record<string, unknown>; enabled?: boolean }): Promise<Integration> {
  return fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/integrations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteIntegration(slug: string, id: string): Promise<void> {
  await fetchJson(`/api/workspaces/${encodeURIComponent(slug)}/integrations/${encodeURIComponent(id)}`, { method: "DELETE" });
}
