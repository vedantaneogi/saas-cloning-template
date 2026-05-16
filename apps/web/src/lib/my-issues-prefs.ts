"use client";

import { useEffect, useState } from "react";

/**
 * Per-workspace prefs for the My issues page. Tracks the filter funnel
 * selections, list-vs-board view, grouping/ordering, completed-issues
 * window, and which display-property columns are visible.
 *
 * Mirrors the inbox-prefs pattern: localStorage cache + custom event so
 * the topbar controls and the list body stay in sync.
 */

export type MyIssuesView = "list" | "board";
export type MyIssuesGrouping =
  | "focus"        // status order then importance — Linear's default
  | "status"
  | "priority"
  | "assignee"
  | "project"
  | "labels"
  | "cycle"
  | "no_grouping";
export type MyIssuesOrdering = "importance" | "priority" | "newest" | "oldest" | "updated";
export type CompletedWindow = "day" | "week" | "month" | "all";

export interface MyIssuesPrefs {
  // Filters (each array empty = no filter on that dimension)
  status_groups: string[];   // backlog/unstarted/started/completed/canceled
  priorities: number[];      // 0..4
  label_ids: string[];
  project_ids: string[];
  cycle_ids: string[];
  // View
  view: MyIssuesView;
  grouping: MyIssuesGrouping;
  sub_grouping: MyIssuesGrouping; // additional level; defaults to no_grouping
  ordering: MyIssuesOrdering;
  order_completed_by_recency: boolean;
  completed_window: CompletedWindow;
  show_sub_issues: boolean;
  nested_sub_issues: boolean;
  // Display properties — toggles which columns appear in each row
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
}

const DEFAULTS: MyIssuesPrefs = {
  status_groups: [],
  priorities: [],
  label_ids: [],
  project_ids: [],
  cycle_ids: [],
  view: "list",
  grouping: "focus",
  sub_grouping: "no_grouping",
  ordering: "importance",
  order_completed_by_recency: false,
  completed_window: "day",
  show_sub_issues: true,
  nested_sub_issues: false,
  // Linear default-on columns
  show_id: true,
  show_status: true,
  show_assignee: true,
  show_priority: true,
  show_project: true,
  show_due_date: true,
  show_milestone: false,
  show_cycle: true,
  show_labels: true,
  show_links: false,
  show_time_in_status: false,
  show_created: true,
  show_updated: false,
};

const cache = new Map<string, MyIssuesPrefs>();
const EVENT = "my-issues-prefs:changed";

function storageKey(slug: string) {
  return `my-issues-prefs:${slug}`;
}

function read(slug: string): MyIssuesPrefs {
  if (cache.has(slug)) return cache.get(slug)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<MyIssuesPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, prefs: MyIssuesPrefs) {
  cache.set(slug, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(prefs));
  } catch {
    // quota / private mode — ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useMyIssuesPrefs(slug: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!cache.has(slug)) cache.set(slug, read(slug));
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug]);

  const prefs = cache.get(slug) ?? read(slug);

  function update(patch: Partial<MyIssuesPrefs>) {
    write(slug, { ...prefs, ...patch });
  }

  function toggleInList<K extends keyof MyIssuesPrefs>(key: K, value: MyIssuesPrefs[K] extends Array<infer T> ? T : never) {
    const current = (prefs[key] as unknown as Array<unknown>) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next as MyIssuesPrefs[K] } as unknown as Partial<MyIssuesPrefs>);
  }

  function clearFilters() {
    update({ status_groups: [], priorities: [], label_ids: [], project_ids: [], cycle_ids: [] });
  }

  const activeFilterCount =
    prefs.status_groups.length +
    prefs.priorities.length +
    prefs.label_ids.length +
    prefs.project_ids.length +
    prefs.cycle_ids.length;

  return { prefs, update, toggleInList, clearFilters, activeFilterCount };
}
