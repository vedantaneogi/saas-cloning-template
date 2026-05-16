"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  Circle,
  Filter,
  SlidersHorizontal,
  User as UserIcon,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { useSearchPrefs, type SearchOrdering, type SearchPrefs, type DateFilter } from "@/lib/search-prefs";
import {
  getWorkspace,
  listMembers,
  type Member,
  type Team,
} from "@/lib/api";

/**
 * Twin trailing buttons on the /search page sub-row: filter funnel +
 * display options sliders, matching the Linear screenshot.
 */
export function SearchControls({ workspaceSlug }: { workspaceSlug: string }) {
  const { prefs, update, toggleInList, clearFilters, activeFilterCount } = useSearchPrefs(workspaceSlug);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);

  function ensurePickers() {
    if (members === null) listMembers(workspaceSlug).then(setMembers).catch(() => setMembers([]));
    if (teams === null) getWorkspace(workspaceSlug).then((w) => setTeams(w.teams ?? [])).catch(() => setTeams([]));
  }

  const chipCls =
    "relative flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary";

  return (
    <span className="flex items-center gap-1.5">
      <Popover
        align="end"
        width={280}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={() => { ensurePickers(); toggle(); }}
            aria-label="Filter"
            title="Filter"
            className={clsx(chipCls, open && "border-border-strong bg-row-hover text-text-secondary")}
          >
            <Filter size={13} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 min-w-3 items-center justify-center rounded-pill bg-accent px-0.5 text-[9px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      >
        {({ close }) => (
          <FilterMenu
            prefs={prefs}
            toggleInList={toggleInList}
            update={update}
            clearFilters={clearFilters}
            close={close}
            members={members ?? []}
            teams={teams ?? []}
          />
        )}
      </Popover>

      <Popover
        align="end"
        width={320}
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
        {() => <DisplayMenu prefs={prefs} update={update} />}
      </Popover>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter menu
// ---------------------------------------------------------------------------

const STATUS_GROUP_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "unstarted", label: "Unstarted" },
  { value: "started", label: "Started" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "past_day", label: "Past day" },
  { value: "past_week", label: "Past week" },
  { value: "past_month", label: "Past month" },
];

