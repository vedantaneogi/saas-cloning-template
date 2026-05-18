"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AtSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
  HeartPulse,
  SlidersHorizontal,
  User as UserIcon,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { listMembers, type Member, type Team } from "@/lib/api";
import {
  resetInitiativesPrefs,
  useInitiativesPrefs,
  type InitiativesGrouping,
  type InitiativesOrdering,
  type InitiativesPrefs,
} from "@/lib/initiatives-prefs";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Two round-chip controls (Filter / Display) on the initiatives page.
 * Filter writes selected owner / team / date / health buckets to URL
 * params; the page reads them and filters the server-rendered list
 * client-side. Display writes to per-workspace localStorage
 * (initiatives-prefs.ts) so column visibility and ordering survive
 * across navigations.
 */
export function InitiativesControls({
  workspaceSlug,
  teams,
}: {
  workspaceSlug: string;
  teams: Team[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hydrated = useHydrated();

  const [members, setMembers] = useState<Member[]>([]);
  const { prefs, update } = useInitiativesPrefs(workspaceSlug);

  useEffect(() => {
    listMembers(workspaceSlug).then(setMembers).catch(() => {});
  }, [workspaceSlug]);

  function readList(key: string): string[] {
    const v = params.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  }

  function writeList(key: string, values: string[]) {
    const sp = new URLSearchParams(params.toString());
    if (values.length === 0) sp.delete(key);
    else sp.set(key, values.join(","));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleListValue(key: string, value: string) {
    const current = readList(key);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    writeList(key, next);
  }

  function clearAllFilters() {
    const sp = new URLSearchParams(params.toString());
    ["owner", "team", "health", "date"].forEach((k) => sp.delete(k));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const activeCount =
    readList("owner").length +
    readList("team").length +
    readList("health").length +
    readList("date").length;

  const chipCls =
    "relative flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary";

  return (
    <span className="flex items-center gap-1.5">
      <Popover
        align="end"
        width={260}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Filter"
            title="Filter"
            className={clsx(chipCls, open && "border-border-strong bg-row-hover text-text-secondary")}
          >
            <Filter size={13} />
            {hydrated && activeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 min-w-3 items-center justify-center rounded-pill bg-accent px-0.5 text-[9px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>
        )}
      >
        {({ close }) => (
          <FilterMenu
            members={members}
            teams={teams}
            readList={readList}
            toggleListValue={toggleListValue}
            clearAllFilters={() => { clearAllFilters(); close(); }}
          />
        )}
      </Popover>

      <Popover
        align="end"
        width={360}
        surface="glass"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Display options"
            title="Display options"
            className={clsx(chipCls, open && "border-border-strong bg-row-hover text-text-secondary")}
          >
            <SlidersHorizontal size={13} />
          </button>
        )}
      >
        {() => (
          <DisplayMenu
            prefs={prefs}
            update={update}
            reset={() => resetInitiativesPrefs(workspaceSlug)}
          />
        )}
      </Popover>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter menu — matches image #20: Advanced / Owner / Creator / Teams /
// Health / Dates. Rows the model doesn't back yet (Creator, Advanced) are
// rendered disabled in the same way team-issues handles its placeholder
// rows.
// ---------------------------------------------------------------------------

function FilterMenu({
  members,
  teams,
  readList,
  toggleListValue,
  clearAllFilters,
}: {
  members: Member[];
  teams: Team[];
  readList: (key: string) => string[];
  toggleListValue: (key: string, value: string) => void;
  clearAllFilters: () => void;
}) {
  const [search, setSearch] = useState("");

  const HEALTH_OPTIONS = [
    { value: "on_track", label: "On track", color: "#22c55e" },
    { value: "at_risk", label: "At risk", color: "#f59e0b" },
    { value: "off_track", label: "Off track", color: "#ef4444" },
    { value: "no_update", label: "No updates", color: "#71717a" },
  ];

  const DATE_OPTIONS = [
    { value: "due_this_month", label: "Target this month" },
    { value: "due_next_month", label: "Target next month" },
    { value: "overdue", label: "Overdue" },
    { value: "no_target", label: "No target" },
  ];

  const rows: FilterRowDef[] = [
    { key: "advanced", label: "Advanced filter", icon: <Filter size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "owner",
      label: "Owner",
      icon: <UserIcon size={13} />,
      options: [
        { value: "_none", label: "No owner" },
        ...members.map((m) => ({ value: m.id, label: m.name, color: m.color })),
      ],
      selected: readList("owner"),
      onToggle: (v) => toggleListValue("owner", v),
    },
    { key: "creator", label: "Creator", icon: <AtSign size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "team",
      label: "Teams",
      icon: <Users size={13} />,
      options: teams.map((t) => ({ value: t.key, label: t.name, color: t.icon_color })),
      selected: readList("team"),
      onToggle: (v) => toggleListValue("team", v),
    },
    {
      key: "health",
      label: "Health",
      icon: <HeartPulse size={13} />,
      options: HEALTH_OPTIONS,
      selected: readList("health"),
      onToggle: (v) => toggleListValue("health", v),
    },
    {
      key: "date",
      label: "Dates",
      icon: <Calendar size={13} />,
      options: DATE_OPTIONS,
      selected: readList("date"),
      onToggle: (v) => toggleListValue("date", v),
    },
  ];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.label.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, JSON.stringify(rows.map((r) => [r.key, r.selected.length]))]);

  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-2.5 pb-1 pt-0.5">
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
      <hr className="my-1 border-border-subtle" />
      <button
        type="button"
        onClick={clearAllFilters}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
      >
        <span>Clear all filters</span>
      </button>
    </div>
  );
}

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
        className="flex w-full cursor-default items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary opacity-70"
      >
        <span className="text-text-tertiary">{row.icon}</span>
        <span className="flex-1">{row.label}</span>
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
    );
  }

  const trailingHint =
    row.selected.length > 0 ? (
      <span className="text-mini text-text-tertiary">{row.selected.length}</span>
    ) : null;

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
      >
        <span className="text-text-tertiary">{row.icon}</span>
        <span className="flex-1">{row.label}</span>
        {trailingHint}
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && mounted && createPortal(
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
              placeholder="Filter..."
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
                  onClick={(e) => { e.stopPropagation(); row.onToggle(opt.value); }}
                  className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
                >
                  <span className={clsx(
                    "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                    checked ? "border-accent bg-accent" : "border-border-strong bg-input",
                  )}>
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// ---------------------------------------------------------------------------
// Display menu — image #21.
// ---------------------------------------------------------------------------

const GROUPING_OPTIONS: { value: InitiativesGrouping; label: string }[] = [
  { value: "no_grouping", label: "No grouping" },
  { value: "owner", label: "Owner" },
  { value: "status", label: "Status" },
];

const ORDERING_OPTIONS: { value: InitiativesOrdering; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "name", label: "Name" },
  { value: "target", label: "Target date" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Recently updated" },
];

interface DisplayPropMeta {
  key: keyof InitiativesPrefs;
  label: string;
}

const DISPLAY_PROPS: DisplayPropMeta[] = [
  { key: "show_description", label: "Description" },
  { key: "show_owner", label: "Owner" },
  { key: "show_start_date", label: "Start date" },
  { key: "show_target_date", label: "Target date" },
  { key: "show_completed", label: "Completed" },
  { key: "show_updated", label: "Updated" },
  { key: "show_created", label: "Created" },
  { key: "show_teams", label: "Teams" },
  { key: "show_initiative_health", label: "Initiative Health" },
  { key: "show_projects", label: "Projects" },
  { key: "show_active_projects", label: "Active Projects" },
];

function DisplayMenu({
  prefs,
  update,
  reset,
}: {
  prefs: InitiativesPrefs;
  update: (patch: Partial<InitiativesPrefs>) => void;
  reset: () => void;
}) {
  return (
    <div className="px-2 py-2">
      <div className="space-y-1 px-1 pb-2">
        <PickerRow label="Grouping">
          <DropdownPicker
            value={prefs.grouping}
            options={GROUPING_OPTIONS}
            onChange={(v) => update({ grouping: v })}
          />
        </PickerRow>
        <PickerRow label="Ordering">
          <DropdownPicker
            value={prefs.ordering}
            options={ORDERING_OPTIONS}
            onChange={(v) => update({ ordering: v })}
          />
        </PickerRow>
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
              onClick={() => update({ [p.key]: !active } as Partial<InitiativesPrefs>)}
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

      <hr className="mx-1 my-1 border-white/5" />

      <div className="flex items-center justify-between px-3 py-2 text-mini">
        <button
          type="button"
          onClick={reset}
          className="rounded-md px-2 py-1 text-text-secondary hover:bg-white/5 hover:text-text-primary"
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-accent hover:bg-accent/10"
          title="Coming soon"
        >
          Set default for everyone
        </button>
      </div>
    </div>
  );
}

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-small text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function DropdownPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.value === value)?.label ?? String(value);
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
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); close(); }}
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
