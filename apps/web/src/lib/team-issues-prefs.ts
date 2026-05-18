"use client";

import { useEffect, useState } from "react";

/**
 * Per-workspace + per-team display prefs for /team/[teamKey]/[view].
 *
 * The shape mirrors what the my-issues display popover already exposes
 * so the two surfaces feel consistent. Persistence is localStorage
 * (one entry per workspace/team pair); the page also keeps the
 * server-relevant subset — view / grouping / ordering — synced to the
 * URL so the server-rendered list endpoint applies them.
 */

export type TeamIssuesView = "list" | "board";
export type TeamIssuesGrouping =
  | "state"
  | "priority"
  | "assignee"
  | "project"
  | "label"
  | "cycle"
  | "no_grouping";
export type TeamIssuesOrdering = "manual" | "priority" | "newest" | "oldest" | "updated" | "due";
export type CompletedWindow = "day" | "week" | "month" | "all";
export type InsightsTab = "assignees" | "labels" | "priority" | "projects";

export interface TeamIssuesPrefs {
  view: TeamIssuesView;
  grouping: TeamIssuesGrouping;
  sub_grouping: TeamIssuesGrouping;
  ordering: TeamIssuesOrdering;
  order_completed_by_recency: boolean;
  completed_window: CompletedWindow;
  show_sub_issues: boolean;
  show_empty_columns: boolean;
  // Display properties — toggles which columns appear in each row.
  // Threaded into IssueRow's `display` prop so the server-rendered list
  // keeps rendering, just with the right columns hidden client-side.
  show_id: boolean;
  show_status: boolean;
  show_assignee: boolean;
  show_priority: boolean;
  show_project: boolean;
  show_due_date: boolean;
  show_milestone: boolean;
  show_cycle: boolean;
  show_labels: boolean;
  show_links: boolean;
  show_time_in_status: boolean;
  show_created: boolean;
  show_updated: boolean;
  // Right-side insights panel — open/closed + which tab is showing.
  insights_open: boolean;
  insights_tab: InsightsTab;
}

const DEFAULTS: TeamIssuesPrefs = {
  view: "list",
  grouping: "state",
  sub_grouping: "no_grouping",
  ordering: "manual",
  order_completed_by_recency: false,
  completed_window: "all",
  show_sub_issues: true,
  show_empty_columns: false,
  show_id: true,
  show_status: true,
  show_assignee: true,
  show_priority: true,
  show_project: true,
  show_due_date: false,
  show_milestone: false,
  show_cycle: true,
  show_labels: true,
  show_links: false,
  show_time_in_status: false,
  show_created: true,
  show_updated: false,
  insights_open: false,
  insights_tab: "assignees",
};

const cache = new Map<string, TeamIssuesPrefs>();
const EVENT = "team-issues-prefs:changed";

function storageKey(slug: string, teamKey: string) {
  return `team-issues-prefs:${slug}:${teamKey}`;
}

function read(slug: string, teamKey: string): TeamIssuesPrefs {
  const k = storageKey(slug, teamKey);
  if (cache.has(k)) return cache.get(k)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<TeamIssuesPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, teamKey: string, prefs: TeamIssuesPrefs) {
  const k = storageKey(slug, teamKey);
  cache.set(k, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(prefs));
  } catch {
    // quota / private mode — ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug, teamKey } }));
}

export function resetTeamIssuesPrefs(slug: string, teamKey: string) {
  write(slug, teamKey, { ...DEFAULTS });
}

export function useTeamIssuesPrefs(slug: string, teamKey: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const k = storageKey(slug, teamKey);
    if (!cache.has(k)) cache.set(k, read(slug, teamKey));
    function refresh(e: Event) {
      const detail = (e as CustomEvent).detail as { slug?: string; teamKey?: string } | undefined;
      if (!detail || (detail.slug === slug && detail.teamKey === teamKey)) {
        setTick((n) => n + 1);
      }
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug, teamKey]);

  const prefs = cache.get(storageKey(slug, teamKey)) ?? read(slug, teamKey);

  function update(patch: Partial<TeamIssuesPrefs>) {
    write(slug, teamKey, { ...prefs, ...patch });
  }

  return { prefs, update };
}
