"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";

const ORDERINGS: { value: "name" | "created" | "last_used"; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "created", label: "Created" },
  { value: "last_used", label: "Last used" },
];

const DISPLAY_PROPS: { value: "created" | "last_used" | "owner"; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "last_used", label: "Last used" },
  { value: "owner", label: "Owner" },
];

/**
 * Display-options popover for the workspace /views page. Ordering picker
 * + togglable display-property chips. Selections persist in the URL so a
 * server-rendered page (the index list) re-renders without client state.
 */
export function ViewsDisplayOptions({
  workspace,
  tab,
  sort,
  props,
}: {
  workspace: string;
  tab: "issues" | "projects";
  sort: "name" | "created" | "last_used";
  props: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`/${workspace}/views?${next.toString()}`, { scroll: false });
  }

  function toggleProp(p: string) {
    const set = new Set(props);
    if (set.has(p)) set.delete(p);
    else set.add(p);
    setParam("props", [...set].join(","));
  }

  void tab;

  const activeSortLabel = ORDERINGS.find((o) => o.value === sort)?.label ?? "Name";

  return (
    <Popover
      align="end"
      width={320}
      surface="glass"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Display options"
          className={clsx(
            "rounded-md p-1 text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary",
            open && "bg-row-hover text-text-secondary",
          )}
        >
          <SlidersHorizontal size={13} />
        </button>
      )}
    >
      {() => (
        <div className="p-3">
          <header className="flex items-center justify-between pb-2 text-mini text-text-tertiary">
            <span>Ordering</span>
            <Popover
              align="end"
              width={180}
              surface="glass"
              trigger={({ toggle: t2, open: o2 }) => (
                <button
                  type="button"
                  onClick={t2}
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-md border border-border-subtle bg-white/[0.03] px-2 py-1 text-mini text-text-secondary hover:bg-white/[0.06]",
                    o2 && "bg-white/[0.06] text-text-primary",
                  )}
                >
                  <ArrowUpDown size={11} />
                  <span>{activeSortLabel}</span>
                  <ChevronDown size={10} />
                </button>
              )}
            >
              {({ close }) => (
                <PopoverList>
                  {ORDERINGS.map((o) => (
                    <PopoverItem
                      key={o.value}
                      active={sort === o.value}
                      onClick={() => {
                        setParam("sort", o.value === "name" ? null : o.value);
                        close();
                      }}
                    >
                      {o.label}
                    </PopoverItem>
                  ))}
                </PopoverList>
              )}
            </Popover>
          </header>

          <div className="mt-3 text-mini text-text-tertiary">Display properties</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DISPLAY_PROPS.map((p) => {
              const on = props.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => toggleProp(p.value)}
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-mini transition-colors",
                    on
                      ? "bg-elevated text-text-primary ring-1 ring-white/[0.08]"
                      : "text-text-tertiary ring-1 ring-border-subtle hover:bg-row-hover hover:text-text-secondary",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Popover>
  );
}

/**
 * Rounded-pill tab for Issues / Projects on the /views page. Server-side
 * navigates via Link with `?tab=` so the list refetches with the right scope.
 */
export function ViewsTabPill({
  workspace,
  value,
  active,
  children,
}: {
  workspace: string;
  value: "issues" | "projects";
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/${workspace}/views?tab=${value}`}
      scroll={false}
      className={clsx(
        "rounded-full px-3 py-1 text-small font-medium transition-colors",
        active
          ? "bg-elevated text-text-primary ring-1 ring-white/[0.08]"
          : "text-text-tertiary ring-1 ring-border-subtle hover:bg-row-hover hover:text-text-secondary",
      )}
    >
      {children}
    </Link>
  );
}
