"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Check,
  Search,
  Tag,
  Users,
  User as UserIcon,
  UserCircle,
  Activity,
  Calendar,
  Compass,
  Diamond,
  GitBranch,
  FileCode,
  Type,
  Box,
  Building2,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { PriorityIcon } from "@/components/icons";
import { HealthIconSmall } from "@/components/health-icon";
import type { Member, Project, Label, Team } from "@/lib/api";
import {
  useProjectsPrefs,
  type ProjectsPrefs,
  type HealthFilterValue,
  type DateFilterValue,
  type MilestoneFilterValue,
  type RelationsFilterValue,
} from "@/lib/projects-prefs";
import { ProjectsAdvancedFilter } from "@/components/projects-advanced-filter";
import { listTemplates, type Template } from "@/lib/api";

type RowKind =
  | "submenu-list"
  | "submenu-single"
  | "submenu-search"
  | "submenu-ai"
  | "submenu-advanced"
  | "toggle";

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "started", label: "In Progress" },
  { value: "paused", label: "Paused" },
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

const HEALTH_OPTIONS: { value: HealthFilterValue; label: string; color: string }[] = [
  { value: "onTrack", label: "On track", color: "#1ec27a" },
  { value: "atRisk", label: "At risk", color: "#f5b83d" },
  { value: "offTrack", label: "Off track", color: "#f2453d" },
  { value: "noUpdate", label: "No update", color: "#6b7280" },
];

const DATE_OPTIONS: { value: DateFilterValue; label: string }[] = [
  { value: "has_target", label: "Has target date" },
  { value: "no_target", label: "No target date" },
  { value: "overdue", label: "Overdue" },
  { value: "has_start", label: "Has start date" },
  { value: "no_start", label: "No start date" },
];

const MILESTONE_OPTIONS: { value: MilestoneFilterValue; label: string }[] = [
  { value: "with_milestones", label: "With milestones" },
  { value: "no_milestones", label: "No milestones" },
];

const RELATIONS_OPTIONS: { value: RelationsFilterValue; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "with_relations", label: "Has dependencies" },
  { value: "no_relations", label: "No dependencies" },
];

export function ProjectsFilterPopover({
  workspaceSlug,
  members,
  teams,
  labels,
  projects,
  trigger,
}: {
  workspaceSlug: string;
  members: Member[];
  teams: Team[];
  labels: Label[];
  projects: Project[];
  trigger: (props: { open: boolean; toggle: () => void; active: boolean }) => React.ReactNode;
}) {
  const { prefs, toggleInList, update } = useProjectsPrefs(workspaceSlug);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);

  // Fetch project templates lazily so the Template submenu has real
  // options (templates the user has actually created). When the call
  // fails we just show "no templates" instead of crashing.
  useState(() => {
    listTemplates(workspaceSlug, { kind: "project" })
      .then(setTemplates)
      .catch(() => setTemplates([]));
    return undefined;
  });

  const rows = useMemo(
    () => buildRows({ prefs, members, teams, labels, projects, templates }),
    [prefs, members, teams, labels, projects, templates],
  );
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.label.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <Popover
      align="end"
      width={320}
      surface="default"
      trigger={({ open, toggle }) =>
        trigger({ open, toggle, active: prefsActive(prefs) })
      }
    >
      {() => (
        <FunnelContent onUnmount={() => setSearch("")}>
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <Search size={12} className="text-text-tertiary" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Add filter..."
              className="flex-1 bg-transparent text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
            />
            <kbd className="rounded-sm border border-border-subtle px-1 text-micro text-text-tertiary">
              F
            </kbd>
          </div>
          <Divider />
          <div className="max-h-[min(640px,80vh)] overflow-y-auto py-1">
            {filteredRows.map((row, idx) => {
              const showDivider =
                row.id === "template" &&
                filteredRows[idx - 1] &&
                filteredRows[idx - 1].id !== "template";
              return (
                <div key={row.id}>
                  {showDivider && <hr className="my-1 border-border-subtle" />}
                  <FilterRowWithSubmenu
                    row={row}
                    prefs={prefs}
                    update={update}
                    toggleInList={toggleInList}
                    members={members}
                    teams={teams}
                    labels={labels}
                    projects={projects}
                    templates={templates}
                  />
                </div>
              );
            })}
            {filteredRows.length === 0 && (
              <div className="px-2.5 py-3 text-mini text-text-tertiary">
                No filters match &quot;{search}&quot;.
              </div>
            )}
          </div>
        </FunnelContent>
      )}
    </Popover>
  );
}

