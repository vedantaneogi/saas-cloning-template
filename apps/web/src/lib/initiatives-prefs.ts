"use client";

import { useEffect, useState } from "react";

/**
 * Per-workspace personal preferences for /initiatives. Stored in
 * localStorage because everything here is purely cosmetic (which
 * columns to show, grouping, ordering) — same pattern used by
 * my-issues / team-issues / cycle prefs.
 *
 * Key shape: `initiatives-prefs:<workspaceSlug>` -> JSON.
 */

export type InitiativesGrouping = "no_grouping" | "owner" | "status";
export type InitiativesOrdering = "manual" | "name" | "target" | "created" | "updated";

export interface InitiativesPrefs {
  grouping: InitiativesGrouping;
  ordering: InitiativesOrdering;

  // Display property pills — image #21.
  show_description: boolean;
  show_owner: boolean;
  show_start_date: boolean;
  show_target_date: boolean;
  show_completed: boolean;
  show_updated: boolean;
  show_created: boolean;
  show_teams: boolean;
  show_initiative_health: boolean;
  show_projects: boolean;
  show_active_projects: boolean;
}

const DEFAULTS: InitiativesPrefs = {
  grouping: "no_grouping",
  ordering: "manual",
  show_description: true,
  show_owner: true,
  show_start_date: false,
  show_target_date: true,
  show_completed: false,
  show_updated: false,
  show_created: false,
  show_teams: false,
  show_initiative_health: true,
  show_projects: true,
  show_active_projects: true,
};

const cache = new Map<string, InitiativesPrefs>();
const EVENT = "initiatives-prefs:changed";

function key(slug: string) {
  return `initiatives-prefs:${slug}`;
}

function read(slug: string): InitiativesPrefs {
  const k = key(slug);
  if (cache.has(k)) return cache.get(k)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<InitiativesPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, prefs: InitiativesPrefs) {
  const k = key(slug);
  cache.set(k, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(prefs));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug } }));
}

export function resetInitiativesPrefs(slug: string) {
  write(slug, { ...DEFAULTS });
}

export function useInitiativesPrefs(slug: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const k = key(slug);
    if (!cache.has(k)) cache.set(k, read(slug));
    function refresh(e: Event) {
      const d = (e as CustomEvent).detail as { slug?: string } | undefined;
      if (!d || d.slug === slug) setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug]);

  const prefs = cache.get(key(slug)) ?? read(slug);

  function update(patch: Partial<InitiativesPrefs>) {
    write(slug, { ...prefs, ...patch });
  }

  return { prefs, update };
}
