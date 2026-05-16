"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  BarChart3,
  Bell,
  Box,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Compass,
  Filter,
  Folders,
  MessageSquare,
  RotateCcw,
  SlidersHorizontal,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { useInboxPrefs, type InboxOrdering, type InboxPrefs } from "@/lib/inbox-prefs";
import {
  getWorkspace,
  listInitiatives,
  listMembers,
  listProjects,
  type Initiative,
  type Member,
  type Project,
  type Team,
} from "@/lib/api";

/**
 * Twin trailing buttons for the Inbox topbar:
 *   - Filter funnel: opens "Add filter…" with nested submenus per
 *     category (Notification type, From, Team, Project, Initiative,
 *     Issue priority, Issue status type).
 *   - Display options: ordering, snoozed/read toggles, display
 *     properties pills.
 *
 * Selections persist via `useInboxPrefs` (localStorage, per-workspace)
 * and the same hook is used by the inbox list to subset rows.
 */
export function InboxTopbarControls({ workspaceSlug }: { workspaceSlug: string }) {
  const { prefs, update, toggleInList, clearFilters, activeFilterCount } = useInboxPrefs(workspaceSlug);
  // Pickers loaded lazily — only fetched when the user actually opens
  // the filter popover. Each filter category may need a different list.
  const [members, setMembers] = useState<Member[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [initiatives, setInitiatives] = useState<Initiative[] | null>(null);

  function ensurePickers() {
    if (members === null) listMembers(workspaceSlug).then(setMembers).catch(() => setMembers([]));
    if (teams === null) getWorkspace(workspaceSlug).then((w) => setTeams(w.teams ?? [])).catch(() => setTeams([]));
    if (projects === null) listProjects(workspaceSlug).then(setProjects).catch(() => setProjects([]));
    if (initiatives === null) listInitiatives(workspaceSlug).then(setInitiatives).catch(() => setInitiatives([]));
  }

  return (
    <span className="flex items-center gap-0.5">
      <Popover
        align="end"
        width={280}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={() => { ensurePickers(); toggle(); }}
            aria-label="Filter"
            title="Filter"
            className={clsx(
              "relative flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
              open && "bg-row-hover text-text-secondary",
            )}
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
            clearFilters={clearFilters}
            close={close}
            members={members ?? []}
            teams={teams ?? []}
            projects={projects ?? []}
            initiatives={initiatives ?? []}
          />
        )}
      </Popover>

      <Popover
        align="end"
        width={320}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Display options"
            title="Display options"
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
              open && "bg-row-hover text-text-secondary",
            )}
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
// Filter menu — top-level category list + per-category submenu.
// ---------------------------------------------------------------------------

const KIND_OPTIONS: { value: string; label: string }[] = [
  // Maps cleanly to the NotificationKind enum we emit server-side.
  { value: "assigned", label: "Assignments" },
  { value: "commented", label: "Comments and replies" },
  { value: "mentioned", label: "Mentions" },
  { value: "status_changed", label: "Status changes" },
  { value: "subscribed", label: "Subscriptions" },
];

const PRIORITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
];

