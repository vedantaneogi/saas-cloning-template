"use client";

import { useEffect, useState } from "react";

// Per-member sidebar customization. Stored on `members.sidebar_prefs` in
// the DB and cached in a module-level map so the sidebar + Customize
// modal can both subscribe with one fetch.

export type Visibility = "always" | "badged" | "never";
export type BadgeStyle = "count" | "dot";

export interface SidebarPrefs {
  badge_style?: BadgeStyle;
  // item-key → visibility
  [key: string]: Visibility | BadgeStyle | undefined;
}

const DEFAULTS: SidebarPrefs = {
  badge_style: "count",
  // Personal section
  inbox: "always",
  my_issues: "always",
  drafts: "badged",
  // Workspace section
  views: "always",
  projects: "always",
  initiatives: "always",
  roadmap: "never",
  documents: "never",
  customers: "always",
  custom_charts: "never",
  teams: "never",
  members: "never",
};

const cache: Map<string, SidebarPrefs> = new Map();
const loaded = new Set<string>();
const EVENT = "sidebar-prefs:changed";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

async function fetchPrefs(slug: string): Promise<SidebarPrefs> {
  const r = await fetch(`/api/workspaces/${encodeURIComponent(slug)}/me/sidebar-prefs`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!r.ok) return {};
  return (await r.json()) as SidebarPrefs;
}

async function savePrefs(slug: string, prefs: SidebarPrefs) {
  await fetch(`/api/workspaces/${encodeURIComponent(slug)}/me/sidebar-prefs`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs }),
  });
}

function mergeWithDefaults(stored: SidebarPrefs): SidebarPrefs {
  return { ...DEFAULTS, ...stored };
}

export function useSidebarPrefs(slug: string): {
  prefs: SidebarPrefs;
  setItem: (key: string, value: Visibility) => void;
  setBadgeStyle: (s: BadgeStyle) => void;
  setOverflowPin: (key: string | null) => void;
} {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!loaded.has(slug)) {
      loaded.add(slug);
      fetchPrefs(slug).then((p) => {
        cache.set(slug, p);
        emit();
      });
    }
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug]);

  const stored = cache.get(slug) ?? {};
  const merged = mergeWithDefaults(stored);

  function setItem(key: string, value: Visibility) {
    const next = { ...(cache.get(slug) ?? {}), [key]: value };
    cache.set(slug, next);
    emit();
    void savePrefs(slug, next);
  }

  function setBadgeStyle(s: BadgeStyle) {
    const next = { ...(cache.get(slug) ?? {}), badge_style: s };
    cache.set(slug, next);
    emit();
    void savePrefs(slug, next);
  }

  // Single-slot overflow pin: clicking an item in the More popover pins
  // it temporarily next to the always-visible items. Only one overflow
  // pin at a time — picking a new one replaces the previous slot, which
  // is the same behavior Linear uses for its overflow row.
  function setOverflowPin(key: string | null) {
    const next: SidebarPrefs = { ...(cache.get(slug) ?? {}) };
    if (key) (next as Record<string, unknown>).overflow_pin = key;
    else delete (next as Record<string, unknown>).overflow_pin;
    cache.set(slug, next);
    emit();
    void savePrefs(slug, next);
  }

  return { prefs: merged, setItem, setBadgeStyle, setOverflowPin };
}

// Helper: should this item render in the *main* (always-visible) area of
// the section? An item is shown there if it's "always" OR ("badged" AND
// the caller's badge count > 0). Items not in either bucket land in the
// More popover.
export function shouldShowInMain(visibility: Visibility, badge: number): boolean {
  if (visibility === "always") return true;
  if (visibility === "badged") return badge > 0;
  return false;
}

export function shouldShowAtAll(visibility: Visibility): boolean {
  return visibility !== "never";
}
