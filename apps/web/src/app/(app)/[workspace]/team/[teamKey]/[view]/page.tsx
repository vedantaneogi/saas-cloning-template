import { notFound } from "next/navigation";
import { IssueListBody } from "@/components/issue-list-body";
import { BoardView } from "@/components/board-view";
import { FilterBar } from "@/components/filter-bar";
import { TeamIssuesHeader } from "@/components/team-issues-header";
import { getSavedView, getWorkspace, NotFoundError, type Issue, type SavedView, type StateGroup, type Team } from "@/lib/api";

const VIEWS = {
  active: { label: "Active" },
  backlog: { label: "Backlog" },
  all: { label: "All issues" },
};

type ViewKey = keyof typeof VIEWS;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TeamIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; teamKey: string; view: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { workspace, teamKey, view } = await params;
  if (!(view in VIEWS)) notFound();
  const sp = await searchParams;
  const display = (sp.display as string) || "list";
  const group = (sp.group as string) || "state";
  const sort = (sp.sort as string) || "default";
  const viewId = typeof sp.view_id === "string" ? sp.view_id : null;

  let savedView: SavedView | null = null;
  if (viewId) {
    savedView = await getSavedView(workspace, viewId).catch(() => null);
  }

  const buildFilters = () => {
    const fetchParams: any = { view: view as ViewKey };
    for (const k of ["priority", "label", "assignee", "state", "project"]) {
      if (sp[k]) fetchParams[k] = sp[k];
    }
    fetchParams.sort = sort;
    return fetchParams;
  };

  let issues: Issue[];
  let team: Team | undefined;
  try {
    const [issuesRes, ws] = await Promise.all([
      listTeamIssuesWithParams(workspace, teamKey, buildFilters()),
      getWorkspace(workspace).catch(() => null),
    ]);
    issues = issuesRes;
    team = ws?.teams.find((t) => t.key === teamKey);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  if (!team) notFound();

  const groups = groupIssues(issues, group);

  return (
    <>
      <TeamIssuesHeader
        workspace={workspace}
        team={team}
        view={view as "active" | "backlog" | "all"}
        savedView={savedView}
      />
      <FilterBar workspaceSlug={workspace} teamKey={teamKey} />
      {display === "board" ? (
        <div className="flex-1 overflow-hidden">
          <BoardView groups={groups} workspaceSlug={workspace} teamKey={teamKey} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <IssueListBody groups={groups} workspaceSlug={workspace} teamKey={teamKey} />
        </div>
      )}
    </>
  );
}

// Build the API call with extra params
async function listTeamIssuesWithParams(slug: string, teamKey: string, p: Record<string, any>): Promise<Issue[]> {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const url = `/api/workspaces/${encodeURIComponent(slug)}/teams/${encodeURIComponent(teamKey)}/issues?${usp}`;
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000";
  const res = await fetch(base.replace(/\/$/, "") + url, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError(url);
    throw new Error(`API ${res.status} ${url}`);
  }
  return res.json();
}

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];

function groupIssues(issues: Issue[], by: string): { name: string; group: StateGroup; issues: Issue[] }[] {
  if (by === "none") return [{ name: "All", group: "started", issues }];
  if (by === "priority") {
    const groups = new Map<number, Issue[]>();
    for (const i of issues) {
      if (!groups.has(i.priority)) groups.set(i.priority, []);
      groups.get(i.priority)!.push(i);
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : a[0] - b[0]))
      .map(([p, list]) => ({ name: PRIORITY_LABELS[p], group: "started" as StateGroup, issues: list }));
  }
  if (by === "assignee") {
    const groups = new Map<string, { name: string; issues: Issue[] }>();
    for (const i of issues) {
      const key = i.assignee?.id ?? "unassigned";
      const name = i.assignee?.name ?? "Unassigned";
      if (!groups.has(key)) groups.set(key, { name, issues: [] });
      groups.get(key)!.issues.push(i);
    }
    return [...groups.values()].map((g) => ({ name: g.name, group: "started" as StateGroup, issues: g.issues }));
  }
  if (by === "project") {
    const groups = new Map<string, { name: string; issues: Issue[] }>();
    for (const i of issues) {
      const key = i.project_id ?? "none";
      const name = i.project_name ?? "No project";
      if (!groups.has(key)) groups.set(key, { name, issues: [] });
      groups.get(key)!.issues.push(i);
    }
    return [...groups.values()].map((g) => ({ name: g.name, group: "started" as StateGroup, issues: g.issues }));
  }
  if (by === "label") {
    const groups = new Map<string, { name: string; issues: Issue[] }>();
    for (const i of issues) {
      if (i.labels.length === 0) {
        const key = "_none";
        if (!groups.has(key)) groups.set(key, { name: "No labels", issues: [] });
        groups.get(key)!.issues.push(i);
        continue;
      }
      for (const l of i.labels) {
        if (!groups.has(l.id)) groups.set(l.id, { name: l.name, issues: [] });
        groups.get(l.id)!.issues.push(i);
      }
    }
    return [...groups.values()].map((g) => ({ name: g.name, group: "started" as StateGroup, issues: g.issues }));
  }
  // default: by state name (preserves group color)
  const byStateName = new Map<string, { name: string; group: StateGroup; position: number; issues: Issue[] }>();
  for (const issue of issues) {
    const key = issue.state.name;
    if (!byStateName.has(key)) {
      byStateName.set(key, { name: issue.state.name, group: issue.state.group, position: issue.state.position, issues: [] });
    }
    byStateName.get(key)!.issues.push(issue);
  }
  return [...byStateName.values()].sort((a, b) => a.position - b.position);
}
