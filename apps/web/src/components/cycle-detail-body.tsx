"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CirclePlay, FileText, Plus } from "lucide-react";
import { BoardView } from "@/components/board-view";
import { IssueListBody } from "@/components/issue-list-body";
import { CycleInfoPanel } from "@/components/cycle-info-panel";
import { useCyclePrefs } from "@/lib/cycle-prefs";
import { useHydrated } from "@/lib/use-hydrated";
import type { Cycle, Issue, StateGroup, Team } from "@/lib/api";

/**
 * Client body for /cycle/[cycleId]. Responsibilities:
 *   - Read filter URL params (priority/state/assignee/label/project/
 *     search) populated by CycleControls and apply them client-side
 *     to the server-rendered issue list.
 *   - Read display prefs (view / grouping / ordering) from
 *     cycle-prefs.ts to decide list vs. board + how to group.
 *   - When the (filtered) cycle has no issues, render the empty-state
 *     hero from image #16 — play-circle graphic + cycle title +
 *     description + Create new issue / Documentation buttons.
 *   - When prefs.right_panel_open, mount the right CycleInfoPanel.
 */
export function CycleDetailBody({
  workspaceSlug,
  team,
  cycle,
  issues,
}: {
  workspaceSlug: string;
  team: Team;
  cycle: Cycle;
  issues: Issue[];
}) {
  const searchParams = useSearchParams();
  const { prefs } = useCyclePrefs(workspaceSlug, cycle.id);
  const hydrated = useHydrated();

  // Until hydration completes, render the server-stable defaults to keep
  // SSR and client trees in lock-step (cycle-prefs hydrates from
  // localStorage and would otherwise mismatch on a warm cache).
  const view = hydrated ? prefs.view : "list";
  const ordering = hydrated ? prefs.ordering : "manual";
  const grouping = hydrated ? prefs.grouping : "state";

  const filtered = useMemo(() => filterIssues(issues, searchParams), [issues, searchParams]);
  const sorted = useMemo(() => sortIssues(filtered, ordering), [filtered, ordering]);
  const groups = useMemo(() => groupIssues(sorted, grouping), [sorted, grouping]);

  const hasIssues = sorted.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={view === "board" ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}>
        {hasIssues ? (
          view === "board" ? (
            <BoardView groups={groups} workspaceSlug={workspaceSlug} teamKey={cycle.team_key} />
          ) : (
            <IssueListBody groups={groups} workspaceSlug={workspaceSlug} teamKey={cycle.team_key} />
          )
        ) : (
          <EmptyState workspaceSlug={workspaceSlug} cycle={cycle} team={team} hasFiltersApplied={issues.length > 0} />
        )}
      </div>
      {hydrated && prefs.right_panel_open && (
        <CycleInfoPanel
          workspaceSlug={workspaceSlug}
          team={team}
          cycle={cycle}
          issues={issues}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — matches image #16: play-circle hero + cycle name + buttons.
// ---------------------------------------------------------------------------

function EmptyState({
  workspaceSlug,
  cycle,
  team,
  hasFiltersApplied,
}: {
  workspaceSlug: string;
  cycle: Cycle;
  team: Team;
  hasFiltersApplied: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center px-8 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-pill border border-dashed border-border-strong" />
          <CirclePlay size={48} strokeWidth={1.25} className="text-text-tertiary" />
        </div>
        <h2 className="text-h2 font-semibold text-text-primary">{cycle.name}</h2>
        <p className="mt-2 text-small text-text-secondary">
          {hasFiltersApplied
            ? "No issues match the current filters."
            : cycle.description
              ? cycle.description
              : "Pull issues into this cycle to plan your team's work. Issues you complete during this cycle's date range will count toward its progress."}
        </p>
        {!hasFiltersApplied && (
          <div className="mt-5 flex items-center gap-2">
            <Link
              href={`/${workspaceSlug}/team/${team.key}/active?new=1&cycle=${cycle.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90"
            >
              <Plus size={12} />
              Create new issue
              <kbd className="ml-1 rounded-sm border border-white/30 bg-white/10 px-1 text-[10px] font-mono">C</kbd>
            </Link>
            <a
              href="https://linear.app/docs/cycles"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
            >
              <FileText size={12} />
              Documentation
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL-driven filter funnel — same shape as my-issues / team-issues so the
// chip filters from CycleControls Just Work.
// ---------------------------------------------------------------------------

type SP = ReturnType<typeof useSearchParams>;

function filterIssues(issues: Issue[], sp: SP): Issue[] {
  if (!sp) return issues;
  const priorities = listParam(sp, "priority");
  const states = listParam(sp, "state");
  const assignees = listParam(sp, "assignee");
  const labels = listParam(sp, "label");
  const projects = listParam(sp, "project");
  const search = (sp.get("search") ?? "").trim().toLowerCase();

  return issues.filter((i) => {
    if (priorities.length > 0 && !priorities.includes(String(i.priority))) return false;
    if (states.length > 0 && !states.includes(i.state.id)) return false;
    if (assignees.length > 0) {
      const id = i.assignee?.id ?? "_unassigned";
      if (!assignees.includes(id)) return false;
    }
    if (labels.length > 0 && !i.labels.some((l) => labels.includes(l.id))) return false;
    if (projects.length > 0 && !projects.includes(i.project_id ?? "_none")) return false;
    if (search) {
      const hay = `${i.title} ${i.description ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function listParam(sp: NonNullable<SP>, key: string): string[] {
  const v = sp.get(key);
  return v ? v.split(",").filter(Boolean) : [];
}

// ---------------------------------------------------------------------------
// Sort + group
// ---------------------------------------------------------------------------

function createdMs(i: Issue): number {
  return i.created_at ? new Date(i.created_at).getTime() : 0;
}

function sortIssues(issues: Issue[], ordering: string): Issue[] {
  const list = [...issues];
  switch (ordering) {
    case "priority":
      list.sort((a, b) => (a.priority === 0 ? 99 : a.priority) - (b.priority === 0 ? 99 : b.priority));
      break;
    case "newest":
      list.sort((a, b) => createdMs(b) - createdMs(a));
      break;
    case "oldest":
      list.sort((a, b) => createdMs(a) - createdMs(b));
      break;
    case "updated":
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
    case "due":
      list.sort((a, b) => {
        const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
      break;
    default:
      // manual — preserve incoming order
      break;
  }
  return list;
}

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];

function groupIssues(
  issues: Issue[],
  by: string,
): { name: string; group: StateGroup; issues: Issue[] }[] {
  if (by === "no_grouping") return [{ name: "All", group: "started", issues }];
  if (by === "priority") {
    const map = new Map<number, Issue[]>();
    for (const i of issues) {
      if (!map.has(i.priority)) map.set(i.priority, []);
      map.get(i.priority)!.push(i);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : a[0] - b[0]))
      .map(([p, list]) => ({ name: PRIORITY_LABELS[p], group: "started" as StateGroup, issues: list }));
  }
  if (by === "assignee") {
    const map = new Map<string, { name: string; issues: Issue[] }>();
    for (const i of issues) {
      const key = i.assignee?.id ?? "unassigned";
      const name = i.assignee?.name ?? "Unassigned";
      if (!map.has(key)) map.set(key, { name, issues: [] });
      map.get(key)!.issues.push(i);
    }
    return [...map.values()].map((g) => ({ name: g.name, group: "started" as StateGroup, issues: g.issues }));
  }
  if (by === "project") {
    const map = new Map<string, { name: string; issues: Issue[] }>();
    for (const i of issues) {
      const key = i.project_id ?? "none";
      const name = i.project_name ?? "No project";
      if (!map.has(key)) map.set(key, { name, issues: [] });
      map.get(key)!.issues.push(i);
    }
    return [...map.values()].map((g) => ({ name: g.name, group: "started" as StateGroup, issues: g.issues }));
  }
  if (by === "label") {
    const map = new Map<string, { name: string; issues: Issue[] }>();
    for (const i of issues) {
      if (i.labels.length === 0) {
        const key = "_none";
        if (!map.has(key)) map.set(key, { name: "No labels", issues: [] });
        map.get(key)!.issues.push(i);
        continue;
      }
      for (const l of i.labels) {
        if (!map.has(l.id)) map.set(l.id, { name: l.name, issues: [] });
        map.get(l.id)!.issues.push(i);
      }
    }
    return [...map.values()].map((g) => ({ name: g.name, group: "started" as StateGroup, issues: g.issues }));
  }
  // default — by state name
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
