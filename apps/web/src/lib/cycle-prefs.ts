"use client";

import { useEffect, useState } from "react";

/**
 * Per-cycle personal preferences.
 *
 *   - `favorite` / `subscribe` / `calendar_subscribed` — exposed by the
 *     3-dot menu in the cycle header. Per-user, stored in localStorage
 *     because the subscription model isn't backed by a server table yet.
 *   - `view` / `grouping` / `ordering` / display-property toggles —
 *     drive the cycle Display popover and the IssueRow renderer.
 *   - `right_panel_open` — toggled by the third (Panel) chip in the
 *     cycle controls; mounts the cycle progress panel.
 *
 * Key shape: `cycle-prefs:<workspaceSlug>:<cycleId>` -> JSON.
 */

export type SubscribeMode = "none" | "all" | "important";
export type CycleView = "list" | "board";
export type CycleGrouping =
  | "state"
  | "priority"
  | "assignee"
  | "project"
  | "label"
  | "no_grouping";
export type CycleOrdering = "manual" | "priority" | "newest" | "oldest" | "updated" | "due";
export type CompletedWindow = "day" | "week" | "month" | "all";

export interface CyclePrefs {
  favorite: boolean;
  subscribe: SubscribeMode;
  calendar_subscribed: boolean;

  view: CycleView;
  grouping: CycleGrouping;
  sub_grouping: CycleGrouping;
  ordering: CycleOrdering;
  order_completed_by_recency: boolean;
  completed_window: CompletedWindow;
  show_sub_issues: boolean;
  show_empty_columns: boolean;

  show_id: boolean;
  show_status: boolean;
  show_assignee: boolean;
  show_priority: boolean;
  show_project: boolean;
  show_due_date: boolean;
  show_milestone: boolean;
  show_labels: boolean;
  show_links: boolean;
  show_time_in_status: boolean;
  show_created: boolean;
  show_updated: boolean;

  right_panel_open: boolean;
}

const DEFAULTS: CyclePrefs = {
  favorite: false,
  subscribe: "none",
  calendar_subscribed: false,

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
  show_labels: true,
  show_links: false,
  show_time_in_status: false,
  show_created: true,
  show_updated: false,

  right_panel_open: false,
};

const cache = new Map<string, CyclePrefs>();
const EVENT = "cycle-prefs:changed";

function key(slug: string, cycleId: string) {
  return `cycle-prefs:${slug}:${cycleId}`;
}

function read(slug: string, cycleId: string): CyclePrefs {
  const k = key(slug, cycleId);
  if (cache.has(k)) return cache.get(k)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CyclePrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, cycleId: string, prefs: CyclePrefs) {
  const k = key(slug, cycleId);
  cache.set(k, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(prefs));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug, cycleId } }));
}

export function resetCyclePrefs(slug: string, cycleId: string) {
  write(slug, cycleId, { ...DEFAULTS });
}

export function useCyclePrefs(slug: string, cycleId: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const k = key(slug, cycleId);
    if (!cache.has(k)) cache.set(k, read(slug, cycleId));
    function refresh(e: Event) {
      const d = (e as CustomEvent).detail as { slug?: string; cycleId?: string } | undefined;
      if (!d || (d.slug === slug && d.cycleId === cycleId)) setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug, cycleId]);

  const prefs = cache.get(key(slug, cycleId)) ?? read(slug, cycleId);

  function update(patch: Partial<CyclePrefs>) {
    write(slug, cycleId, { ...prefs, ...patch });
  }

  return { prefs, update };
}

/**
 * Build an .ics file for the cycle's date range so the user can drop it
 * into their calendar. Linear's "Subscribe to cycle calendar" exposes an
 * ICS feed; here we just generate a one-shot blob from the cycle's
 * start/end since we don't yet host a calendar endpoint.
 */
export function downloadCycleICS(opts: {
  cycleName: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
}) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  const uid = `cycle-${Math.random().toString(36).slice(2)}@linear-clone`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//linear-clone//cycles//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(opts.startsAt)}`,
    `DTEND:${fmt(opts.endsAt)}`,
    `SUMMARY:${opts.cycleName}`,
    opts.description ? `DESCRIPTION:${opts.description.replace(/\n/g, "\\n")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.cycleName.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
