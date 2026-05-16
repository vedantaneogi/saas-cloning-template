"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { BoardView } from "@/components/board-view";
import { IssueRow } from "@/components/issue-row";
import { MyIssuesInsights } from "@/components/my-issues-insights";
import { useMyIssuesPrefs, type MyIssuesGrouping } from "@/lib/my-issues-prefs";
import { myIssues, type Issue, type Label, type Member, type Project, type StateGroup, type Team } from "@/lib/api";

interface GroupBucket {
  key: string;
  title: string;
  count: number;
  issues: Issue[];
}

/**
 * Client body for /[workspace]/my/[scope]. Owns:
 *   - re-fetching when `completed_window` changes (server takes that
 *     param so the wire payload shrinks when the user picks "past day")
 *   - applying filter prefs (status / priority / labels / project / cycle)
 *   - grouping rows per the display popover's Grouping pick
 *   - ordering per Ordering pick (importance / priority / newest /
 *     oldest / updated)
 *   - passing column-visibility flags into <IssueRow>
 *
 * Sub-grouping and Board view are tracked in prefs but not yet rendered
 * here — they fall back to single-level grouping / list layout.
 */
export function MyIssuesBody({
  workspaceSlug,
  scope,
  initial,
  projects,
  members,
  labels,
  teams,
}: {
  workspaceSlug: string;
  scope: string;
  initial: Issue[];
  projects: Project[];
  members: Member[];
  labels: Label[];
  teams: Team[];
}) {
  const router = useRouter();
  const { prefs, update } = useMyIssuesPrefs(workspaceSlug);
  const [issues, setIssues] = useState<Issue[]>(initial);

  // The completed-issues window is the only pref the server cares about
  // — refetch when it flips so we don't ship completed work the user
  // explicitly hid. Everything else is filtered client-side from this
  // bounded slice (a single user's relevant issues).
  useEffect(() => {
    let cancelled = false;
    myIssues(workspaceSlug, scope, { completedWindow: prefs.completed_window })
      .then((rows) => {
        if (!cancelled) setIssues(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, scope, prefs.completed_window]);

  // Sync with initial on scope navigation, before the useEffect refetch
  // completes — keeps the page responsive when the user clicks tabs.
  useEffect(() => {
    setIssues(initial);
  }, [initial]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = prefs.search_query.trim().toLowerCase();
    return issues.filter((n) => {
      if (prefs.status_groups.length > 0 && !prefs.status_groups.includes(n.state.group)) return false;
      if (prefs.priorities.length > 0 && !prefs.priorities.includes(n.priority)) return false;
      if (prefs.label_ids.length > 0) {
        const ids = n.labels.map((l) => l.id);
        if (!prefs.label_ids.some((id) => ids.includes(id))) return false;
      }
      if (prefs.project_ids.length > 0) {
        if (!n.project_id || !prefs.project_ids.includes(n.project_id)) return false;
      }
      if (prefs.cycle_ids.length > 0) {
        if (!n.cycle_id || !prefs.cycle_ids.includes(n.cycle_id)) return false;
      }
      if (prefs.assignee_ids.length > 0) {
        if (!n.assignee || !prefs.assignee_ids.includes(n.assignee.id)) return false;
      }
      if (prefs.creator_ids.length > 0) {
        if (!n.creator || !prefs.creator_ids.includes(n.creator.id)) return false;
      }
      if (prefs.subscriber_ids.length > 0) {
        const subs = n.subscriber_ids ?? [];
        if (!prefs.subscriber_ids.some((id) => subs.includes(id))) return false;
      }
      if (prefs.date_filter !== "any") {
        const due = n.due_date ? new Date(n.due_date).getTime() : null;
        if (prefs.date_filter === "due" && due == null) return false;
        if (prefs.date_filter === "no_due" && due != null) return false;
        if (prefs.date_filter === "overdue" && (due == null || due >= now)) return false;
      }
      if (prefs.relations_filter !== "any") {
        const has = Boolean(n.has_relations);
        if (prefs.relations_filter === "with_relations" && !has) return false;
        if (prefs.relations_filter === "no_relations" && has) return false;
      }
      if (prefs.links_filter !== "any") {
        const has = (n.link_count ?? 0) > 0;
        if (prefs.links_filter === "with_links" && !has) return false;
        if (prefs.links_filter === "no_links" && has) return false;
      }
      if (q) {
        const title = n.title.toLowerCase();
        const desc = (n.description ?? "").toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [
    issues,
    prefs.status_groups,
    prefs.priorities,
    prefs.label_ids,
    prefs.project_ids,
    prefs.cycle_ids,
    prefs.assignee_ids,
    prefs.creator_ids,
    prefs.subscriber_ids,
    prefs.date_filter,
    prefs.relations_filter,
    prefs.links_filter,
    prefs.search_query,
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort(makeComparator(prefs.ordering, prefs.order_completed_by_recency));
    return arr;
  }, [filtered, prefs.ordering, prefs.order_completed_by_recency]);

  const groups = useMemo(
    () => groupIssues(sorted, prefs.grouping, projects, members),
    [sorted, prefs.grouping, projects, members],
  );

  const display = {
    id: prefs.show_id,
    status: prefs.show_status,
    assignee: prefs.show_assignee,
    priority: prefs.show_priority,
    due_date: prefs.show_due_date,
    labels: prefs.show_labels,
    updated: prefs.show_updated,
  };

  const showInsights = prefs.insights_open;
  const isBoard = prefs.view === "board";

  // Board view groups by status name regardless of the grouping pref —
  // a kanban only makes sense when columns map to states. (Linear does
  // the same: switching to Board re-buckets by status; the Grouping
  // dropdown still records the user's list-mode pick but doesn't drive
  // the columns.) Columns the user explicitly hid stay out.
  const boardGroups = useMemo(() => {
    if (!isBoard) return [];
    const hidden = new Set(prefs.hidden_status_groups);
    return bucketByStatusName(sorted).filter((g) => !hidden.has(g.group));
  }, [isBoard, sorted, prefs.hidden_status_groups]);

  function hideColumn(group: string) {
    const next = prefs.hidden_status_groups.includes(group)
      ? prefs.hidden_status_groups
      : [...prefs.hidden_status_groups, group];
    update({ hidden_status_groups: next });
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {sorted.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-small text-text-tertiary">
            No issues match the current view.
          </div>
        ) : isBoard ? (
          <BoardView
            groups={boardGroups}
            workspaceSlug={workspaceSlug}
            onHideColumn={(g) => hideColumn(g)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {groups.map((g) => (
              <GroupSection key={g.key} group={g} workspaceSlug={workspaceSlug} display={display} />
            ))}
          </div>
        )}
      </div>
      {showInsights && (
        <MyIssuesInsights
          workspaceSlug={workspaceSlug}
          issues={sorted}
          labels={labels}
          projects={projects}
          teams={teams}
          members={members}
        />
      )}
    </div>
  );

  // Keep router referenced — mutations from inside this body will use
  // router.refresh() when they land.
  void router;
}

function GroupSection({
  group,
  workspaceSlug,
  display,
}: {
  group: GroupBucket;
  workspaceSlug: string;
  display: import("@/components/issue-row").IssueRowDisplay;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-white/5 last:border-b-0">
      {/*
        Glass-style group header to keep List + Board visually
        consistent — translucent white tint + heavy blur over the
        page bg, hairline divider below.
      */}
      <button
        onClick={() => setOpen(!open)}
        className="group flex h-[40px] w-full items-center gap-2 border-b border-white/5 bg-white/[0.025] px-4 text-small text-text-secondary backdrop-blur-md hover:bg-white/[0.04]"
      >
        <ChevronDown size={12} className={clsx("text-text-tertiary transition-transform", !open && "-rotate-90")} />
        <span className="font-semibold text-text-primary">{group.title}</span>
        <span className="text-text-tertiary">{group.count}</span>
      </button>
      {open && (
        <div>
          {group.issues.map((issue) => (
            <IssueRow
              key={issue.identifier}
              issue={issue}
              workspaceSlug={workspaceSlug}
              dim={issue.state.group === "completed" || issue.state.group === "canceled"}
              display={display}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Grouping + ordering helpers
// ---------------------------------------------------------------------------

const PRIORITY_LABEL: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  0: "No priority",
};

// Importance ranking — lower is "more urgent / more active". Used by
// Focus grouping and the Importance ordering. Mirrors Linear's bucketing:
// urgent issues first, then everything that's been started, then the
// rest of active work, then completed/canceled at the bottom.
function importanceBucket(issue: Issue): number {
  if (issue.priority === 1) return 0; // urgent
  if (issue.state.group === "started") return 1;
  if (issue.state.group === "backlog" || issue.state.group === "unstarted") return 2;
  if (issue.state.group === "completed") return 3;
  return 4; // canceled
}

function makeComparator(
  ordering: "importance" | "priority" | "newest" | "oldest" | "updated",
  completedByRecency: boolean,
) {
  return (a: Issue, b: Issue) => {
    // When `order_completed_by_recency` is on, push completed/canceled
    // out of the priority/importance flow and sort them by updated_at
    // among themselves.
    if (completedByRecency) {
      const aDone = a.state.group === "completed" || a.state.group === "canceled";
      const bDone = b.state.group === "completed" || b.state.group === "canceled";
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (aDone && bDone) {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    }
    if (ordering === "importance") {
      const aB = importanceBucket(a);
      const bB = importanceBucket(b);
      if (aB !== bB) return aB - bB;
      if (a.priority !== b.priority) return (priorityRank(a.priority) - priorityRank(b.priority));
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    if (ordering === "priority") {
      return priorityRank(a.priority) - priorityRank(b.priority);
    }
    if (ordering === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (ordering === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  };
}

function priorityRank(p: number) {
  // 1 (urgent) < 2 (high) < 3 (medium) < 4 (low) < 0 (no priority)
  return p === 0 ? 99 : p;
}

function groupIssues(
  issues: Issue[],
  grouping: MyIssuesGrouping,
  projects: Project[],
  members: Member[],
): GroupBucket[] {
  if (grouping === "no_grouping") {
    return [{ key: "all", title: "All issues", count: issues.length, issues }];
  }

  const buckets = new Map<string, GroupBucket>();

  function bucket(key: string, title: string, issue: Issue) {
    if (!buckets.has(key)) buckets.set(key, { key, title, count: 0, issues: [] });
    const b = buckets.get(key)!;
    b.issues.push(issue);
    b.count += 1;
  }

  for (const issue of issues) {
    switch (grouping) {
      case "focus": {
        const b = importanceBucket(issue);
        const key = `focus-${b}`;
        const title = FOCUS_TITLES[b] ?? "Other";
        bucket(key, title, issue);
        break;
      }
      case "status":
        bucket(`status-${issue.state.id}`, issue.state.name, issue);
        break;
      case "priority":
        bucket(`priority-${issue.priority}`, PRIORITY_LABEL[issue.priority] ?? "—", issue);
        break;
      case "assignee": {
        const a = issue.assignee;
        const key = a ? `assignee-${a.id}` : "assignee-none";
        const title = a ? a.name : "No assignee";
        bucket(key, title, issue);
        break;
      }
      case "project": {
        const p = projects.find((proj) => proj.id === issue.project_id);
        const key = p ? `project-${p.id}` : "project-none";
        const title = p ? p.name : "No project";
        bucket(key, title, issue);
        break;
      }
      case "labels": {
        if (issue.labels.length === 0) {
          bucket("labels-none", "No labels", issue);
        } else {
          for (const l of issue.labels) bucket(`label-${l.id}`, l.name, issue);
        }
        break;
      }
      case "cycle": {
        const key = issue.cycle_id ? `cycle-${issue.cycle_id}` : "cycle-none";
        const title = issue.cycle_id ? "Cycle" : "No cycle";
        bucket(key, title, issue);
        break;
      }
      default:
        bucket("all", "All issues", issue);
    }
  }

  void members; // available for future "Assignee" sort decoration

  // Render order matches the source bucket order — for focus we want
  // urgent → started → active → completed → canceled.
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

const FOCUS_TITLES: Record<number, string> = {
  0: "Urgent issues",
  1: "In progress",
  2: "Other active",
  3: "Completed",
  4: "Canceled",
};

const STATE_GROUP_ORDER: Record<string, number> = {
  backlog: 0,
  unstarted: 1,
  started: 2,
  completed: 3,
  canceled: 4,
};

/**
 * Group an issue list into board columns keyed by the issue's state
 * (name + group). Across teams there can be multiple state names for
 * the same group (e.g. "Todo" and "Open" both `unstarted`); we treat
 * each unique state name as its own column so cross-team work isn't
 * silently collapsed.
 */
function bucketByStatusName(issues: Issue[]): { name: string; group: StateGroup; issues: Issue[] }[] {
  const map = new Map<string, { name: string; group: StateGroup; issues: Issue[]; sort: number }>();
  for (const i of issues) {
    const key = `${STATE_GROUP_ORDER[i.state.group] ?? 9}-${i.state.name}`;
    if (!map.has(key)) {
      map.set(key, {
        name: i.state.name,
        group: i.state.group,
        issues: [],
        sort: (STATE_GROUP_ORDER[i.state.group] ?? 9) * 1000 + i.state.position,
      });
    }
    map.get(key)!.issues.push(i);
  }
  return [...map.values()].sort((a, b) => a.sort - b.sort);
}