/**
 * One filter row. The row itself is the trigger for a nested Popover
 * that expands to the right on hover (matching Linear's cascading
 * pattern). Submenus mount as portaled children of the popover stack,
 * so clicking inside a submenu doesn't collapse the parent funnel.
 */
function FilterRowWithSubmenu({
  row,
  prefs,
  update,
  toggleInList,
  members,
  teams,
  labels,
  projects,
  templates,
}: {
  row: RowDef;
  prefs: ProjectsPrefs;
  update: ReturnType<typeof useProjectsPrefs>["update"];
  toggleInList: ReturnType<typeof useProjectsPrefs>["toggleInList"];
  members: Member[];
  teams: Team[];
  labels: Label[];
  projects: Project[];
  templates: Template[];
}) {
  // Toggle rows don't have a submenu — they flip state in-place.
  if (row.kind === "toggle") {
    return (
      <FilterRowButton
        row={row}
        onClick={() => update({ no_initiatives: !prefs.no_initiatives })}
      />
    );
  }

  return (
    <Popover
      align="start"
      placement="right"
      width={row.kind === "submenu-advanced" ? 380 : row.kind === "submenu-ai" ? 320 : 240}
      surface="default"
      openOnHover
      trigger={({ open, toggle }) => (
        <FilterRowButton
          row={row}
          onClick={toggle}
          active={open}
        />
      )}
    >
      {() => (
        <FilterSubmenuBody
          row={row}
          prefs={prefs}
          update={update}
          toggleInList={toggleInList}
          members={members}
          teams={teams}
          labels={labels}
          projects={projects}
          templates={templates}
        />
      )}
    </Popover>
  );
}

