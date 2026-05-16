"use client";

import { useEffect, useState } from "react";

/**
 * Inbox topbar filters + display options. Persisted in localStorage and
 * scoped per workspace so a user's preferences don't leak across orgs.
 *
 * Filters are arrays of selected values — empty array means "no filter".
 * Display options are independent display knobs (sort order, snoozed,
 * read/unread visibility, which row columns to show).
 *
 * Backend involvement:
 * - `include_snoozed` is passed as a query param so snoozed rows can be
 *   pulled in (the API hides them by default).
 * - All other filters operate on metadata returned in each
 *   NotificationOut row (team_key, project_id, priority, state_group,
 *   kind, actor.id) — actual filtering happens client-side.
 */

export type InboxOrdering = "newest" | "oldest";

export interface InboxPrefs {
  // Filters
  notif_kinds: string[];   // NotificationKind values
  from_member_ids: string[];
  team_keys: string[];
  project_ids: string[];
  initiative_ids: string[];
  priorities: number[];    // 0..4
  state_groups: string[];  // backlog/unstarted/started/completed/canceled
  // Display
  ordering: InboxOrdering;
  show_snoozed: boolean;
  show_read: boolean;
  show_unread_first: boolean;
  show_id: boolean;            // show issue identifier pill
  show_status_icon: boolean;   // show the kind icon overlay
}

const DEFAULTS: InboxPrefs = {
  notif_kinds: [],
  from_member_ids: [],
  team_keys: [],
  project_ids: [],
  initiative_ids: [],
  priorities: [],
  state_groups: [],
  ordering: "newest",
  show_snoozed: false,
  show_read: true,
  show_unread_first: false,
  show_id: true,
  show_status_icon: true,
};

const cache = new Map<string, InboxPrefs>();
const EVENT = "inbox-prefs:changed";

function storageKey(slug: string) {
  return `inbox-prefs:${slug}`;
}

function read(slug: string): InboxPrefs {
  if (cache.has(slug)) return cache.get(slug)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<InboxPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, prefs: InboxPrefs) {
  cache.set(slug, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(prefs));
  } catch {
    // quota / SSR / private mode — ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useInboxPrefs(slug: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Prime the cache once from localStorage so subsequent reads in the
    // same session avoid the JSON.parse cost.
    if (!cache.has(slug)) cache.set(slug, read(slug));
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug]);

  const prefs = cache.get(slug) ?? read(slug);

  function update(patch: Partial<InboxPrefs>) {
    write(slug, { ...prefs, ...patch });
  }

  function toggleInList<K extends keyof InboxPrefs>(key: K, value: InboxPrefs[K] extends Array<infer T> ? T : never) {
    const current = (prefs[key] as unknown as Array<unknown>) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next as InboxPrefs[K] } as unknown as Partial<InboxPrefs>);
  }

  function clearFilters() {
    update({
      notif_kinds: [],
      from_member_ids: [],
      team_keys: [],
      project_ids: [],
      initiative_ids: [],
      priorities: [],
      state_groups: [],
    });
  }

  // Count of *non-default* filter dimensions, used to decorate the funnel
  // button with a small badge so users know filters are active.
  const activeFilterCount =
    prefs.notif_kinds.length +
    prefs.from_member_ids.length +
    prefs.team_keys.length +
    prefs.project_ids.length +
    prefs.initiative_ids.length +
    prefs.priorities.length +
    prefs.state_groups.length;

  return { prefs, update, toggleInList, clearFilters, activeFilterCount };
}
