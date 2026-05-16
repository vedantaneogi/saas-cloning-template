"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { IssueRow } from "@/components/issue-row";
import { useMyIssuesPrefs, type MyIssuesGrouping } from "@/lib/my-issues-prefs";
import { myIssues, type Issue, type Member, type Project } from "@/lib/api";

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
}: {
  workspaceSlug: string;
  scope: string;
  initial: Issue[];
  projects: Project[];
  members: Member[];
}) {
  const router = useRouter();
  const { prefs } = useMyIssuesPrefs(workspaceSlug);
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
      return true;
    });
  }, [issues, prefs.status_groups, prefs.priorities, prefs.label_ids, prefs.project_ids, prefs.cycle_ids]);

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

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-small text-text-tertiary">
        No issues match the current view.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map((g) => (
        <GroupSection key={g.key} group={g} workspaceSlug={workspaceSlug} display={display} />
      ))}
    </div>
  );

  // Make the router import used so dead-code-elim doesn't strip it (we
  // wire it once mutations land on this page).
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
    <section className="border-b border-border-subtle last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex h-[36px] w-full items-center gap-2 bg-elevated px-3 text-small text-text-secondary hover:bg-elevated-hover"
      >
        <ChevronDown size={12} className={clsx("text-text-tertiary transition-transform", !open && "-rotate-90")} />
        <span className="font-medium text-text-primary">{group.title}</span>
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
