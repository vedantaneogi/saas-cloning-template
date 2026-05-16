"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  BarChart3,
  Bot,
  Box,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  CornerUpRight,
  FileText,
  Filter,
  Layers,
  LayoutList,
  Link as LinkIcon,
  Lock,
  PanelRight,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  User as UserIcon,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import {
  useMyIssuesPrefs,
  type CompletedWindow,
  type MyIssuesGrouping,
  type MyIssuesOrdering,
  type MyIssuesPrefs,
} from "@/lib/my-issues-prefs";
import {
  getWorkspace,
  listMembers,
  listProjects,
  listWorkspaceLabels,
  type Label,
  type Member,
  type Project,
} from "@/lib/api";

/**
 * Twin trailing buttons on the My issues sub-row: filter funnel + display
 * options sliders. Mirrors the inbox-filters component but with the
 * dimensions Linear surfaces on issue lists (Status / Priority / Labels
 * / Project / Cycle as filters; List|Board / Grouping / Ordering /
 * Completed window / Display properties as display options).
 *
 * Selections persist via `useMyIssuesPrefs` (per-workspace localStorage)
 * and the same hook drives the issue list rendering.
 */
export function MyIssuesControls({ workspaceSlug }: { workspaceSlug: string }) {
  const { prefs, update, toggleInList, clearFilters, activeFilterCount } = useMyIssuesPrefs(workspaceSlug);
  // Lazy-load workspace lookups when the user opens the funnel — keep
  // the page's initial render lean.
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [cycles, setCycles] = useState<{ id: string; name: string; team_key: string }[] | null>(null);

  function ensurePickers() {
    if (labels === null) listWorkspaceLabels(workspaceSlug).then(setLabels).catch(() => setLabels([]));
    if (projects === null) listProjects(workspaceSlug).then(setProjects).catch(() => setProjects([]));
    if (members === null) listMembers(workspaceSlug).then(setMembers).catch(() => setMembers([]));
    if (cycles === null) {
      // Build a flat cycle list by fetching active+upcoming per team.
      getWorkspace(workspaceSlug)
        .then(async (w) => {
          const all: { id: string; name: string; team_key: string }[] = [];
          for (const t of w.teams ?? []) {
            try {
              const { getActiveCycle } = await import("@/lib/api");
              const c = await getActiveCycle(workspaceSlug, t.key);
              if (c) all.push({ id: c.id, name: `${t.key} Cycle ${c.number}`, team_key: t.key });
            } catch {
              // skip teams without cycles
            }
          }
          setCycles(all);
        })
        .catch(() => setCycles([]));
    }
  }

  // Each trailing button is a pill-outlined chip to match Linear — same
  // outline weight + radius as the Assigned / Created / Subscribed /
  // Activity tabs so the whole row reads as one consistent control bar.
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
            clearFilters={clearFilters}
            close={close}
            update={update}
            labels={labels ?? []}
            projects={projects ?? []}
            cycles={cycles ?? []}
            members={members ?? []}
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
        {() => <DisplayMenu prefs={prefs} update={update} />}
      </Popover>

      {/*
        Third button — toggles the right-side insights panel (Labels /
        Priority / Projects / Teams breakdowns of the currently visible
        issue list). No popover; just flips a pref the MyIssuesBody
        reads to mount the side rail.
      */}
      <button
        type="button"
        onClick={() => update({ insights_open: !prefs.insights_open })}
        aria-label="Toggle insights panel"
        aria-pressed={prefs.insights_open}
        title="Insights panel"
        className={clsx(chipCls, prefs.insights_open && "border-border-strong bg-row-hover text-text-secondary")}
      >
        <PanelRight size={13} />
      </button>
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

const PRIORITY_OPTIONS = [
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
  { value: 0, label: "No priority" },
];

function FilterMenu({
  prefs,
  toggleInList,
  update,
  clearFilters,
  close,
  labels,
  projects,
  cycles,
  members,
}: {
  prefs: MyIssuesPrefs;
  toggleInList: ReturnType<typeof useMyIssuesPrefs>["toggleInList"];
  update: (patch: Partial<MyIssuesPrefs>) => void;
  clearFilters: () => void;
  close: () => void;
  labels: Label[];
  projects: Project[];
  cycles: { id: string; name: string; team_key: string }[];
  members: Member[];
}) {
  const [search, setSearch] = useState("");

  // Filter row catalog. Each row is either:
  //   - real:        wired to a prefs field, mutations land via toggleInList / update
  //   - decorative:  shown to match Linear's surface area but disabled because the
  //                  underlying data doesn't exist in this clone (AI/Agent/etc.)
  const rows: FilterRowDef[] = [
    { key: "ai_filter", label: "AI filter", icon: <Sparkles size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    { key: "advanced_filter", label: "Advanced filter", icon: <Filter size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "status_groups",
      label: "Status",
      icon: <Circle size={13} />,
      options: STATUS_GROUP_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
      selected: prefs.status_groups,
      onToggle: (v) => toggleInList("status_groups", v as never),
    },
    {
      key: "assignee_ids",
      label: "Assignee",
      icon: <UserIcon size={13} />,
      options: members.map((m) => ({ value: m.id, label: m.name })),
      selected: prefs.assignee_ids,
      onToggle: (v) => toggleInList("assignee_ids", v as never),
    },
    {
      key: "agent",
      label: "Agent",
      icon: <Bot size={13} />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "creator_ids",
      label: "Creator",
      icon: <AtSign size={13} />,
      options: members.map((m) => ({ value: m.id, label: m.name })),
      selected: prefs.creator_ids,
      onToggle: (v) => toggleInList("creator_ids", v as never),
    },
    {
      key: "priorities",
      label: "Priority",
      icon: <BarChart3 size={13} />,
      options: PRIORITY_OPTIONS.map((p) => ({ value: String(p.value), label: p.label })),
      selected: prefs.priorities.map(String),
      onToggle: (v) => toggleInList("priorities", Number(v) as never),
    },
    {
      key: "label_ids",
      label: "Labels",
      icon: <Tag size={13} />,
      options: labels.map((l) => ({ value: l.id, label: l.name, color: l.color })),
      selected: prefs.label_ids,
      onToggle: (v) => toggleInList("label_ids", v as never),
    },
    {
      key: "relations_filter",
      label: "Relations",
      icon: <CornerUpRight size={13} />,
      kind: "single",
      options: [
        { value: "any", label: "Any" },
        { value: "with_relations", label: "Has relations" },
        { value: "no_relations", label: "No relations" },
      ],
      selected: [prefs.relations_filter],
      onToggle: (v) => update({ relations_filter: v as MyIssuesPrefs["relations_filter"] }),
    },
    {
      key: "suggested_label",
      label: "Suggested label",
      icon: <Sparkles size={13} />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "date_filter",
      label: "Dates",
      icon: <Calendar size={13} />,
      kind: "single",
      options: [
        { value: "any", label: "Any" },
        { value: "due", label: "Has due date" },
        { value: "no_due", label: "No due date" },
        { value: "overdue", label: "Overdue" },
      ],
      selected: [prefs.date_filter],
      onToggle: (v) => update({ date_filter: v as MyIssuesPrefs["date_filter"] }),
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
      key: "project_properties",
      label: "Project properties",
      icon: <Box size={13} />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "cycle_ids",
      label: "Cycle",
      icon: <Target size={13} />,
      options: cycles.map((c) => ({ value: c.id, label: c.name })),
      selected: prefs.cycle_ids,
      onToggle: (v) => toggleInList("cycle_ids", v as never),
    },
    {
      key: "added_to_cycle",
      label: "Added to cycle",
      icon: <Target size={13} />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "subscriber_ids",
      label: "Subscribers",
      icon: <Users size={13} />,
      options: members.map((m) => ({ value: m.id, label: m.name })),
      selected: prefs.subscriber_ids,
      onToggle: (v) => toggleInList("subscriber_ids", v as never),
    },
    {
      key: "auto_closed",
      label: "Auto-closed",
      icon: <Lock size={13} />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
    },
    {
      key: "search_query",
      label: "Content",
      icon: <ScrollText size={13} />,
      kind: "search",
      searchValue: prefs.search_query,
      onSearchChange: (v) => update({ search_query: v }),
      options: [],
      selected: prefs.search_query.trim() ? [prefs.search_query] : [],
      onToggle: () => undefined,
    },
    {
      key: "links_filter",
      label: "Links",
      icon: <LinkIcon size={13} />,
      kind: "single",
      options: [
        { value: "any", label: "Any" },
        { value: "with_links", label: "Has links" },
        { value: "no_links", label: "No links" },
      ],
      selected: [prefs.links_filter],
      onToggle: (v) => update({ links_filter: v as MyIssuesPrefs["links_filter"] }),
    },
    {
      key: "template",
      label: "Template",
      icon: <FileText size={13} />,
      disabled: true,
      options: [],
      selected: [],
      onToggle: () => undefined,
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
  disabled?: boolean;
  /**
   * "list" (default) = multi-select checkboxes, with a free-text search
   * input at the top of the submenu. "single" = radio-style picker
   * (Dates / Relations / Links — only one window applies at a time).
   * "search" = no options, just a single text input the user types into
   * (Content filter).
   */
  kind?: "list" | "single" | "search";
  /** For kind="search" only — controlled input value. */
  searchValue?: string;
  onSearchChange?: (v: string) => void;
}

/**
 * A filter category row with a portaled submenu of checkboxes. Rows
 * marked `disabled` (AI filter / Advanced filter) render as decorative
 * Linear-style placeholders without opening a submenu — keeping the
 * surface area visually faithful without faking working features.
 */
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

  const kind = row.kind ?? "list";

  // Active-count chip shown on the row spine. "list" multi-selects show
  // the number of picks; "single" hides "any" (the default no-op state)
  // but shows the active value's label so the row reads as set; "search"
  // shows a dot when the text isn't empty.
  let trailingHint: React.ReactNode = null;
  if (kind === "list" && row.selected.length > 0) {
    trailingHint = <span className="text-mini text-text-tertiary">{row.selected.length}</span>;
  } else if (kind === "single" && row.selected[0] && row.selected[0] !== "any") {
    const lbl = row.options.find((o) => o.value === row.selected[0])?.label;
    if (lbl) trailingHint = <span className="text-mini text-text-tertiary">{lbl}</span>;
  } else if (kind === "search" && (row.searchValue ?? "").trim().length > 0) {
    trailingHint = <span className="inline-block h-1.5 w-1.5 rounded-pill bg-accent" />;
  }

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
          {kind === "list" && (
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
            </>
          )}

          {kind === "single" && (
            <div className="max-h-72 overflow-y-auto py-1">
              {row.options.map((opt) => {
                const active = row.selected[0] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); row.onToggle(opt.value); }}
                    className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
                  >
                    <span className={clsx(
                      "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-pill border",
                      active ? "border-accent" : "border-border-strong",
                    )}>
                      {active && <span className="h-1.5 w-1.5 rounded-pill bg-accent" />}
                    </span>
                    <span className="flex-1 truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {kind === "search" && (
            <div className="px-2.5 py-2">
              <input
                autoFocus
                value={row.searchValue ?? ""}
                onChange={(e) => row.onSearchChange?.(e.target.value)}
                placeholder="Search content..."
                className="w-full rounded-md bg-input px-2 py-1.5 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
              />
              <p className="px-1 pt-2 text-mini text-text-tertiary">
                Matches issue title or description.
              </p>
            </div>
          )}
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

const GROUPING_OPTIONS: { value: MyIssuesGrouping; label: string }[] = [
  { value: "focus", label: "Focus" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
  { value: "project", label: "Project" },
  { value: "labels", label: "Labels" },
  { value: "cycle", label: "Cycle" },
  { value: "no_grouping", label: "No grouping" },
];

const ORDERING_OPTIONS: { value: MyIssuesOrdering; label: string }[] = [
  { value: "importance", label: "Importance" },
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
];

const COMPLETED_WINDOW_OPTIONS: { value: CompletedWindow; label: string }[] = [
  { value: "day", label: "Past day" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "all", label: "All" },
];

interface DisplayPropMeta {
  key: keyof MyIssuesPrefs;
  label: string;
}

const DISPLAY_PROPS: DisplayPropMeta[] = [
  { key: "show_id", label: "ID" },
  { key: "show_status", label: "Status" },
  { key: "show_assignee", label: "Assignee" },
  { key: "show_priority", label: "Priority" },
  { key: "show_project", label: "Project" },
  { key: "show_due_date", label: "Due date" },
  { key: "show_milestone", label: "Milestone" },
  { key: "show_cycle", label: "Cycle" },
  { key: "show_labels", label: "Labels" },
  { key: "show_links", label: "Links" },
  { key: "show_time_in_status", label: "Time in status" },
  { key: "show_created", label: "Created" },
  { key: "show_updated", label: "Updated" },
];

function DisplayMenu({
  prefs,
  update,
}: {
  prefs: MyIssuesPrefs;
  update: (patch: Partial<MyIssuesPrefs>) => void;
}) {
  return (
    <div className="px-2 py-2">
      <div className="px-2 pb-3 pt-1">
        {/* List/Board segmented control. Larger inner pad so the active
            tab reads as a substantial chip — the popover screenshot has
            the segments occupying most of the row width. */}
        <div className="flex items-center gap-1 rounded-md bg-input/60 p-1">
          <ViewTab active={prefs.view === "list"} onClick={() => update({ view: "list" })}>
            <LayoutList size={13} className="mr-2" /> List
          </ViewTab>
          <ViewTab active={prefs.view === "board"} onClick={() => update({ view: "board" })}>
            <Layers size={13} className="mr-2" /> Board
          </ViewTab>
        </div>
      </div>

      <div className="space-y-1 px-1 pb-2">
        <PickerRow label="Grouping">
          <DropdownPicker
            value={prefs.grouping}
            options={GROUPING_OPTIONS}
            onChange={(v) => update({ grouping: v })}
          />
        </PickerRow>
        <PickerRow label="Sub-grouping">
          <DropdownPicker
            value={prefs.sub_grouping}
            options={GROUPING_OPTIONS}
            onChange={(v) => update({ sub_grouping: v })}
          />
        </PickerRow>
        <PickerRow label="Ordering">
          <DropdownPicker
            value={prefs.ordering}
            options={ORDERING_OPTIONS}
            onChange={(v) => update({ ordering: v })}
          />
        </PickerRow>
        <Toggle
          label="Order completed by recency"
          value={prefs.order_completed_by_recency}
          onChange={(v) => update({ order_completed_by_recency: v })}
        />
      </div>

      <hr className="mx-1 my-2 border-white/5" />

      <div className="space-y-1 px-1 pb-2">
        <PickerRow label="Completed issues">
          <DropdownPicker
            value={prefs.completed_window}
            options={COMPLETED_WINDOW_OPTIONS}
            onChange={(v) => update({ completed_window: v })}
          />
        </PickerRow>
        <Toggle
          label="Show sub-issues"
          value={prefs.show_sub_issues}
          onChange={(v) => update({ show_sub_issues: v })}
        />
      </div>

      <hr className="mx-1 my-2 border-white/5" />

      <div className="px-3 pb-2 pt-1 text-small font-semibold text-text-primary">List options</div>
      <div className="px-1 pb-2">
        <Toggle
          label="Nested sub-issues"
          value={prefs.nested_sub_issues}
          onChange={(v) => update({ nested_sub_issues: v })}
        />
      </div>
      <div className="px-3 pb-2 text-small text-text-secondary">Display properties</div>
      <div className="flex flex-wrap gap-2 px-3 pb-3 pt-1">
        {DISPLAY_PROPS.map((p) => {
          const active = Boolean(prefs[p.key]);
          return (
            <button
              key={p.key as string}
              type="button"
              onClick={() => update({ [p.key]: !active } as Partial<MyIssuesPrefs>)}
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

function ViewTab({
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
        "flex flex-1 items-center justify-center rounded-md px-3 py-2 text-small font-medium transition-colors",
        active
          ? "bg-elevated text-text-primary shadow-button"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function PickerRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-small text-text-secondary">{label}</span>
      {children}
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

// unused-import suppression for icons re-exported by this module's
// callers but not referenced inside it
void UserIcon;
void CheckSquare;