function FilterMenu({
  prefs,
  toggleInList,
  update,
  clearFilters,
  close,
  members,
  teams,
}: {
  prefs: SearchPrefs;
  toggleInList: ReturnType<typeof useSearchPrefs>["toggleInList"];
  update: (patch: Partial<SearchPrefs>) => void;
  clearFilters: () => void;
  close: () => void;
  members: Member[];
  teams: Team[];
}) {
  const [search, setSearch] = useState("");

  const rows: FilterRowDef[] = [
    {
      key: "advanced",
      label: "Advanced filter",
      icon: <Filter size={13} />,
      disabled: true,
      kind: "list",
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "team_keys",
      label: "Team",
      icon: <Users size={13} />,
      kind: "list",
      options: teams.map((t) => ({ value: t.key, label: t.name, color: t.icon_color })),
      selected: prefs.team_keys,
      onToggle: (v) => toggleInList("team_keys", v as never),
    },
    {
      key: "status_groups",
      label: "Status type",
      icon: <Circle size={13} />,
      kind: "list",
      options: STATUS_GROUP_OPTIONS,
      selected: prefs.status_groups,
      onToggle: (v) => toggleInList("status_groups", v as never),
    },
    {
      key: "assignee_ids",
      label: "Assignee / Lead",
      icon: <UserIcon size={13} />,
      kind: "list",
      options: members.map((m) => ({ value: m.id, label: m.name })),
      selected: prefs.assignee_ids,
      onToggle: (v) => toggleInList("assignee_ids", v as never),
    },
    {
      key: "creator_ids",
      label: "Creator",
      icon: <AtSign size={13} />,
      kind: "list",
      options: members.map((m) => ({ value: m.id, label: m.name })),
      selected: prefs.creator_ids,
      onToggle: (v) => toggleInList("creator_ids", v as never),
    },
    {
      key: "updated_date",
      label: "Updated date",
      icon: <Calendar size={13} />,
      kind: "single",
      options: DATE_OPTIONS,
      selected: [prefs.updated_date],
      onToggle: (v) => update({ updated_date: v as DateFilter }),
    },
    {
      key: "created_date",
      label: "Created date",
      icon: <Calendar size={13} />,
      kind: "single",
      options: DATE_OPTIONS,
      selected: [prefs.created_date],
      onToggle: (v) => update({ created_date: v as DateFilter }),
    },
  ];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.label.toLowerCase().includes(q));
  }, [search, rows]);

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
        onClick={() => { clearFilters(); close(); }}
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
  /**
   * "list" = multi-select checkboxes; "single" = radio-style picker
   * (used for the date dimensions where only one window applies at a
   * time).
   */
  kind: "list" | "single";
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
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary opacity-70 cursor-default"
      >
        <span className="text-text-tertiary">{row.icon}</span>
        <span className="flex-1">{row.label}</span>
      </button>
    );
  }

  // For "single"-kind rows, treat the row's `selected[0]` as the
  // currently picked value; "list" rows are normal multi-select.
  const activeIndicator =
    row.kind === "single"
      ? row.selected[0] !== "any" && row.selected[0] !== undefined
        ? 1
        : 0
      : row.selected.length;

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
        {activeIndicator > 0 && (
          <span className="text-mini text-text-tertiary">{activeIndicator}</span>
        )}
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && mounted && createPortal(
        <div
          ref={subRef}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onMouseDown={(e) => e.stopPropagation()}
          className={clsx(
            "fixed z-[1210] w-[240px] overflow-hidden rounded-md bg-elevated shadow-popover",
            pos == null && "invisible",
          )}
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
        >
          {row.kind === "list" && (
            <>
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
            </>
          )}
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
                  {row.kind === "list" ? (
                    <span className={clsx(
                      "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                      checked ? "border-accent bg-accent" : "border-border-strong bg-input",
                    )}>
                      {checked && <CheckSvg />}
                    </span>
                  ) : (
                    <span className={clsx(
                      "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-pill border",
                      checked ? "border-accent" : "border-border-strong",
                    )}>
                      {checked && <span className="block h-1.5 w-1.5 rounded-pill bg-accent" />}
                    </span>
                  )}
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

function CheckSvg() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Display options menu
// ---------------------------------------------------------------------------

const ORDERING_OPTIONS: { value: SearchOrdering; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
];

function DisplayMenu({
  prefs,
  update,
}: {
  prefs: SearchPrefs;
  update: (patch: Partial<SearchPrefs>) => void;
}) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-small text-text-secondary">Ordering</span>
        <OrderingPicker value={prefs.ordering} onChange={(v) => update({ ordering: v })} />
      </div>
      <Toggle
        label="Include archived"
        value={prefs.include_archived}
        onChange={(v) => update({ include_archived: v })}
      />

      <hr className="mx-1 my-2 border-white/5" />

      <div className="px-3 pb-2 text-small text-text-secondary">Display properties</div>
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => update({ show_id: !prefs.show_id })}
          className={clsx(
            "rounded-pill px-2.5 py-1 text-mini transition-colors",
            prefs.show_id
              ? "bg-white/15 text-text-primary"
              : "bg-white/[0.04] text-text-tertiary hover:bg-white/10 hover:text-text-secondary",
          )}
        >
          ID
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
    >
      <span>{label}</span>
      <span
        className={clsx(
          "relative inline-flex h-[16px] w-[28px] shrink-0 items-center rounded-pill transition-colors",
          value ? "bg-accent" : "bg-white/15",
        )}
      >
        <span
          className={clsx(
            "absolute h-[12px] w-[12px] rounded-pill bg-white shadow-sm transition-transform",
            value ? "translate-x-[14px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}

function OrderingPicker({
  value,
  onChange,
}: {
  value: SearchOrdering;
  onChange: (v: SearchOrdering) => void;
}) {
  const current = ORDERING_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
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