const STATE_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "unstarted", label: "Unstarted" },
  { value: "started", label: "Started" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

function FilterMenu({
  prefs,
  toggleInList,
  clearFilters,
  close,
  members,
  teams,
  projects,
  initiatives,
}: {
  prefs: InboxPrefs;
  toggleInList: ReturnType<typeof useInboxPrefs>["toggleInList"];
  clearFilters: () => void;
  close: () => void;
  members: Member[];
  teams: Team[];
  projects: Project[];
  initiatives: Initiative[];
}) {
  const [search, setSearch] = useState("");

  // Each row is a hover-target that owns its own portaled submenu. A row
  // counts as "matched" if its label fuzzy-matches `search` (case-insensitive).
  const rows: FilterRowDef[] = [
    {
      key: "notif_kinds",
      label: "Notification type",
      icon: <Bell size={13} />,
      options: KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      selected: prefs.notif_kinds,
      onToggle: (v) => toggleInList("notif_kinds", v as never),
    },
    {
      key: "from_member_ids",
      label: "From",
      icon: <AtSign size={13} />,
      options: members.map((m) => ({ value: m.id, label: m.name })),
      selected: prefs.from_member_ids,
      onToggle: (v) => toggleInList("from_member_ids", v as never),
    },
    {
      key: "team_keys",
      label: "Team",
      icon: <UserIcon size={13} />,
      options: teams.map((t) => ({ value: t.key, label: t.name, color: t.icon_color })),
      selected: prefs.team_keys,
      onToggle: (v) => toggleInList("team_keys", v as never),
    },
    {
      key: "project_ids",
      label: "Project",
      icon: <Box size={13} />,
      options: projects.map((p) => ({ value: p.id, label: p.name, color: p.icon_color })),
      selected: prefs.project_ids,
      onToggle: (v) => toggleInList("project_ids", v as never),
    },
    {
      key: "initiative_ids",
      label: "Initiative",
      icon: <Compass size={13} />,
      options: initiatives.map((i) => ({ value: i.id, label: i.name, color: i.icon_color })),
      selected: prefs.initiative_ids,
      onToggle: (v) => toggleInList("initiative_ids", v as never),
    },
    {
      key: "priorities",
      label: "Issue priority",
      icon: <BarChart3 size={13} />,
      options: PRIORITY_OPTIONS.map((p) => ({ value: String(p.value), label: p.label })),
      selected: prefs.priorities.map(String),
      onToggle: (v) => toggleInList("priorities", Number(v) as never),
    },
    {
      key: "state_groups",
      label: "Issue status type",
      icon: <Circle size={13} />,
      options: STATE_GROUP_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
      selected: prefs.state_groups,
      onToggle: (v) => toggleInList("state_groups", v as never),
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
  options: FilterRowOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

/**
 * A filter category row. Hovering or clicking opens a portaled submenu
 * positioned to the right of the row (or left if it would overflow the
 * viewport). The submenu has its own search input + checkbox list, and
 * stays open while the cursor is over it.
 */
function FilterRow({ row }: { row: FilterRowDef }) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => setMounted(true), []);

  // Recompute position whenever the submenu opens / window scrolls.
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

  // Hover-keepalive: keep submenu open while cursor sits on either the
  // row or the submenu. A small close delay lets users move diagonally
  // between the two without the menu snapping shut.
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
        {row.selected.length > 0 && (
          <span className="text-mini text-text-tertiary">{row.selected.length}</span>
        )}
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && mounted && createPortal(
        <div
          ref={subRef}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          // Parent Popover closes on any mousedown that lands outside
          // its DOM subtree. We're portaled, so swallow mousedown to
          // keep the parent open.
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
                    {checked && <CheckSvg />}
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

function DisplayMenu({
  prefs,
  update,
}: {
  prefs: InboxPrefs;
  update: (patch: Partial<InboxPrefs>) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-small text-text-secondary">Ordering</span>
        <OrderingPicker value={prefs.ordering} onChange={(v) => update({ ordering: v })} />
      </div>
      <Toggle label="Show snoozed" value={prefs.show_snoozed} onChange={(v) => update({ show_snoozed: v })} />
      <Toggle label="Show read" value={prefs.show_read} onChange={(v) => update({ show_read: v })} />
      <Toggle label="Show unread first" value={prefs.show_unread_first} onChange={(v) => update({ show_unread_first: v })} />
      <hr className="my-2 border-border-subtle" />
      <div className="px-3 pb-1 pt-0.5 text-small text-text-secondary">Display properties</div>
      <div className="flex flex-wrap gap-1.5 px-3 py-1.5">
        <DisplayPill active={prefs.show_id} onClick={() => update({ show_id: !prefs.show_id })}>ID</DisplayPill>
        <DisplayPill active={prefs.show_status_icon} onClick={() => update({ show_status_icon: !prefs.show_status_icon })}>
          Status and icon
        </DisplayPill>
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
      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
    >
      <span>{label}</span>
      <span
        className={clsx(
          "relative inline-flex h-[14px] w-[24px] shrink-0 items-center rounded-pill transition-colors",
          value ? "bg-accent" : "bg-input",
        )}
      >
        <span
          className={clsx(
            "absolute h-[10px] w-[10px] rounded-pill bg-white shadow-sm transition-transform",
            value ? "translate-x-[12px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}

function DisplayPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-pill px-2.5 py-0.5 text-mini",
        active
          ? "bg-row-selected text-text-primary"
          : "bg-pill text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function OrderingPicker({
  value,
  onChange,
}: {
  value: InboxOrdering;
  onChange: (v: InboxOrdering) => void;
}) {
  return (
    <Popover
      align="end"
      width={120}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "flex items-center gap-1 rounded-md px-2 py-0.5 text-mini text-text-secondary hover:bg-row-hover",
            open && "bg-row-hover",
          )}
        >
          {value === "newest" ? "Newest" : "Oldest"}
          <ChevronDown size={11} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {(["newest", "oldest"] as InboxOrdering[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); close(); }}
              className={clsx(
                "flex w-full items-center px-2.5 py-1.5 text-left text-small hover:bg-row-hover",
                value === opt ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {opt === "newest" ? "Newest" : "Oldest"}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

// Re-exports so unused-import warnings don't surface for icons used only
// by callers that import this file's KIND_OPTIONS etc.
void MessageSquare;
void RotateCcw;
void UserPlus;
void Folders;
