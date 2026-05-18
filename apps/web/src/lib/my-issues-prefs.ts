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
export type InsightsTab = "labels" | "priority" | "projects" | "teams";

export interface MyIssuesPrefs {
  // Filters (each array empty = no filter on that dimension)
  status_groups: string[];   // backlog/unstarted/started/completed/canceled
  priorities: number[];      // 0..4
  label_ids: string[];
  project_ids: string[];
  cycle_ids: string[];
  assignee_ids: string[];
  creator_ids: string[];
  subscriber_ids: string[];
  // Date filter — "any" disables, "due" requires a due_date, "no_due"
  // requires the absence of one, "overdue" requires due_date < now.
  date_filter: "any" | "due" | "no_due" | "overdue";
  // Relations filter — "any" disables, "with_relations" requires the
  // issue to have at least one outgoing relation, "no_relations" the
  // opposite. Relation dimensions live on issue detail; in the list
  // endpoint we infer from a `has_relations` flag we surface there.
  relations_filter: "any" | "with_relations" | "no_relations";
  // Links filter — "any" disables, "with_links" requires the issue to
  // have at least one IssueLink, "no_links" the opposite.
  links_filter: "any" | "with_links" | "no_links";
  // Plain-text search across title + description.
  search_query: string;
  // Board-only — columns the user explicitly hid from the board (e.g.
  // "completed" once a sprint wraps). Stored separately from
  // `status_groups` because those *include* a state, while
  // `hidden_status_groups` *excludes* it.
  hidden_status_groups: string[];
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
  // Right-side insights panel — open/closed + which tab is showing.
  insights_open: boolean;
  insights_tab: InsightsTab;
}

const DEFAULTS: MyIssuesPrefs = {
  status_groups: [],
  priorities: [],
  label_ids: [],
  project_ids: [],
  cycle_ids: [],
  assignee_ids: [],
  creator_ids: [],
  subscriber_ids: [],
  date_filter: "any",
  relations_filter: "any",
  links_filter: "any",
  search_query: "",
  hidden_status_groups: [],
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
  insights_open: false,
  insights_tab: "labels",
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

/**
 * Pack a prefs snapshot into a URL query string under the `mip` key. Used
 * by Save-as-view from /my/[scope] — we round-trip the JSON because
 * unrolling all 30+ fields as individual params would bloat the URL.
 */
export function serializeMyIssuesPrefs(prefs: Partial<MyIssuesPrefs>): string {
  const sp = new URLSearchParams();
  sp.set("mip", JSON.stringify(prefs));
  return sp.toString();
}

/**
 * Parse a query string back into a prefs patch. Returns null when no
 * `mip` key exists or the JSON is malformed — callers should leave
 * existing prefs untouched in that case.
 */
export function deserializeMyIssuesPrefs(query: string): Partial<MyIssuesPrefs> | null {
  if (!query) return null;
  try {
    const sp = new URLSearchParams(query);
    const raw = sp.get("mip");
    if (!raw) return null;
    return JSON.parse(raw) as Partial<MyIssuesPrefs>;
  } catch {
    return null;
  }
}

/**
 * Apply a prefs patch directly to localStorage + fire the change event so
 * any mounted useMyIssuesPrefs hook re-renders. Used by the
 * /view/[viewId] entry point on /my/ pages.
 */
export function applyMyIssuesPrefs(slug: string, patch: Partial<MyIssuesPrefs>): void {
  const current = read(slug);
  write(slug, { ...current, ...patch });
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
    update({
      status_groups: [],
      priorities: [],
      label_ids: [],
      project_ids: [],
      cycle_ids: [],
      assignee_ids: [],
      creator_ids: [],
      subscriber_ids: [],
      date_filter: "any",
      relations_filter: "any",
      links_filter: "any",
      search_query: "",
    });
  }

  const activeFilterCount =
    prefs.status_groups.length +
    prefs.priorities.length +
    prefs.label_ids.length +
    prefs.project_ids.length +
    prefs.cycle_ids.length +
    prefs.assignee_ids.length +
    prefs.creator_ids.length +
    prefs.subscriber_ids.length +
    (prefs.date_filter !== "any" ? 1 : 0) +
    (prefs.relations_filter !== "any" ? 1 : 0) +
    (prefs.links_filter !== "any" ? 1 : 0) +
    (prefs.search_query.trim() ? 1 : 0);

  return { prefs, update, toggleInList, clearFilters, activeFilterCount };
}