function FilterSubmenuBody({
  row,
  prefs,
  update,
  toggleInList,
  members,
  teams,
  labels,
  projects,
  templates,
}: {
  row: RowDef;
  prefs: ProjectsPrefs;
  update: ReturnType<typeof useProjectsPrefs>["update"];
  toggleInList: ReturnType<typeof useProjectsPrefs>["toggleInList"];
  members: Member[];
  teams: Team[];
  labels: Label[];
  projects: Project[];
  templates: Template[];
}) {
  const [q, setQ] = useState("");
  if (row.kind === "submenu-search") {
    return (
      <div className="px-2.5 py-2">
        <input
          autoFocus
          value={prefs.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Search title or summary..."
          className="w-full rounded-md bg-input px-2 py-1.5 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
        />
        <p className="px-1 pt-2 text-mini text-text-tertiary">
          Matches project name and description.
        </p>
      </div>
    );
  }
  if (row.kind === "submenu-ai") {
    return <AiFilterPanel prefs={prefs} update={update} />;
  }
  if (row.kind === "submenu-advanced") {
    return <ProjectsAdvancedFilter prefs={prefs} update={update} labels={labels} members={members} />;
  }
  if (row.kind === "submenu-single") {
    return <SubmenuSinglePicker rowId={row.id} prefs={prefs} update={update} />;
  }
  return (
    <SubmenuListPicker
      rowId={row.id}
      prefs={prefs}
      toggleInList={toggleInList}
      members={members}
      teams={teams}
      labels={labels}
      projects={projects}
      templates={templates}
      q={q}
      setQ={setQ}
    />
  );
}

/**
 * Thin wrapper that registers an unmount cleanup callback. Because the
 * Popover unmounts its children when it closes, this lets the parent
 * reset its submenu/search state whenever the popover closes — without
 * needing a "controlled open" prop on Popover.
 */
function FunnelContent({
  onUnmount,
  children,
}: {
  onUnmount: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    return () => onUnmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="py-1">{children}</div>;
}

interface RowDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  kind: RowKind;
  count?: number;     // active filter count for the chip on the right
  hint?: string;      // textual hint (e.g., decorative tooltip)
  active?: boolean;
}

function prefsActive(prefs: ProjectsPrefs): boolean {
  return (
    prefs.status.length > 0 ||
    prefs.priorities.length > 0 ||
    prefs.health.length > 0 ||
    prefs.lead_ids.length > 0 ||
    prefs.member_ids.length > 0 ||
    prefs.creator_ids.length > 0 ||
    prefs.team_keys.length > 0 ||
    prefs.label_ids.length > 0 ||
    prefs.template_ids.length > 0 ||
    prefs.project_ids.length > 0 ||
    prefs.date_filter.length > 0 ||
    prefs.no_initiatives ||
    prefs.milestone_filter.length > 0 ||
    prefs.relations_filter !== "any" ||
    prefs.ai_filter.trim().length > 0 ||
    prefs.advanced_rules.length > 0 ||
    prefs.search.trim().length > 0
  );
}

function buildRows(ctx: {
  prefs: ProjectsPrefs;
  members: Member[];
  teams: Team[];
  labels: Label[];
  projects: Project[];
  templates: Template[];
}): RowDef[] {
  const p = ctx.prefs;
  return [
    {
      id: "ai",
      label: "AI filter",
      icon: <Sparkles size={13} />,
      kind: "submenu-ai",
      count: p.ai_filter.trim() ? 1 : 0,
    },
    {
      id: "advanced",
      label: "Advanced filter",
      icon: <SlidersHorizontal size={13} />,
      kind: "submenu-advanced",
      count: p.advanced_rules.length,
    },
    { id: "status", label: "Status", icon: <DotIcon />, kind: "submenu-list", count: p.status.length },
    {
      id: "priority",
      label: "Priority",
      icon: <PriorityIcon value={0} />,
      kind: "submenu-list",
      count: p.priorities.length,
    },
    {
      id: "labels",
      label: "Labels",
      icon: <Tag size={13} />,
      kind: "submenu-list",
      count: p.label_ids.length,
    },
    {
      id: "teams",
      label: "Teams",
      icon: <Building2 size={13} />,
      kind: "submenu-list",
      count: p.team_keys.length,
    },
    {
      id: "lead",
      label: "Lead",
      icon: <UserIcon size={13} />,
      kind: "submenu-list",
      count: p.lead_ids.length,
    },
    {
      id: "members",
      label: "Members",
      icon: <Users size={13} />,
      kind: "submenu-list",
      count: p.member_ids.length,
    },
    {
      id: "creator",
      label: "Creator",
      icon: <UserCircle size={13} />,
      kind: "submenu-list",
      count: p.creator_ids.length,
    },
    {
      id: "health",
      label: "Health",
      icon: <Activity size={13} />,
      kind: "submenu-list",
      count: p.health.length,
    },
    {
      id: "dates",
      label: "Dates",
      icon: <Calendar size={13} />,
      kind: "submenu-list",
      count: p.date_filter.length,
    },
    {
      id: "no_initiatives",
      label: "No initiatives",
      icon: <Compass size={13} />,
      kind: "toggle",
      active: p.no_initiatives,
    },
    {
      id: "milestones",
      label: "Milestones",
      icon: <Diamond size={13} />,
      kind: "submenu-list",
      count: p.milestone_filter.length,
    },
    {
      id: "relations",
      label: "Relations",
      icon: <GitBranch size={13} />,
      kind: "submenu-single",
      count: p.relations_filter !== "any" ? 1 : 0,
    },
    {
      id: "template",
      label: "Template",
      icon: <FileCode size={13} />,
      kind: "submenu-list",
      count: p.template_ids.length,
    },
    {
      id: "search",
      label: "Title & summary",
      icon: <Type size={13} />,
      kind: "submenu-search",
      count: p.search.trim() ? 1 : 0,
    },
    {
      id: "specific_project",
      label: "Specific project",
      icon: <Box size={13} />,
      kind: "submenu-list",
      count: p.project_ids.length,
    },
  ];
}

function FilterRowButton({
  row,
  onClick,
  active = false,
}: {
  row: RowDef;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover",
        active && "bg-row-hover text-text-primary",
      )}
      title={row.hint}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-text-tertiary">
        {row.icon}
      </span>
      <span className="truncate">{row.label}</span>
      {row.kind !== "toggle" && (
        <ChevronRight size={11} className="shrink-0 text-text-quaternary" />
      )}
      <span aria-hidden className="flex-1" />
      {row.kind === "toggle" ? (
        <span
          className={clsx(
            "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
            row.active ? "border-accent bg-accent text-white" : "border-border-strong",
          )}
        >
          {row.active && <Check size={9} strokeWidth={3} />}
        </span>
      ) : row.count ? (
        <span className="shrink-0 text-mini text-text-secondary">{row.count}</span>
      ) : null}
    </button>
  );
}

