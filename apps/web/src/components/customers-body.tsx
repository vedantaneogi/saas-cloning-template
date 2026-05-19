"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  User as UserIcon,
  Users,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import { CustomerCreateModal } from "@/components/customer-create-modal";
import { Popover } from "@/components/popover";
import {
  ORDERING_OPTIONS,
  REVENUE_BUCKETS,
  SIZE_BUCKETS,
  useCustomersPrefs,
  type CustomersOrdering,
  type CustomersPrefs,
} from "@/lib/customers-prefs";
import { useHydrated } from "@/lib/use-hydrated";
import type { Customer, Member } from "@/lib/api";

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "active", label: "Active", color: "#5e6ad2" },
  { value: "prospect", label: "Prospect", color: "#4cb782" },
  { value: "churned", label: "Churned", color: "#eb5757" },
  { value: "lost", label: "Lost", color: "#f2994a" },
];

const DISPLAY_PROPS: { key: keyof CustomersPrefs; label: string }[] = [
  { key: "show_requests", label: "Requests" },
  { key: "show_revenue", label: "Annual revenue" },
  { key: "show_size", label: "Size" },
  { key: "show_owner", label: "Owner" },
  { key: "show_status", label: "Status" },
  { key: "show_tier", label: "Tier" },
  { key: "show_domains", label: "Domains" },
];

export function CustomersBody({
  workspaceSlug,
  members,
  initial,
}: {
  workspaceSlug: string;
  members: Member[];
  initial: Customer[];
}) {
  const [customers, setCustomers] = useState<Customer[]>(initial);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const { prefs, update, toggleListValue, clearAllFilters } = useCustomersPrefs(workspaceSlug);
  const hydrated = useHydrated();

  const activeStatus = hydrated ? prefs.status : [];
  const activeOwner = hydrated ? prefs.owner : [];
  const activeRevenue = hydrated ? prefs.revenue : [];
  const activeSize = hydrated ? prefs.size : [];
  const activeFilterCount =
    activeStatus.length + activeOwner.length + activeRevenue.length + activeSize.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = customers.filter((c) => {
      if (activeStatus.length > 0 && !activeStatus.includes(c.status)) return false;
      if (activeOwner.length > 0) {
        const ownerId = c.owner?.id ?? "_none";
        if (!activeOwner.includes(ownerId)) return false;
      }
      if (activeRevenue.length > 0) {
        const matchesBucket = activeRevenue.some((b) =>
          REVENUE_BUCKETS.find((x) => x.value === b)?.match(c.annual_revenue),
        );
        if (!matchesBucket) return false;
      }
      if (activeSize.length > 0) {
        const matchesBucket = activeSize.some((b) =>
          SIZE_BUCKETS.find((x) => x.value === b)?.match(c.size),
        );
        if (!matchesBucket) return false;
      }
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.domains.some((d) => d.toLowerCase().includes(q))) return true;
      return false;
    });
    return sortCustomers(out, prefs.ordering, prefs.order_dir);
  }, [
    customers,
    search,
    activeStatus,
    activeOwner,
    activeRevenue,
    activeSize,
    prefs.ordering,
    prefs.order_dir,
  ]);

  const isEmpty = customers.length === 0;
  const chipCls =
    "relative flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle transition-colors";

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <h1 className="truncate text-small font-semibold text-text-primary">Customers</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New customer"
          title="New customer"
          className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={14} />
        </button>
      </header>

      <div className="flex h-[44px] shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <span className="flex flex-1 items-center gap-2">
          <Search size={13} className="text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by name or domain..."
            className="flex-1 bg-transparent text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
        </span>

        <Popover
          align="end"
          width={260}
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Filter"
              title="Filter"
              className={clsx(
                chipCls,
                open || activeFilterCount > 0
                  ? "bg-row-hover text-text-secondary"
                  : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
              )}
            >
              <Filter size={13} />
              {hydrated && activeFilterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 min-w-3 items-center justify-center rounded-pill bg-accent px-0.5 text-[9px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        >
          {({ close }) => (
            <FilterMenu
              members={members}
              prefs={prefs}
              toggleListValue={toggleListValue}
              clearAllFilters={() => {
                clearAllFilters();
                close();
              }}
            />
          )}
        </Popover>

        <Popover
          align="end"
          width={340}
          surface="glass"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Display options"
              title="Display options"
              className={clsx(
                chipCls,
                open
                  ? "bg-row-hover text-text-secondary"
                  : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
              )}
            >
              <SlidersHorizontal size={13} />
            </button>
          )}
        >
          {() => <DisplayMenu prefs={prefs} update={update} />}
        </Popover>
      </div>

      {isEmpty ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <CustomerRow key={c.id} workspaceSlug={workspaceSlug} customer={c} prefs={prefs} />
          ))}
          {filtered.length === 0 && (
            <div className="flex h-32 items-center justify-center text-small text-text-tertiary">
              No customers match the current filters.
            </div>
          )}
        </div>
      )}

      {creating && (
        <CustomerCreateModal
          workspaceSlug={workspaceSlug}
          members={members}
          onClose={() => setCreating(false)}
          onCreated={(c) => setCustomers((prev) => [c, ...prev])}
        />
      )}
    </>
  );
}

