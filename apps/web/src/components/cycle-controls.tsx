"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AtSign,
  BarChart3,
  Bot,
  Box,
  Calendar,
  ChevronDown,
  ChevronRight,
  Circle,
  CornerUpRight,
  Filter,
  Layers as LayersIcon,
  LayoutList,
  Lock,
  PanelRight,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  Tag,
  User as UserIcon,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import {
  listMembers,
  listProjects,
  listTeamLabels,
  listTeamStates,
  type Label,
  type Member,
  type Project,
  type WorkflowState,
} from "@/lib/api";
import {
  resetCyclePrefs,
  useCyclePrefs,
  type CompletedWindow,
  type CycleGrouping,
  type CycleOrdering,
  type CyclePrefs,
} from "@/lib/cycle-prefs";

/**
 * Three round-chip controls (Filter / Display / Panel) on the cycle
 * detail page. Visual + interaction parity with team-issues-controls so
 * cycle and team pages feel like one family — Filter writes to URL
 * params (priority/state/assignee/label/project/search) that the cycle
 * page reads to filter the cycle's issues client-side; Display writes
 * to the per-cycle localStorage prefs; Panel toggles the right Progress
 * info panel.
 */
export function CycleControls({
  workspaceSlug,
  cycleId,
  teamKey,
}: {
  workspaceSlug: string;
  cycleId: string;
  teamKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { prefs, update: updatePrefs } = useCyclePrefs(workspaceSlug, cycleId);

  useEffect(() => {
    setHydrated(true);
    listMembers(workspaceSlug).then(setMembers).catch(() => {});
    listTeamLabels(workspaceSlug, teamKey).then(setLabels).catch(() => {});
    listTeamStates(workspaceSlug, teamKey).then(setStates).catch(() => {});
    listProjects(workspaceSlug).then(setProjects).catch(() => {});
  }, [workspaceSlug, teamKey]);

  function readList(key: string): string[] {
    const v = params.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  }

  function readSingle(key: string, fallback = ""): string {
    return params.get(key) ?? fallback;
  }

  function writeList(key: string, values: string[]) {
    const sp = new URLSearchParams(params.toString());
    if (values.length === 0) sp.delete(key);
    else sp.set(key, values.join(","));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function writeSingle(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (!value) sp.delete(key);
    else sp.set(key, value);
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
    ["priority", "label", "assignee", "state", "project", "search"].forEach((k) => sp.delete(k));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const activeCount =
    readList("priority").length +
    readList("label").length +
    readList("assignee").length +
    readList("state").length +
    readList("project").length +
    (readSingle("search").trim() ? 1 : 0);

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
            labels={labels}
            states={states}
            projects={projects}
            readList={readList}
            readSingle={readSingle}
            writeSingle={writeSingle}
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
            {hydrated && prefs.right_panel_open && (
              <span className="absolute -right-0.5 -top-0.5 inline-block h-1.5 w-1.5 rounded-pill bg-accent" />
            )}
          </button>
        )}
      >
        {() => (
          <DisplayMenu
            prefs={prefs}
            update={(patch) => updatePrefs(patch)}
            reset={() => resetCyclePrefs(workspaceSlug, cycleId)}
          />
        )}
      </Popover>

      <button
        type="button"
        onClick={() => updatePrefs({ right_panel_open: !prefs.right_panel_open })}
        aria-label="Toggle cycle info panel"
        aria-pressed={hydrated ? prefs.right_panel_open : false}
        title="Cycle info panel"
        className={clsx(chipCls, hydrated && prefs.right_panel_open && "border-border-strong bg-row-hover text-text-secondary")}
      >
        <PanelRight size={13} />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter menu — same shape as my-issues / team-issues. Cycle-irrelevant rows
// (cycle, added_to_cycle) are dropped; everything else carries over.
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: "1", label: "Urgent" },
  { value: "2", label: "High" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Low" },
  { value: "0", label: "No priority" },
];

function FilterMenu({
  members,
  labels,
  states,
  projects,
  readList,
  readSingle,
  writeSingle,
  toggleListValue,
  clearAllFilters,
}: {
  members: Member[];
  labels: Label[];
  states: WorkflowState[];
  projects: Project[];
  readList: (key: string) => string[];
  readSingle: (key: string, fallback?: string) => string;
  writeSingle: (key: string, value: string | null) => void;
  toggleListValue: (key: string, value: string) => void;
  clearAllFilters: () => void;
}) {
  const [search, setSearch] = useState("");

  const rows: FilterRowDef[] = [
    { key: "ai_filter", label: "AI filter", icon: <Sparkles size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    { key: "advanced_filter", label: "Advanced filter", icon: <Filter size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "state",
      label: "Status",
      icon: <Circle size={13} />,
      options: states.map((s) => ({ value: s.id, label: s.name, color: s.color })),
      selected: readList("state"),
      onToggle: (v) => toggleListValue("state", v),
    },
    {
      key: "assignee",
      label: "Assignee",
      icon: <UserIcon size={13} />,
      options: members.map((m) => ({ value: m.id, label: m.name, color: m.color })),
      selected: readList("assignee"),
      onToggle: (v) => toggleListValue("assignee", v),
    },
    { key: "agent", label: "Agent", icon: <Bot size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    { key: "creator", label: "Creator", icon: <AtSign size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "priority",
      label: "Priority",
      icon: <BarChart3 size={13} />,
      options: PRIORITY_OPTIONS,
      selected: readList("priority"),
      onToggle: (v) => toggleListValue("priority", v),
    },
    {
      key: "label",
      label: "Labels",
      icon: <Tag size={13} />,
      options: labels.map((l) => ({ value: l.id, label: l.name, color: l.color })),
      selected: readList("label"),
      onToggle: (v) => toggleListValue("label", v),
    },
    { key: "relations", label: "Relations", icon: <CornerUpRight size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    { key: "date", label: "Dates", icon: <Calendar size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "project",
      label: "Project",
      icon: <Box size={13} />,
      options: projects.map((p) => ({ value: p.id, label: p.name, color: p.icon_color })),
      selected: readList("project"),
      onToggle: (v) => toggleListValue("project", v),
    },
    { key: "subscribers", label: "Subscribers", icon: <Users size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    { key: "auto_closed", label: "Auto-closed", icon: <Lock size={13} />, disabled: true, options: [], selected: [], onToggle: () => undefined },
    {
      key: "search",
      label: "Content",
      icon: <ScrollText size={13} />,
      kind: "search",
      searchValue: readSingle("search"),
      onSearchChange: (v) => writeSingle("search", v || null),
      options: [],
      selected: readSingle("search").trim() ? [readSingle("search")] : [],
      onToggle: () => undefined,
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
  kind?: "list" | "search";
  searchValue?: string;
  onSearchChange?: (v: string) => void;
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

  const kind = row.kind ?? "list";
  let trailingHint: React.ReactNode = null;
  if (kind === "list" && row.selected.length > 0) {
    trailingHint = <span className="text-mini text-text-tertiary">{row.selected.length}</span>;
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
// Display menu
// ---------------------------------------------------------------------------

const GROUPING_OPTIONS: { value: CycleGrouping; label: string }[] = [
  { value: "state", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
  { value: "project", label: "Project" },
  { value: "label", label: "Labels" },
  { value: "no_grouping", label: "No grouping" },
];

const ORDERING_OPTIONS: { value: CycleOrdering; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "due", label: "Due date" },
];

const COMPLETED_WINDOW_OPTIONS: { value: CompletedWindow; label: string }[] = [
  { value: "day", label: "Past day" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "all", label: "All" },
];

interface DisplayPropMeta {
  key: keyof CyclePrefs;
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
  { key: "show_labels", label: "Labels" },
  { key: "show_links", label: "Links" },
  { key: "show_time_in_status", label: "Time in status" },
  { key: "show_created", label: "Created" },
  { key: "show_updated", label: "Updated" },
];

function DisplayMenu({
  prefs,
  update,
  reset,
}: {
  prefs: CyclePrefs;
  update: (patch: Partial<CyclePrefs>) => void;
  reset: () => void;
}) {
  const isBoard = prefs.view === "board";
  return (
    <div className="px-2 py-2">
      <div className="px-2 pb-3 pt-1">
        <div className="flex items-center gap-1 rounded-md bg-input/60 p-1">
          <ViewTab active={prefs.view === "list"} onClick={() => update({ view: "list" })}>
            <LayoutList size={13} className="mr-2" /> List
          </ViewTab>
          <ViewTab active={prefs.view === "board"} onClick={() => update({ view: "board" })}>
            <LayersIcon size={13} className="mr-2" /> Board
          </ViewTab>
        </div>
      </div>

      <div className="space-y-1 px-1 pb-2">
        <PickerRow label={isBoard ? "Columns" : "Grouping"}>
          <DropdownPicker
            value={prefs.grouping}
            options={GROUPING_OPTIONS}
            onChange={(v) => update({ grouping: v })}
          />
        </PickerRow>
        <PickerRow label={isBoard ? "Rows" : "Sub-grouping"}>
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

      <div className="px-3 pb-2 pt-1 text-small font-semibold text-text-primary">
        {isBoard ? "Board options" : "List options"}
      </div>
      {isBoard && (
        <div className="px-1 pb-2">
          <Toggle
            label="Show empty columns"
            value={prefs.show_empty_columns}
            onChange={(v) => update({ show_empty_columns: v })}
          />
        </div>
      )}
      <div className="px-3 pb-2 text-small text-text-secondary">Display properties</div>
      <div className="flex flex-wrap gap-2 px-3 pb-3 pt-1">
        {DISPLAY_PROPS.map((p) => {
          const active = Boolean(prefs[p.key]);
          return (
            <button
              key={p.key as string}
              type="button"
              onClick={() => update({ [p.key]: !active } as Partial<CyclePrefs>)}
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
