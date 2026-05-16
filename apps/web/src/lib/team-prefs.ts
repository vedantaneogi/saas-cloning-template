"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listTeamPreferences,
  patchTeamPreference,
  type TeamPreference,
} from "@/lib/api";

// Centralized client store for per-team preferences. The backend owns the
// truth (team_preferences table); this module is the small reactive cache
// that lets sidebar Favorites + TeamMenu share state and update in
// lockstep. Pattern:
//   1. On first mount in a workspace, fetch all prefs and seed the cache.
//   2. Mutations PATCH the API and rewrite the local cache optimistically.
//   3. Subscribers (`useTeam*` hooks) listen for the cache-changed event.

type Topic = "issue_added" | "issue_resolved" | "triage_added";

const TOPIC_FIELDS: Record<Topic, keyof TeamPreference> = {
  issue_added: "sub_issue_added",
  issue_resolved: "sub_issue_resolved",
  triage_added: "sub_triage_added",
};

const EVENT = "team-prefs:changed";
type Cache = Map<string, TeamPreference>; // team_key -> pref
const caches: Map<string, Cache> = new Map();
const loadedFor = new Set<string>();
const inFlight: Map<string, Promise<void>> = new Map();

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

function cacheFor(slug: string): Cache {
  let c = caches.get(slug);
  if (!c) {
    c = new Map();
    caches.set(slug, c);
  }
  return c;
}

function ensureLoaded(slug: string): Promise<void> {
  if (loadedFor.has(slug)) return Promise.resolve();
  const existing = inFlight.get(slug);
  if (existing) return existing;
  const p = listTeamPreferences(slug)
    .then((rows) => {
      const c = cacheFor(slug);
      for (const r of rows) c.set(r.team_key, r);
      loadedFor.add(slug);
      emit();
    })
    .catch(() => {
      // Best effort. On failure we leave the cache empty and the UI shows
      // the default (unfavorited, no subscriptions) — next mutation will
      // re-attempt the write.
    })
    .finally(() => {
      inFlight.delete(slug);
    });
  inFlight.set(slug, p);
  return p;
}

function readPref(slug: string, teamKey: string): TeamPreference {
  const existing = cacheFor(slug).get(teamKey);
  if (existing) return existing;
  return {
    team_key: teamKey,
    favorite: false,
    sub_issue_added: false,
    sub_issue_resolved: false,
    sub_triage_added: false,
  };
}

function writePrefOptimistic(slug: string, next: TeamPreference) {
  cacheFor(slug).set(next.team_key, next);
  emit();
}

async function persistPref(slug: string, next: TeamPreference) {
  try {
    const saved = await patchTeamPreference(slug, next.team_key, {
      favorite: next.favorite,
      sub_issue_added: next.sub_issue_added,
      sub_issue_resolved: next.sub_issue_resolved,
      sub_triage_added: next.sub_triage_added,
    });
    cacheFor(slug).set(next.team_key, saved);
    emit();
  } catch {
    // Revert by refetching the canonical state. We don't try to undo the
    // optimistic write inline — a refetch is correct under concurrent edits.
    loadedFor.delete(slug);
    ensureLoaded(slug);
  }
}

function useSubscribe(slug: string): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    ensureLoaded(slug);
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
    };
  }, [slug]);
  return 0;
}

export function useTeamFavorites(workspaceSlug: string): Set<string> {
  useSubscribe(workspaceSlug);
  return useMemo(() => {
    const cache = cacheFor(workspaceSlug);
    const out = new Set<string>();
    for (const [key, p] of cache) {
      if (p.favorite) out.add(key);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSlug, caches.get(workspaceSlug)?.size, /* re-render trigger */ useTickCount()]);
}

// Helper hook that just bumps a counter on every cache event, so memoized
// derivations recompute. Kept private — callers use the exported hooks.
function useTickCount(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
    };
  }, []);
  return tick;
}

export function useTeamFavorite(
  workspaceSlug: string,
  teamKey: string,
): [boolean, () => void] {
  useSubscribe(workspaceSlug);
  useTickCount();
  const current = readPref(workspaceSlug, teamKey);
  const toggle = useCallback(() => {
    const before = readPref(workspaceSlug, teamKey);
    const next: TeamPreference = { ...before, favorite: !before.favorite };
    writePrefOptimistic(workspaceSlug, next);
    persistPref(workspaceSlug, next);
  }, [workspaceSlug, teamKey]);
  return [current.favorite, toggle];
}

export function useTeamSubscription(
  workspaceSlug: string,
  teamKey: string,
): {
  topics: Set<Topic>;
  toggle: (t: Topic) => void;
  anySubscribed: boolean;
} {
  useSubscribe(workspaceSlug);
  useTickCount();
  const pref = readPref(workspaceSlug, teamKey);
  const topics = useMemo(() => {
    const out = new Set<Topic>();
    if (pref.sub_issue_added) out.add("issue_added");
    if (pref.sub_issue_resolved) out.add("issue_resolved");
    if (pref.sub_triage_added) out.add("triage_added");
    return out;
  }, [pref.sub_issue_added, pref.sub_issue_resolved, pref.sub_triage_added]);

  const toggle = useCallback(
    (t: Topic) => {
      const before = readPref(workspaceSlug, teamKey);
      const field = TOPIC_FIELDS[t];
      const next: TeamPreference = { ...before, [field]: !before[field] };
      writePrefOptimistic(workspaceSlug, next);
      persistPref(workspaceSlug, next);
    },
    [workspaceSlug, teamKey],
  );

  return { topics, toggle, anySubscribed: topics.size > 0 };
}

export const SUBSCRIPTION_TOPICS: { value: Topic; label: string }[] = [
  { value: "issue_added", label: "An issue is added to the team" },
  { value: "issue_resolved", label: "An issue is marked completed or canceled" },
  { value: "triage_added", label: "An issue is added to the triage queue" },
];