function sortCustomers(
  list: Customer[],
  ordering: CustomersOrdering,
  dir: "asc" | "desc",
): Customer[] {
  const out = [...list];
  out.sort((a, b) => {
    let cmp = 0;
    switch (ordering) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "revenue":
        cmp = (a.annual_revenue ?? -1) - (b.annual_revenue ?? -1);
        break;
      case "size":
        cmp = (a.size ?? -1) - (b.size ?? -1);
        break;
      case "requests":
        cmp = a.request_count - b.request_count;
        break;
      case "created":
      default:
        cmp = a.created_at.localeCompare(b.created_at);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Filter menu — Add Filter input + Advanced filter (placeholder) +
// Owner / Status / Revenue / Size with cascading submenus.
// ---------------------------------------------------------------------------

interface FilterRowOption {
  value: string;
  label: string;
  color?: string;
}

interface FilterRowDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  options: FilterRowOption[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}

function FilterMenu({
  members,
  prefs,
  toggleListValue,
  clearAllFilters,
}: {
  members: Member[];
  prefs: CustomersPrefs;
  toggleListValue: (
    field: "status" | "owner" | "revenue" | "size",
    value: string,
  ) => void;
  clearAllFilters: () => void;
}) {
  const [search, setSearch] = useState("");

  const rows: FilterRowDef[] = [
    {
      key: "advanced",
      label: "Advanced filter",
      icon: <AdvancedFilterIcon />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "owner",
      label: "Owner",
      icon: <UserIcon size={13} />,
      options: [
        { value: "_none", label: "No owner" },
        ...members.map((m) => ({ value: m.id, label: m.name, color: m.color })),
      ],
      selected: prefs.owner,
      onToggle: (v) => toggleListValue("owner", v),
    },
    {
      key: "status",
      label: "Status",
      icon: <StatusGlyph />,
      options: STATUS_OPTIONS,
      selected: prefs.status,
      onToggle: (v) => toggleListValue("status", v),
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: <Wallet size={13} />,
      options: REVENUE_BUCKETS.map((b) => ({ value: b.value, label: b.label })),
      selected: prefs.revenue,
      onToggle: (v) => toggleListValue("revenue", v),
    },
    {
      key: "size",
      label: "Size",
      icon: <Users size={13} />,
      options: SIZE_BUCKETS.map((b) => ({ value: b.value, label: b.label })),
      selected: prefs.size,
      onToggle: (v) => toggleListValue("size", v),
    },
  ];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.label.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, JSON.stringify(rows.map((r) => [r.key, r.selected.length]))]);

  const anyActive =
    prefs.status.length + prefs.owner.length + prefs.revenue.length + prefs.size.length > 0;

  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-2.5 pb-1 pt-1">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Add Filter..."
          className="flex-1 bg-transparent text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
        />
        <span className="ml-2 rounded-sm bg-pill px-1 text-micro font-mono text-text-tertiary">F</span>
      </div>
      <hr className="my-1 border-border-subtle" />
      {filteredRows.map((row) => (
        <FilterRow key={row.key} row={row} />
      ))}
      {filteredRows.length === 0 && (
        <div className="px-3 py-2 text-mini text-text-tertiary">No filters match.</div>
      )}
      {anyActive && (
        <>
          <hr className="my-1 border-border-subtle" />
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}

function FilterRow({ row }: { row: FilterRowDef }) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function recompute() {
      const r = rowRef.current?.getBoundingClientRect();
      const s = subRef.current;
      if (!r || !s) return;
      const sw = s.offsetWidth;
      const sh = s.offsetHeight;
      const gutter = 8;
      let left = r.right + 6;
      if (left + sw > window.innerWidth - gutter) {
        left = Math.max(gutter, r.left - sw - 6);
      }
      let top = r.top - 4;
      if (top + sh > window.innerHeight - gutter) {
        top = Math.max(gutter, window.innerHeight - sh - gutter);
      }
      setPos({ top, left });
    }
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open]);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return row.options;
    const q = search.trim().toLowerCase();
    return row.options.filter((o) => o.label.toLowerCase().includes(q));
  }, [search, row.options]);

  if (row.disabled) {
    return (
      <button
        type="button"
        disabled
        title="Coming soon"
        className="flex w-full cursor-default items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary opacity-70"
      >
        <span className="text-text-tertiary">{row.icon}</span>
        <span className="flex-1">{row.label}</span>
      </button>
    );
  }

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
      >
        <span className="text-text-tertiary">{row.icon}</span>
        <span className="flex-1">{row.label}</span>
        {row.selected.length > 0 && (
          <span className="text-mini text-text-tertiary">{row.selected.length}</span>
        )}
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open &&
        mounted &&
        createPortal(
          <div
            ref={subRef}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onMouseDown={(e) => e.stopPropagation()}
            className={clsx(
              "fixed z-[1210] w-[260px] overflow-hidden rounded-md bg-elevated shadow-popover",
              pos == null && "invisible",
            )}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
          >
            <div className="px-2.5 py-1">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Filter ${row.label.toLowerCase()}...`}
                className="w-full bg-transparent py-1 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
              />
            </div>
            <hr className="border-border-subtle" />
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-mini text-text-tertiary">No matches.</div>
              )}
              {filteredOptions.map((opt) => {
                const checked = row.selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      row.onToggle(opt.value);
                    }}
                    className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
                  >
                    <span
                      className={clsx(
                        "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                        checked ? "border-accent bg-accent" : "border-border-strong bg-input",
                      )}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path
                            d="M1.5 4.5L3.5 6.5L7.5 2"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {opt.color && (
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: opt.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function AdvancedFilterIcon() {
  // Wider funnel-with-bar look matching the "Advanced filter" affordance.
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4h12M4 8h8M6 12h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusGlyph() {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-[2px]"
      style={{ background: "currentColor", opacity: 0.85 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Display menu — Ordering picker + sort-direction toggle + pill chips.
// ---------------------------------------------------------------------------

function DisplayMenu({
  prefs,
  update,
}: {
  prefs: CustomersPrefs;
  update: (patch: Partial<CustomersPrefs>) => void;
}) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-small text-text-secondary">Ordering</span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              update({ order_dir: prefs.order_dir === "asc" ? "desc" : "asc" })
            }
            title={prefs.order_dir === "asc" ? "Ascending" : "Descending"}
            className="rounded-md p-1 text-text-tertiary hover:bg-white/10 hover:text-text-secondary"
          >
            <ArrowDownUp
              size={13}
              className={clsx(
                "transition-transform",
                prefs.order_dir === "asc" && "rotate-180",
              )}
            />
          </button>
          <OrderingDropdown
            value={prefs.ordering}
            onChange={(v) => update({ ordering: v })}
          />
        </span>
      </div>

      <hr className="mx-1 my-2 border-white/5" />

      <div className="px-3 pb-2 text-small text-text-secondary">Display properties</div>
      <div className="flex flex-wrap gap-2 px-3 pb-3 pt-1">
        {DISPLAY_PROPS.map((p) => {
          const active = Boolean(prefs[p.key]);
          return (
            <button
              key={p.key as string}
              type="button"
              onClick={() => update({ [p.key]: !active } as Partial<CustomersPrefs>)}
              className={clsx(
                "rounded-pill px-2.5 py-1 text-mini transition-colors",
                active
                  ? "bg-white/15 text-text-primary"
                  : "bg-white/[0.04] text-text-tertiary hover:bg-white/10 hover:text-text-secondary",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderingDropdown({
  value,
  onChange,
}: {
  value: CustomersOrdering;
  onChange: (v: CustomersOrdering) => void;
}) {
  const current = ORDERING_OPTIONS.find((o) => o.value === value)?.label ?? "Created";
  return (
    <Popover
      align="end"
      width={180}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-mini text-text-secondary hover:bg-white/10 hover:text-text-primary",
            open && "bg-white/10 text-text-primary",
          )}
        >
          {current}
          <ChevronDown size={11} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {ORDERING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                close();
              }}
              className={clsx(
                "flex w-full items-center px-2.5 py-1.5 text-left text-small hover:bg-row-hover",
                opt.value === value ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Row + empty state (mostly unchanged; now respects show_status/show_domains)
// ---------------------------------------------------------------------------

function CustomerRow({
  workspaceSlug,
  customer,
  prefs,
}: {
  workspaceSlug: string;
  customer: Customer;
  prefs: CustomersPrefs;
}) {
  return (
    <Link
      href={`/${workspaceSlug}/customer/${customer.slug}`}
      className="flex items-center gap-3 border-b border-border-subtle px-5 py-3 text-small transition-colors hover:bg-row-hover"
    >
      <CustomerGlyph customer={customer} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">{customer.name}</span>
        {prefs.show_domains && customer.domains.length > 0 && (
          <span className="block truncate text-mini text-text-tertiary">
            {customer.domains.join(", ")}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-6">
        {prefs.show_status && <StatusPill status={customer.status} />}
        {prefs.show_tier && customer.tier && (
          <span className="text-mini text-text-secondary">
            {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
          </span>
        )}
        {prefs.show_revenue && customer.annual_revenue != null && (
          <span className="text-mini text-text-secondary">
            ${customer.annual_revenue.toLocaleString("en-US")}/yr
          </span>
        )}
        {prefs.show_size && customer.size != null && (
          <span className="text-mini text-text-secondary">{customer.size} seats</span>
        )}
        {prefs.show_requests && (
          <span className="text-mini text-text-tertiary">
            {customer.request_count} {customer.request_count === 1 ? "request" : "requests"}
          </span>
        )}
        {prefs.show_owner &&
          (customer.owner ? (
            <Avatar initials={customer.owner.initials} color={customer.owner.color} size={20} />
          ) : (
            <span className="inline-block h-5 w-5 rounded-pill border border-dashed border-border-strong" />
          ))}
      </span>
    </Link>
  );
}

export function CustomerGlyph({ customer, size = 20 }: { customer: Customer; size?: number }) {
  if (customer.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customer.logo_url}
        alt={customer.name}
        className="shrink-0 rounded-sm object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = customer.name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-sm bg-pill text-mini font-semibold text-text-primary"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "prospect"
        ? "bg-purple-500/15 text-purple-300"
        : "bg-pill text-text-tertiary";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-micro font-medium",
        cls,
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-sm bg-current" />
      {label}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <CardStackIcon />
        <h2 className="mt-6 text-h2 font-semibold text-text-primary">Customers</h2>
        <p className="mt-2 text-small text-text-secondary">
          Add organizations using your product to track their feature requests and use attributes
          like revenue and size to prioritize development.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90"
          >
            Create new customer
          </button>
          <a
            href="https://linear.app/docs/customer-requests"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
          >
            <FileText size={12} />
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}

function CardStackIcon() {
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
      <rect x="14" y="22" width="42" height="34" rx="6" stroke="rgba(120,130,160,0.5)" strokeWidth="1.5" />
      <rect x="22" y="30" width="42" height="34" rx="6" stroke="rgba(140,150,180,0.5)" strokeWidth="1.5" fill="rgba(40, 44, 60, 0.4)" />
      <rect x="30" y="38" width="42" height="34" rx="6" stroke="rgba(160,170,200,0.5)" strokeWidth="1.5" fill="rgba(60, 64, 80, 0.4)" />
      <g transform="translate(40, 50)" stroke="rgba(190,200,220,0.6)" strokeWidth="1.4" fill="none">
        <circle cx="6" cy="2" r="2.2" />
        <path d="M2 9 c0 -3 3 -5 4 -5 s4 2 4 5" strokeLinecap="round" />
      </g>
      <g transform="translate(54, 42)" stroke="rgba(180,190,210,0.45)" strokeWidth="1.2" fill="none">
        <circle cx="3" cy="3" r="0.8" />
        <circle cx="6" cy="3" r="0.8" />
        <circle cx="9" cy="3" r="0.8" />
      </g>
    </svg>
  );
}
