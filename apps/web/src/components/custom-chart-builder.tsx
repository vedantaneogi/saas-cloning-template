"use client";

import { useEffect, useMemo, useState } from "react";
import { listTeamIssues, type Issue, type Team } from "@/lib/api";

type ViewKind = "active" | "backlog" | "all";
type GroupBy = "status" | "priority" | "assignee" | "label" | "project";
type ChartKind = "bar" | "table";

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  label: "Label",
  project: "Project",
};

const VIEW_LABELS: Record<ViewKind, string> = {
  active: "Active",
  backlog: "Backlog",
  all: "All issues",
};

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

export function CustomChartBuilder({
  workspaceSlug,
  teams,
}: {
  workspaceSlug: string;
  teams: Team[];
}) {
  const [teamKey, setTeamKey] = useState<string>(teams[0]?.key ?? "");
  const [view, setView] = useState<ViewKind>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamKey) return;
    let cancelled = false;
    setLoading(true);
    listTeamIssues(workspaceSlug, teamKey, view)
      .then((rows) => { if (!cancelled) setIssues(rows); })
      .catch(() => { if (!cancelled) setIssues([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceSlug, teamKey, view]);

  const buckets = useMemo(() => aggregate(issues, groupBy), [issues, groupBy]);
  const total = buckets.reduce((acc, b) => acc + b.count, 0);
  const max = buckets.reduce((acc, b) => Math.max(acc, b.count), 0);

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Team">
          <select
            value={teamKey}
            onChange={(e) => setTeamKey(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 text-small outline-none"
          >
            {teams.map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="View">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewKind)}
            className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 text-small outline-none"
          >
            {(Object.keys(VIEW_LABELS) as ViewKind[]).map((v) => (
              <option key={v} value={v}>{VIEW_LABELS[v]}</option>
            ))}
          </select>
        </Field>
        <Field label="Group by">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 text-small outline-none"
          >
            {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map((g) => (
              <option key={g} value={g}>{GROUP_BY_LABELS[g]}</option>
            ))}
          </select>
        </Field>
        <Field label="Chart">
          <select
            value={chartKind}
            onChange={(e) => setChartKind(e.target.value as ChartKind)}
            className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 text-small outline-none"
          >
            <option value="bar">Bar</option>
            <option value="table">Table</option>
          </select>
        </Field>
      </div>

      <div className="rounded-md border border-border-subtle bg-elevated p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="text-default font-medium text-text-primary">
            {GROUP_BY_LABELS[groupBy]} · {VIEW_LABELS[view]}
          </h2>
          <span className="text-mini text-text-tertiary">
            {loading ? "Loading…" : `${total} issue${total === 1 ? "" : "s"}`}
          </span>
        </header>

        {!loading && buckets.length === 0 && (
          <div className="py-8 text-center text-small text-text-tertiary">
            No issues match this view.
          </div>
        )}

        {!loading && buckets.length > 0 && chartKind === "bar" && (
          <ul className="space-y-2">
            {buckets.map((b) => (
              <li key={b.key} className="grid grid-cols-[140px_1fr_42px] items-center gap-3 text-small">
                <span className="truncate text-text-secondary">{b.label}</span>
                <span className="h-2.5 overflow-hidden rounded-pill bg-pill">
                  <span
                    className="block h-full bg-accent transition-all"
                    style={{ width: `${(b.count / max) * 100}%`, background: b.color || undefined }}
                  />
                </span>
                <span className="text-right tabular-nums text-text-tertiary">{b.count}</span>
              </li>
            ))}
          </ul>
        )}

        {!loading && buckets.length > 0 && chartKind === "table" && (
          <table className="w-full text-small">
            <thead>
              <tr className="text-left text-mini text-text-tertiary">
                <th className="pb-2 font-medium">{GROUP_BY_LABELS[groupBy]}</th>
                <th className="pb-2 text-right font-medium">Count</th>
                <th className="pb-2 text-right font-medium">% of total</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key} className="border-t border-border-subtle">
                  <td className="py-2 text-text-secondary">{b.label}</td>
                  <td className="py-2 text-right tabular-nums text-text-primary">{b.count}</td>
                  <td className="py-2 text-right tabular-nums text-text-tertiary">
                    {total === 0 ? "—" : `${Math.round((b.count / total) * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-mini text-text-tertiary">
      <span>{label}</span>
      {children}
    </label>
  );
}

type Bucket = { key: string; label: string; count: number; color?: string };

function aggregate(issues: Issue[], groupBy: GroupBy): Bucket[] {
  const map = new Map<string, Bucket>();
  function add(key: string, label: string, color?: string) {
    const ex = map.get(key);
    if (ex) ex.count += 1;
    else map.set(key, { key, label, count: 1, color });
  }

  for (const i of issues) {
    switch (groupBy) {
      case "status": {
        add(i.state.id, i.state.name);
        break;
      }
      case "priority": {
        add(String(i.priority), PRIORITY_LABELS[i.priority] ?? "No priority");
        break;
      }
      case "assignee": {
        if (i.assignee) add(i.assignee.id, i.assignee.name, i.assignee.color);
        else add("_none", "Unassigned");
        break;
      }
      case "label": {
        if (i.labels.length === 0) add("_none", "No label");
        else for (const l of i.labels) add(l.id, l.name, l.color);
        break;
      }
      case "project": {
        if (i.project_id && i.project_name) add(i.project_id, i.project_name);
        else add("_none", "No project");
        break;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
