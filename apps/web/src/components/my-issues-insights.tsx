"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { useMyIssuesPrefs, type InsightsTab } from "@/lib/my-issues-prefs";
import type { Issue, Label, Member, Project, Team } from "@/lib/api";

/**
 * Right-side insights panel for the My issues page. Aggregates the
 * currently visible (post-filter) issue list along one of four
 * dimensions — Labels / Priority / Projects / Teams — and offers a
 * "See issues" action that pins that bucket as a filter.
 *
 * Counts are computed client-side from the same `issues` array the list
 * renders; that way the panel and the list always agree (and the panel
 * costs zero extra backend calls).
 */
export function MyIssuesInsights({
  workspaceSlug,
  issues,
  labels,
  projects,
  teams,
}: {
  workspaceSlug: string;
  issues: Issue[];
  labels: Label[];
  projects: Project[];
  teams: Team[];
  members?: Member[];
}) {
  const { prefs, update, toggleInList } = useMyIssuesPrefs(workspaceSlug);

  const aggregates = useMemo(() => computeAggregates(issues), [issues]);
  const currentRows = buildRows(prefs.insights_tab, aggregates, { labels, projects, teams });

  function selectFilter(bucket: string) {
    // Each tab maps to a different filter dimension. "See issues" pins
    // that bucket; clicking the same row again un-pins (toggle).
    switch (prefs.insights_tab) {
      case "labels":
        toggleInList("label_ids", bucket as never);
        break;
      case "projects":
        toggleInList("project_ids", bucket as never);
        break;
      case "priority":
        toggleInList("priorities", Number(bucket) as never);
        break;
      case "teams":
        // No team filter dim on My issues yet — keep this a no-op so
        // clicking still feels responsive but doesn't corrupt state.
        break;
    }
  }

  function isPinned(bucket: string): boolean {
    switch (prefs.insights_tab) {
      case "labels":
        return prefs.label_ids.includes(bucket);
      case "projects":
        return prefs.project_ids.includes(bucket);
      case "priority":
        return prefs.priorities.includes(Number(bucket));
      default:
        return false;
    }
  }

  const TABS: { value: InsightsTab; label: string }[] = [
    { value: "labels", label: "Labels" },
    { value: "priority", label: "Priority" },
    { value: "projects", label: "Projects" },
    { value: "teams", label: "Teams" },
  ];

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border-subtle bg-app">
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update({ insights_tab: t.value })}
            className={clsx(
              "rounded-pill border px-2.5 py-1 text-mini transition-colors",
              prefs.insights_tab === t.value
                ? "border-border-strong bg-row-selected text-text-primary"
                : "border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {currentRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-mini text-text-tertiary">
            No data in this view.
          </div>
        ) : (
          currentRows.map((row) => {
            const pinned = isPinned(row.key);
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => selectFilter(row.key)}
                className={clsx(
                  "group flex w-full items-center gap-2 px-3 py-2 text-small hover:bg-row-hover",
                  pinned && "bg-row-selected",
                )}
              >
                {row.color && (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-pill"
                    style={{ background: row.color }}
                  />
                )}
                <span className="flex-1 truncate text-left text-text-primary">{row.label}</span>
                <span className="text-mini text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  See issues
                </span>
                <span className="w-6 text-right text-mini text-text-tertiary">{row.count}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

interface InsightRow {
  key: string;
  label: string;
  count: number;
  color?: string;
}

interface Aggregates {
  // Labels: stash name + color alongside the count so team-scoped
  // labels (which the workspace-labels endpoint doesn't return) still
  // render with the right color/name. Keyed by label_id.
  labelInfo: Map<string, { name: string; color: string; count: number }>;
  priorityCounts: Map<number, number>;
  projectCounts: Map<string, number>;
  teamCounts: Map<string, number>;
}

function computeAggregates(issues: Issue[]): Aggregates {
  const labelInfo = new Map<string, { name: string; color: string; count: number }>();
  const priorityCounts = new Map<number, number>();
  const projectCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();

  for (const i of issues) {
    for (const l of i.labels) {
      const existing = labelInfo.get(l.id);
      if (existing) existing.count += 1;
      else labelInfo.set(l.id, { name: l.name, color: l.color, count: 1 });
    }
    priorityCounts.set(i.priority, (priorityCounts.get(i.priority) ?? 0) + 1);
    if (i.project_id) {
      projectCounts.set(i.project_id, (projectCounts.get(i.project_id) ?? 0) + 1);
    }
    if (i.team?.key) {
      teamCounts.set(i.team.key, (teamCounts.get(i.team.key) ?? 0) + 1);
    }
  }
  return { labelInfo, priorityCounts, projectCounts, teamCounts };
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  0: "No priority",
};

function buildRows(
  tab: InsightsTab,
  agg: Aggregates,
  ctx: { labels: Label[]; projects: Project[]; teams: Team[] },
): InsightRow[] {
  switch (tab) {
    case "labels": {
      void ctx.labels;
      const rows: InsightRow[] = [];
      for (const [id, info] of agg.labelInfo.entries()) {
        rows.push({ key: id, label: info.name, count: info.count, color: info.color });
      }
      return rows.sort((a, b) => b.count - a.count);
    }
    case "priority": {
      const order = [1, 2, 3, 4, 0];
      return order
        .map((p) => ({
          key: String(p),
          label: PRIORITY_LABELS[p],
          count: agg.priorityCounts.get(p) ?? 0,
        }))
        .filter((r) => r.count > 0);
    }
    case "projects": {
      const byId = new Map(ctx.projects.map((p) => [p.id, p]));
      const rows: InsightRow[] = [];
      for (const [id, count] of agg.projectCounts.entries()) {
        const p = byId.get(id);
        rows.push({
          key: id,
          label: p?.name ?? "Untitled project",
          count,
          color: p?.icon_color,
        });
      }
      return rows.sort((a, b) => b.count - a.count);
    }
    case "teams": {
      const byKey = new Map(ctx.teams.map((t) => [t.key, t]));
      const rows: InsightRow[] = [];
      for (const [key, count] of agg.teamCounts.entries()) {
        const t = byKey.get(key);
        rows.push({
          key,
          label: t?.name ?? key,
          count,
          color: t?.icon_color,
        });
      }
      return rows.sort((a, b) => b.count - a.count);
    }
  }
}
