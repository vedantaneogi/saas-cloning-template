"use client";

import { useEffect, useState } from "react";

/**
 * Per-workspace localStorage state for the /search page:
 *   - Active tab (All / Issues / Projects / Documents)
 *   - Filter prefs (Team / Status type / Assignee/Lead / Creator /
 *     Updated date / Created date) — empty arrays / "any" string mean
 *     no filter
 *   - Display prefs (ordering, include archived, ID display column)
 *   - Recent searches (last N queries, most-recent first)
 *
 * Mirrors the inbox/my-issues prefs pattern: module-level cache +
 * window event for cross-component sync.
 */

export type SearchTab = "all" | "issues" | "projects" | "documents";
export type SearchOrdering = "relevance" | "newest" | "oldest" | "updated";
export type DateFilter = "any" | "past_day" | "past_week" | "past_month";

export interface SearchPrefs {
  tab: SearchTab;
  team_keys: string[];
  status_groups: string[]; // backlog/unstarted/started/completed/canceled
  assignee_ids: string[];
  creator_ids: string[];
  updated_date: DateFilter;
  created_date: DateFilter;
  ordering: SearchOrdering;
  include_archived: boolean;
  show_id: boolean;
  recents: string[];
}

const DEFAULTS: SearchPrefs = {
  tab: "all",
  team_keys: [],
  status_groups: [],
  assignee_ids: [],
  creator_ids: [],
  updated_date: "any",
  created_date: "any",
  ordering: "relevance",
  include_archived: false,
  show_id: true,
  recents: [],
};

const MAX_RECENTS = 8;
const cache = new Map<string, SearchPrefs>();
const EVENT = "search-prefs:changed";

function storageKey(slug: string) {
  return `search-prefs:${slug}`;
}

function read(slug: string): SearchPrefs {
  if (cache.has(slug)) return cache.get(slug)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SearchPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, prefs: SearchPrefs) {
  cache.set(slug, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(prefs));
  } catch {
    // quota / private mode — ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useSearchPrefs(slug: string) {
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

  function update(patch: Partial<SearchPrefs>) {
    write(slug, { ...prefs, ...patch });
  }

  function toggleInList<K extends keyof SearchPrefs>(key: K, value: SearchPrefs[K] extends Array<infer T> ? T : never) {
    const current = (prefs[key] as unknown as Array<unknown>) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next as SearchPrefs[K] } as unknown as Partial<SearchPrefs>);
  }

  function clearFilters() {
    update({
      team_keys: [],
      status_groups: [],
      assignee_ids: [],
      creator_ids: [],
      updated_date: "any",
      created_date: "any",
    });
  }

  function recordRecent(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...prefs.recents.filter((r) => r !== trimmed)].slice(0, MAX_RECENTS);
    update({ recents: next });
  }

  function removeRecent(q: string) {
    update({ recents: prefs.recents.filter((r) => r !== q) });
  }

  function clearRecents() {
    update({ recents: [] });
  }

  const activeFilterCount =
    prefs.team_keys.length +
    prefs.status_groups.length +
    prefs.assignee_ids.length +
    prefs.creator_ids.length +
    (prefs.updated_date !== "any" ? 1 : 0) +
    (prefs.created_date !== "any" ? 1 : 0);

  return {
    prefs,
    update,
    toggleInList,
    clearFilters,
    recordRecent,
    removeRecent,
    clearRecents,
    activeFilterCount,
  };
}
