"use client";

import { useEffect, useState } from "react";

/**
 * Per-user-per-customer prefs that drive the favorite star and the
 * notification bell popover (image #27). Stored in localStorage; the
 * subscription model isn't backed by a server table yet, but the
 * shape is forward-compatible with a future PATCH endpoint.
 *
 * Key shape: `customer-prefs:<workspaceSlug>:<customerSlug>` -> JSON.
 */

export interface CustomerPrefs {
  favorite: boolean;
  notify_request_added: boolean;
  notify_request_important: boolean;
  notify_issue_completed: boolean;
}

const DEFAULTS: CustomerPrefs = {
  favorite: false,
  notify_request_added: true,
  notify_request_important: true,
  notify_issue_completed: true,
};

const cache = new Map<string, CustomerPrefs>();
const EVENT = "customer-prefs:changed";

function key(slug: string, customerSlug: string) {
  return `customer-prefs:${slug}:${customerSlug}`;
}

function read(slug: string, customerSlug: string): CustomerPrefs {
  const k = key(slug, customerSlug);
  if (cache.has(k)) return cache.get(k)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CustomerPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, customerSlug: string, prefs: CustomerPrefs) {
  const k = key(slug, customerSlug);
  cache.set(k, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(prefs));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug, customerSlug } }));
}

export function useCustomerPrefs(slug: string, customerSlug: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const k = key(slug, customerSlug);
    if (!cache.has(k)) cache.set(k, read(slug, customerSlug));
    function refresh(e: Event) {
      const d = (e as CustomEvent).detail as { slug?: string; customerSlug?: string } | undefined;
      if (!d || (d.slug === slug && d.customerSlug === customerSlug)) setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug, customerSlug]);

  const prefs = cache.get(key(slug, customerSlug)) ?? read(slug, customerSlug);

  function update(patch: Partial<CustomerPrefs>) {
    write(slug, customerSlug, { ...prefs, ...patch });
  }

  return { prefs, update };
}
