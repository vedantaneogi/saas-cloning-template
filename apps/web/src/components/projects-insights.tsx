"use client";

import { useMemo } from "react";
import clsx from "clsx";
import {
  HealthIconSmall,
  healthLabel,
  type HealthValue,
} from "@/components/health-icon";
import { useProjectsPrefs, type ProjectsInsightsTab } from "@/lib/projects-prefs";
import type { Member, Project, Team } from "@/lib/api";

/**
 * Right-side panel for /projects. Tabs: Health / Teams / Leads. Counts
 * are aggregated from the currently visible (post-filter) project list,
 * so the panel always agrees with what's shown.
 */
export function ProjectsInsights({
  workspaceSlug,
  projects,
  teams,
  members,
}: {
  workspaceSlug: string;
  projects: Project[];
  teams: Team[];
  members: Member[];
}) {
  const { prefs, update, toggleInList } = useProjectsPrefs(workspaceSlug);

  const aggregates = useMemo(() => computeAggregates(projects), [projects]);
  const rows = buildRows(prefs.insights_tab, aggregates, { teams, members });

  function onRowClick(row: InsightRow) {
    if (prefs.insights_tab === "health") {
      toggleInList("health", row.key as never);
    } else if (prefs.insights_tab === "teams") {
      toggleInList("team_keys", row.key as never);
    } else if (prefs.insights_tab === "leads") {
      toggleInList("lead_ids", row.key as never);
    }
  }

  function isPinned(key: string): boolean {
    if (prefs.insights_tab === "health") return prefs.health.includes(key as HealthValue);
    if (prefs.insights_tab === "teams") return prefs.team_keys.includes(key);
    if (prefs.insights_tab === "leads") return prefs.lead_ids.includes(key);
    return false;
  }

  const TABS: { value: ProjectsInsightsTab; label: string }[] = [
    { value: "health", label: "Health" },
    { value: "teams", label: "Teams" },
    { value: "leads", label: "Leads" },
  ];

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-border-subtle bg-app">
      <div className="flex items-center gap-2 px-3 py-3">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update({ insights_tab: t.value })}
            className={clsx(
              "flex-1 rounded-full px-4 py-1.5 text-small font-medium transition-colors",
              prefs.insights_tab === t.value
                ? "bg-elevated text-text-primary shadow-sm ring-1 ring-white/[0.06]"
                : "text-text-tertiary ring-1 ring-border-subtle hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-mini text-text-tertiary">
            No data in this view.
          </div>
        ) : (
          rows.map((row) => {
            const pinned = isPinned(row.key);
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => onRowClick(row)}
                className={clsx(
                  "group flex w-full items-center gap-2 px-3 py-2 text-small hover:bg-row-hover",
                  pinned && "bg-row-selected",
                )}
              >
                {row.leading}
                <span className="flex-1 truncate text-left text-text-primary">{row.label}</span>
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
  leading: React.ReactNode;
}

interface Aggregates {
  health: Map<HealthValue, number>;
  teams: Map<string, number>;
  leads: Map<string, number>;
}

function computeAggregates(projects: Project[]): Aggregates {
  const health = new Map<HealthValue, number>();
  const teams = new Map<string, number>();
  const leads = new Map<string, number>();
  for (const p of projects) {
    const h: HealthValue = p.health ?? "noUpdate";
    health.set(h, (health.get(h) ?? 0) + 1);
    for (const key of p.team_keys ?? []) {
      teams.set(key, (teams.get(key) ?? 0) + 1);
    }
    if (p.lead) {
      leads.set(p.lead.id, (leads.get(p.lead.id) ?? 0) + 1);
    }
  }
  return { health, teams, leads };
}

function buildRows(
  tab: ProjectsInsightsTab,
  agg: Aggregates,
  ctx: { teams: Team[]; members: Member[] },
): InsightRow[] {
  if (tab === "health") {
    const order: HealthValue[] = ["onTrack", "atRisk", "offTrack", "noUpdate"];
    return order
      .map((h) => ({
        key: h,
        label: healthLabel(h),
        count: agg.health.get(h) ?? 0,
        leading: <HealthIconSmall health={h} />,
      }))
      .filter((r) => r.count > 0);
  }
  if (tab === "teams") {
    const byKey = new Map(ctx.teams.map((t) => [t.key, t]));
    const rows: InsightRow[] = [];
    for (const [key, count] of agg.teams.entries()) {
      const t = byKey.get(key);
      rows.push({
        key,
        label: t?.name ?? key,
        count,
        leading: (
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ background: t?.icon_color ?? "#6b7280" }}
          />
        ),
      });
    }
    return rows.sort((a, b) => b.count - a.count);
  }
  // leads
  const byId = new Map(ctx.members.map((m) => [m.id, m]));
  const rows: InsightRow[] = [];
  for (const [id, count] of agg.leads.entries()) {
    const m = byId.get(id);
    rows.push({
      key: id,
      label: m?.name ?? "Unknown",
      count,
      leading: (
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-pill text-[8px] font-medium text-white"
          style={{ background: m?.color ?? "#6b7280" }}
        >
          {m?.initials ?? "?"}
        </span>
      ),
    });
  }
  return rows.sort((a, b) => b.count - a.count);
}
