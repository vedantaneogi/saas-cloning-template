"use client";

import { useEffect, useState } from "react";

export type CustomersOrdering = "created" | "name" | "revenue" | "size" | "requests";

export interface CustomersPrefs {
  // Active filters (empty array = no filter applied)
  status: string[];
  owner: string[]; // member ids or "_none"
  revenue: string[]; // bucket keys
  size: string[]; // bucket keys

  // Ordering
  ordering: CustomersOrdering;
  order_dir: "asc" | "desc";

  // Display property toggles for the row
  show_tier: boolean;
  show_revenue: boolean;
  show_size: boolean;
  show_requests: boolean;
  show_owner: boolean;
  show_status: boolean;
  show_domains: boolean;
}

const DEFAULTS: CustomersPrefs = {
  status: [],
  owner: [],
  revenue: [],
  size: [],
  ordering: "created",
  order_dir: "desc",
  show_tier: true,
  show_revenue: true,
  show_size: true,
  show_requests: true,
  show_owner: true,
  show_status: true,
  show_domains: false,
};

const cache = new Map<string, CustomersPrefs>();
const EVENT = "customers-prefs:changed";

function key(slug: string) {
  return `customers-prefs:${slug}`;
}

function read(slug: string): CustomersPrefs {
  const k = key(slug);
  if (cache.has(k)) return cache.get(k)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CustomersPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, prefs: CustomersPrefs) {
  const k = key(slug);
  cache.set(k, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(prefs));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug } }));
}

export function useCustomersPrefs(slug: string) {
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

  function update(patch: Partial<CustomersPrefs>) {
    write(slug, { ...prefs, ...patch });
  }

  function toggleListValue(field: "status" | "owner" | "revenue" | "size", value: string) {
    const arr = prefs[field];
    const set = new Set(arr);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    update({ [field]: Array.from(set) } as Partial<CustomersPrefs>);
  }

  function clearAllFilters() {
    update({ status: [], owner: [], revenue: [], size: [] });
  }

  return { prefs, update, toggleListValue, clearAllFilters };
}

export const REVENUE_BUCKETS: { value: string; label: string; match: (n: number | null) => boolean }[] = [
  { value: "lt_10k", label: "< $10K", match: (n) => n != null && n < 10_000 },
  { value: "10k_100k", label: "$10K – $100K", match: (n) => n != null && n >= 10_000 && n < 100_000 },
  { value: "100k_1m", label: "$100K – $1M", match: (n) => n != null && n >= 100_000 && n < 1_000_000 },
  { value: "gt_1m", label: "> $1M", match: (n) => n != null && n >= 1_000_000 },
  { value: "unknown", label: "Unknown", match: (n) => n == null },
];

export const SIZE_BUCKETS: { value: string; label: string; match: (n: number | null) => boolean }[] = [
  { value: "lt_10", label: "< 10", match: (n) => n != null && n < 10 },
  { value: "10_50", label: "10 – 50", match: (n) => n != null && n >= 10 && n < 50 },
  { value: "50_200", label: "50 – 200", match: (n) => n != null && n >= 50 && n < 200 },
  { value: "200_1000", label: "200 – 1000", match: (n) => n != null && n >= 200 && n < 1000 },
  { value: "gt_1000", label: "> 1000", match: (n) => n != null && n >= 1000 },
  { value: "unknown", label: "Unknown", match: (n) => n == null },
];

export const ORDERING_OPTIONS: { value: CustomersOrdering; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "name", label: "Name" },
  { value: "revenue", label: "Annual revenue" },
  { value: "size", label: "Size" },
  { value: "requests", label: "Requests" },
];