function SubmenuListPicker({
  rowId,
  prefs,
  toggleInList,
  members,
  teams,
  labels,
  projects,
  templates,
  q,
  setQ,
}: {
  rowId: string;
  prefs: ProjectsPrefs;
  toggleInList: ReturnType<typeof useProjectsPrefs>["toggleInList"];
  members: Member[];
  teams: Team[];
  labels: Label[];
  projects: Project[];
  templates: Template[];
  q: string;
  setQ: (v: string) => void;
}) {
  type Opt = { value: string | number; label: string; left?: React.ReactNode };
  let options: Opt[] = [];
  let selected: Array<string | number> = [];
  let onToggle: (v: string | number) => void = () => {};
  let searchable = false;

  if (rowId === "status") {
    options = STATUS_OPTIONS.map((s) => ({
      value: s.value,
      label: s.label,
      left: <StateDot state={s.value} />,
    }));
    selected = prefs.status;
    onToggle = (v) => toggleInList("status", v as never);
  } else if (rowId === "priority") {
    options = PRIORITY_OPTIONS.map((p) => ({
      value: p.value,
      label: p.label,
      left: <PriorityIcon value={p.value as 0 | 1 | 2 | 3 | 4} />,
    }));
    selected = prefs.priorities;
    onToggle = (v) => toggleInList("priorities", v as never);
  } else if (rowId === "health") {
    options = HEALTH_OPTIONS.map((h) => ({
      value: h.value,
      label: h.label,
      left: <HealthIconSmall health={h.value} />,
    }));
    selected = prefs.health;
    onToggle = (v) => toggleInList("health", v as never);
  } else if (rowId === "dates") {
    options = DATE_OPTIONS.map((d) => ({
      value: d.value,
      label: d.label,
      left: <Calendar size={12} className="text-text-tertiary" />,
    }));
    selected = prefs.date_filter;
    onToggle = (v) => toggleInList("date_filter", v as never);
  } else if (rowId === "milestones") {
    options = MILESTONE_OPTIONS.map((m) => ({
      value: m.value,
      label: m.label,
      left: <Diamond size={11} className="text-priority-medium" fill="currentColor" />,
    }));
    selected = prefs.milestone_filter;
    onToggle = (v) => toggleInList("milestone_filter", v as never);
  } else if (rowId === "lead") {
    options = members.map((m) => ({
      value: m.id,
      label: m.name,
      left: <MemberAvatar member={m} />,
    }));
    selected = prefs.lead_ids;
    onToggle = (v) => toggleInList("lead_ids", v as never);
    searchable = true;
  } else if (rowId === "members") {
    options = members.map((m) => ({
      value: m.id,
      label: m.name,
      left: <MemberAvatar member={m} />,
    }));
    selected = prefs.member_ids;
    onToggle = (v) => toggleInList("member_ids", v as never);
    searchable = true;
  } else if (rowId === "creator") {
    options = members.map((m) => ({
      value: m.id,
      label: m.name,
      left: <MemberAvatar member={m} />,
    }));
    selected = prefs.creator_ids;
    onToggle = (v) => toggleInList("creator_ids", v as never);
    searchable = true;
  } else if (rowId === "teams") {
    options = teams.map((t) => ({
      value: t.key,
      label: t.name,
      left: (
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-sm"
          style={{ background: t.icon_color }}
        />
      ),
    }));
    selected = prefs.team_keys;
    onToggle = (v) => toggleInList("team_keys", v as never);
    searchable = true;
  } else if (rowId === "labels") {
    options = labels.map((l) => ({
      value: l.id,
      label: l.name,
      left: (
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-pill"
          style={{ background: l.color }}
        />
      ),
    }));
    selected = prefs.label_ids;
    onToggle = (v) => toggleInList("label_ids", v as never);
    searchable = true;
  } else if (rowId === "template") {
    options = templates.map((t) => ({
      value: t.id,
      label: t.name,
      left: <FileCode size={11} className="text-text-tertiary" />,
    }));
    selected = prefs.template_ids;
    onToggle = (v) => toggleInList("template_ids", v as never);
    searchable = templates.length > 6;
  } else if (rowId === "specific_project") {
    options = projects.map((p) => ({
      value: p.id,
      label: p.name,
      left: (
        <Box
          size={12}
          strokeWidth={1.75}
          style={{ color: p.icon_color }}
        />
      ),
    }));
    selected = prefs.project_ids;
    onToggle = (v) => toggleInList("project_ids", v as never);
    searchable = true;
  }

  const filtered = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <div>
      {searchable && (
        <div className="px-2.5 py-1.5">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${options.length} ${options.length === 1 ? "option" : "options"}...`}
            className="w-full rounded-md bg-input px-2 py-1 text-mini text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
        </div>
      )}
      <div className="max-h-72 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-2.5 py-2 text-mini text-text-tertiary">No matches.</div>
        )}
        {filtered.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onToggle(opt.value)}
              className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              <span
                className={clsx(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                  checked ? "border-accent bg-accent text-white" : "border-border-strong",
                )}
              >
                {checked && <Check size={9} strokeWidth={3} />}
              </span>
              {opt.left && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {opt.left}
                </span>
              )}
              <span className="flex-1 truncate text-text-primary">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- helpers ----------------------------------------------------------------

function DotIcon() {
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-pill border border-border-strong" />
  );
}

function StateDot({ state }: { state: string }) {
  const color =
    state === "completed"
      ? "#22c55e"
      : state === "started"
        ? "#facc15"
        : state === "paused"
          ? "#d9b34c"
          : "#6b6f76";
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-pill border"
      style={{ borderColor: color, background: state === "completed" ? color : "transparent" }}
    />
  );
}

function MemberAvatar({ member }: { member: Member }) {
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-pill text-[8px] font-medium text-white"
      style={{ background: member.color }}
    >
      {member.initials}
    </span>
  );
}

function Divider() {
  return <hr className="my-0 border-border-subtle" />;
}

function SubmenuSinglePicker({
  rowId,
  prefs,
  update,
}: {
  rowId: string;
  prefs: ProjectsPrefs;
  update: ReturnType<typeof useProjectsPrefs>["update"];
}) {
  if (rowId !== "relations") return null;
  const value = prefs.relations_filter;
  return (
    <div className="py-1">
      {RELATIONS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => update({ relations_filter: opt.value })}
            className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
          >
            <span
              className={clsx(
                "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-pill border",
                active ? "border-accent" : "border-border-strong",
              )}
            >
              {active && <span className="h-1.5 w-1.5 rounded-pill bg-accent" />}
            </span>
            <span className="flex-1 truncate text-text-primary">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AiFilterPanel({
  prefs,
  update,
}: {
  prefs: ProjectsPrefs;
  update: ReturnType<typeof useProjectsPrefs>["update"];
}) {
  const [text, setText] = useState(prefs.ai_filter);

  function apply() {
    update({ ai_filter: text.trim() });
  }
  function clear() {
    setText("");
    update({ ai_filter: "" });
  }

  return (
    <div className="px-2.5 py-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            apply();
          }
        }}
        placeholder="Describe a filter in plain English…&#10;e.g. 'projects led by Navtesh that are at risk'"
        rows={3}
        className="w-full rounded-md bg-input px-2 py-1.5 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
      />
      <p className="px-1 pt-2 text-mini text-text-tertiary">
        Matches against project name, description, lead, health, and status. Tip: press ⌘↵ to apply.
      </p>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        {prefs.ai_filter.trim() && (
          <button
            type="button"
            onClick={clear}
            className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={apply}
          className="rounded-md bg-accent px-2.5 py-1 text-mini font-medium text-white hover:bg-accent/90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
