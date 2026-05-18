"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Avatar, PriorityIcon } from "@/components/icons";
import { useTeamIssuesPrefs, type InsightsTab } from "@/lib/team-issues-prefs";
import type { Issue, Label, Project } from "@/lib/api";

/**
 * Right-side insights panel for /team/[teamKey]/[view]. Identical
 * surface to /my/[scope]'s insights — Assignees / Labels / Priority /
 * Projects tabs with live counts derived from the currently visible
 * issue list. Mounted next to the BoardView / IssueListBody when
 * prefs.insights_open is on (toggled by the third chip in the header).
 */
export function TeamIssuesInsights({
  workspaceSlug,
  teamKey,
  issues,
  labels,
  projects,
}: {
  workspaceSlug: string;
  teamKey: string;
  issues: Issue[];
  labels: Label[];
  projects: Project[];
}) {
  const { prefs, update } = useTeamIssuesPrefs(workspaceSlug, teamKey);
  const rows = useMemo(
    () => buildRows(prefs.insights_tab, issues, { labels, projects }),
    [prefs.insights_tab, issues, labels, projects],
  );

  const TABS: { value: InsightsTab; label: string }[] = [
    { value: "assignees", label: "Assignees" },
    { value: "labels", label: "Labels" },
    { value: "priority", label: "Priority" },
    { value: "projects", label: "Projects" },
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
              "rounded-pill px-2.5 py-1 text-mini font-medium transition-colors",
              prefs.insights_tab === t.value
                ? "bg-row-selected text-text-primary"
                : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {rows.length === 0 && (
          <div className="px-3 py-6 text-center text-mini text-text-tertiary">No data in this view.</div>
        )}
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center gap-2 px-3 py-1.5 text-small hover:bg-row-hover"
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              {row.icon}
            </span>
            <span className="flex-1 truncate text-text-primary">{row.label}</span>
            <span className="text-mini text-text-tertiary">{row.count}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

interface InsightRow {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
}

function buildRows(
  tab: InsightsTab,
  issues: Issue[],
  ctx: { labels: Label[]; projects: Project[] },
): InsightRow[] {
  if (tab === "assignees") {
    const map = new Map<string, InsightRow>();
    for (const i of issues) {
      const key = i.assignee?.id ?? "_unassigned";
      const name = i.assignee?.name ?? "No assignee";
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: name,
          count: 0,
          icon: i.assignee ? (
            <Avatar initials={i.assignee.initials} color={i.assignee.color} size={18} />
          ) : (
            <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
          ),
        });
      }
      map.get(key)!.count += 1;
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }
  if (tab === "labels") {
    const counts = new Map<string, number>();
    for (const i of issues) {
      if (i.labels.length === 0) {
        counts.set("_nolabel", (counts.get("_nolabel") ?? 0) + 1);
        continue;
      }
      for (const l of i.labels) counts.set(l.id, (counts.get(l.id) ?? 0) + 1);
    }
    const rows: InsightRow[] = [];
    for (const [id, n] of counts) {
      if (id === "_nolabel") {
        rows.push({
          key: "_nolabel",
          label: "No labels",
          count: n,
          icon: <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-border-strong" />,
        });
        continue;
      }
      const meta = ctx.labels.find((l) => l.id === id);
      rows.push({
        key: id,
        label: meta?.name ?? "Label",
        count: n,
        icon: <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: meta?.color ?? "#94a3b8" }} />,
      });
    }
    return rows.sort((a, b) => b.count - a.count);
  }
  if (tab === "priority") {
    const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];
    const counts: Record<number, number> = {};
    for (const i of issues) counts[i.priority] = (counts[i.priority] ?? 0) + 1;
    return Object.keys(counts)
      .map(Number)
      .sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b))
      .map((p) => ({
        key: String(p),
        label: PRIORITY_LABELS[p],
        count: counts[p],
        icon: <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />,
      }));
  }
  // projects
  const counts = new Map<string, number>();
  for (const i of issues) {
    counts.set(i.project_id ?? "_noproject", (counts.get(i.project_id ?? "_noproject") ?? 0) + 1);
  }
  const rows: InsightRow[] = [];
  for (const [id, n] of counts) {
    if (id === "_noproject") {
      rows.push({
        key: "_noproject",
        label: "No project",
        count: n,
        icon: <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-border-strong" />,
      });
      continue;
    }
    const meta = ctx.projects.find((p) => p.id === id);
    rows.push({
      key: id,
      label: meta?.name ?? "Project",
      count: n,
      icon: <span className="inline-block h-3 w-3 rounded-sm" style={{ background: meta?.icon_color ?? "#94a3b8" }} />,
    });
  }
  return rows.sort((a, b) => b.count - a.count);
}
