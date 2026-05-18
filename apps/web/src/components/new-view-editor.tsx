"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  AlertOctagon,
  Check,
  ChevronDown,
  CircleDot,
  Filter,
  Layers,
  Lock,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon } from "@/components/icons";
import { IssueRow } from "@/components/issue-row";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { StateGlyph } from "@/components/projects-board-view";
import { HealthIconSmall, type HealthValue } from "@/components/health-icon";
import {
  createSavedView,
  listProjects,
  listWorkspaceIssues,
  type Issue,
  type Project,
  type ProjectState,
  type StateGroup,
  type Team,
} from "@/lib/api";

type Scope = "issues" | "projects";

type SaveDestination =
  | { kind: "personal"; label: "Personal" }
  | { kind: "workspace"; label: "Workspace" }
  | { kind: "team"; team: Team };

interface GroupBucket {
  name: string;
  group: StateGroup;
  position: number;
  issues: Issue[];
}

/**
 * Full new-view editor that mirrors Linear's /views/<scope>/new screen.
 * The header carries the breadcrumb + save controls; below that a tab
 * sub-row picks scope and exposes the filter + display popovers; the
 * body renders a live workspace-issues list with per-row checkboxes.
 *
 * On save, the selected issue ids are persisted as a `pinned=<csv>`
 * param in the saved view's `query` string — when the view re-opens we
 * pass that through to the workspace-issues endpoint, which restricts
 * the list to exactly those issues.
 */
export function NewViewEditor({
  workspace,
  scope: initialScope,
  teams,
  workspaceName,
}: {
  workspace: string;
  scope: Scope;
  teams: Team[];
  workspaceName: string;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>(initialScope);
  const [name, setName] = useState(initialScope === "projects" ? "All projects" : "All issues");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState<SaveDestination>({ kind: "personal", label: "Personal" });
  const [saving, setSaving] = useState(false);

  // Filter state. Kept minimal — Linear's full filter popover has dozens
  // of dimensions; the new-view editor in real Linear ships a subset
  // (priority + status group + team) for the live preview.
  const [statusGroups, setStatusGroups] = useState<StateGroup[]>([]);
  const [priorities, setPriorities] = useState<number[]>([]);
  const [teamKeys, setTeamKeys] = useState<string[]>([]);
  const [grouping, setGrouping] = useState<"state" | "priority" | "assignee" | "team" | "none">("state");

  // Project-scope filters
  const [projectStates, setProjectStates] = useState<ProjectState[]>([]);
  const [projectGrouping, setProjectGrouping] = useState<"state" | "priority" | "lead" | "none">("state");

  // Live previews — refetches whenever the filter changes.
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scope !== "issues") {
      setIssues([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params: Parameters<typeof listWorkspaceIssues>[1] = { view: "all" };
    if (priorities.length > 0) params.priority = priorities.join(",");
    if (teamKeys.length > 0) params.team = teamKeys.join(",");
    listWorkspaceIssues(workspace, params)
      .then((rows) => {
        if (cancelled) return;
        const filtered =
          statusGroups.length > 0 ? rows.filter((r) => statusGroups.includes(r.state.group)) : rows;
        setIssues(filtered);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, scope, priorities, statusGroups, teamKeys]);

  useEffect(() => {
    if (scope !== "projects") {
      setProjects([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listProjects(workspace)
      .then((rows) => {
        if (cancelled) return;
        let filtered = rows;
        if (projectStates.length > 0) filtered = filtered.filter((p) => projectStates.includes(p.state));
        if (priorities.length > 0) filtered = filtered.filter((p) => priorities.includes(p.priority));
        setProjects(filtered);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, scope, projectStates, priorities]);

  const groups = useMemo(() => groupIssues(issues, grouping), [issues, grouping]);
  const projectGroups = useMemo(() => groupProjects(projects, projectGrouping), [projects, projectGrouping]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      // Pack the filter state into the query string the same way the
      // /view/[viewId] reader expects (URL query params).
      const sp = new URLSearchParams();
      if (priorities.length > 0) sp.set("priority", priorities.join(","));
      if (teamKeys.length > 0) sp.set("team", teamKeys.join(","));
      if (selectedIds.size > 0) sp.set("pinned", [...selectedIds].join(","));

      const created = await createSavedView(workspace, {
        name: name.trim() || (scope === "projects" ? "All projects" : "All issues"),
        description: description.trim() || undefined,
        scope,
        query: sp.toString(),
        icon_color: destination.kind === "team" ? destination.team.icon_color : "#5e6ad2",
        team_key: destination.kind === "team" ? destination.team.key : null,
        personal: destination.kind === "personal",
      });
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
      router.push(`/${workspace}/view/${created.id}`);
    } catch (e) {
      console.error("save view failed", e);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    router.push(`/${workspace}/views?tab=${scope}`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border-subtle px-6 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
            <Layers size={14} />
          </span>
          <div className="flex-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              className="w-full bg-transparent text-default font-semibold text-text-primary placeholder:text-text-quaternary focus:outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="mt-1 w-full bg-transparent text-small text-text-secondary placeholder:text-text-quaternary focus:outline-none"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 text-mini">
            <span className="text-text-tertiary">Save to</span>
            <Popover
              align="end"
              width={240}
              surface="glass"
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.03] px-2 py-1 text-text-secondary hover:bg-white/[0.06]",
                    open && "bg-white/[0.06] text-text-primary",
                  )}
                >
                  <DestinationIcon dest={destination} />
                  <span>{destinationLabel(destination)}</span>
                  <ChevronDown size={10} />
                </button>
              )}
            >
              {({ close }) => (
                <div className="py-1">
                  <DestRow
                    active={destination.kind === "personal"}
                    onClick={() => {
                      setDestination({ kind: "personal", label: "Personal" });
                      close();
                    }}
                    icon={<Lock size={12} className="text-text-tertiary" />}
                    label="Personal"
                  />
                  <DestRow
                    active={destination.kind === "workspace"}
                    onClick={() => {
                      setDestination({ kind: "workspace", label: "Workspace" });
                      close();
                    }}
                    icon={<Users size={12} className="text-text-tertiary" />}
                    label="Workspace"
                  />
                  {teams.length > 0 && (
                    <>
                      <div className="my-1 border-t border-border-subtle" />
                      {teams.map((t) => (
                        <DestRow
                          key={t.key}
                          active={destination.kind === "team" && destination.team.key === t.key}
                          onClick={() => {
                            setDestination({ kind: "team", team: t });
                            close();
                          }}
                          icon={<span className="inline-block h-3 w-3 rounded-sm" style={{ background: t.icon_color }} />}
                          label={t.name}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </Popover>
            <button
              type="button"
              onClick={cancel}
              className="rounded-md px-2 py-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-accent px-2.5 py-1 font-medium text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <span className="hidden">{workspaceName}</span>
      </div>

      <div className="flex h-[44px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <ScopeTab active={scope === "issues"} label="Issues" onClick={() => { setScope("issues"); setSelectedIds(new Set()); }} />
        <ScopeTab active={scope === "projects"} label="Projects" onClick={() => { setScope("projects"); setSelectedIds(new Set()); }} />
        <span className="ml-auto flex items-center gap-1">
          {scope === "issues" ? (
            <>
              <Popover
                align="end"
                width={260}
                surface="glass"
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Filter"
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
                      open && "bg-row-hover text-text-secondary",
                    )}
                  >
                    <Filter size={13} />
                  </button>
                )}
              >
                {() => (
                  <FilterMenu
                    priorities={priorities}
                    statusGroups={statusGroups}
                    teamKeys={teamKeys}
                    teams={teams}
                    onPriorities={setPriorities}
                    onStatusGroups={setStatusGroups}
                    onTeamKeys={setTeamKeys}
                  />
                )}
              </Popover>
              <Popover
                align="end"
                width={220}
                surface="glass"
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Display options"
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
                      open && "bg-row-hover text-text-secondary",
                    )}
                  >
                    <SlidersHorizontal size={13} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="p-2">
                    <div className="px-1 pb-1 text-mini text-text-tertiary">Grouping</div>
                    <PopoverList>
                      {(["state", "priority", "assignee", "team", "none"] as const).map((g) => (
                        <PopoverItem
                          key={g}
                          active={grouping === g}
                          onClick={() => {
                            setGrouping(g);
                            close();
                          }}
                        >
                          <span className="capitalize">{g === "none" ? "No grouping" : g}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  </div>
                )}
              </Popover>
            </>
          ) : (
            <>
              <Popover
                align="end"
                width={260}
                surface="glass"
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Filter"
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
                      open && "bg-row-hover text-text-secondary",
                    )}
                  >
                    <Filter size={13} />
                  </button>
                )}
              >
                {() => (
                  <ProjectFilterMenu
                    projectStates={projectStates}
                    priorities={priorities}
                    onProjectStates={setProjectStates}
                    onPriorities={setPriorities}
                  />
                )}
              </Popover>
              <Popover
                align="end"
                width={220}
                surface="glass"
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Display options"
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
                      open && "bg-row-hover text-text-secondary",
                    )}
                  >
                    <SlidersHorizontal size={13} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="p-2">
                    <div className="px-1 pb-1 text-mini text-text-tertiary">Grouping</div>
                    <PopoverList>
                      {(["state", "priority", "lead", "none"] as const).map((g) => (
                        <PopoverItem
                          key={g}
                          active={projectGrouping === g}
                          onClick={() => {
                            setProjectGrouping(g);
                            close();
                          }}
                        >
                          <span className="capitalize">{g === "none" ? "No grouping" : g}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  </div>
                )}
              </Popover>
            </>
          )}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        {loading ? (
          <div className="px-4 py-12 text-center text-mini text-text-tertiary">Loading…</div>
        ) : scope === "projects" ? (
          projectGroups.length === 0 ? (
            <div className="px-4 py-12 text-center text-mini text-text-tertiary">No projects match this filter.</div>
          ) : (
            <div className="px-2 pt-2">
              {projectGroups.map((g) => (
                <section key={g.name} className="mb-1">
                  <header className="flex h-[36px] items-center gap-2 px-2 text-mini">
                    <ChevronDown size={11} className="text-text-tertiary" />
                    {g.icon}
                    <span className="font-medium text-text-primary">{g.name}</span>
                    <span className="text-text-tertiary">{g.projects.length}</span>
                  </header>
                  <ul>
                    {g.projects.map((project) => (
                      <ProjectSelectableRow
                        key={project.id}
                        project={project}
                        workspace={workspace}
                        selected={selectedIds.has(project.id)}
                        onToggle={() => toggleRow(project.id)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )
        ) : groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-mini text-text-tertiary">No issues match this filter.</div>
        ) : (
          <div className="px-2 pt-2">
            {groups.map((g) => (
              <section key={g.name} className="mb-1">
                <header className="flex h-[36px] items-center gap-2 px-2 text-mini">
                  <ChevronDown size={11} className="text-text-tertiary" />
                  <StatusIcon group={g.group} />
                  <span className="font-medium text-text-primary">{g.name}</span>
                  <span className="text-text-tertiary">{g.issues.length}</span>
                  <button
                    type="button"
                    aria-label="Add to this group"
                    className="ml-auto rounded-md p-0.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                  >
                    +
                  </button>
                </header>
                <ul>
                  {g.issues.map((issue) => (
                    <SelectableRow
                      key={issue.id}
                      issue={issue}
                      workspace={workspace}
                      selected={selectedIds.has(issue.id)}
                      onToggle={() => toggleRow(issue.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-elevated/95 px-3 py-1.5 text-mini text-text-primary shadow-popover backdrop-blur-xl">
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
              aria-label="Clear selection"
            >
              <X size={12} />
            </button>
            <span className="text-text-tertiary">⌘</span>
            <span className="text-text-secondary">Actions</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectableRow({
  issue,
  workspace,
  selected,
  onToggle,
}: {
  issue: Issue;
  workspace: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={clsx(
        "group/issue flex items-center transition-colors",
        selected && "bg-accent/[0.06]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? "Unselect issue" : "Select issue"}
        className={clsx(
          "ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all",
          selected
            ? "border-accent bg-accent text-white"
            : "border-border-strong opacity-0 hover:border-text-tertiary group-hover/issue:opacity-100",
        )}
      >
        {selected && <Check size={10} strokeWidth={3} />}
      </button>
      <div className="flex-1">
        <IssueRow issue={issue} workspaceSlug={workspace} />
      </div>
    </li>
  );
}

function ProjectSelectableRow({
  project,
  workspace,
  selected,
  onToggle,
}: {
  project: Project;
  workspace: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const target = project.target_date
    ? new Date(project.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";
  return (
    <li
      className={clsx(
        "group/proj flex items-center gap-2 border-b border-border-subtle px-2 py-1.5 text-small",
        selected && "bg-accent/[0.06]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? "Unselect project" : "Select project"}
        className={clsx(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all",
          selected
            ? "border-accent bg-accent text-white"
            : "border-border-strong opacity-0 hover:border-text-tertiary group-hover/proj:opacity-100",
        )}
      >
        {selected && <Check size={10} strokeWidth={3} />}
      </button>
      <a
        href={`/${workspace}/project/${project.slug_id}`}
        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <StateGlyph state={project.state} />
        <span className="truncate font-medium text-text-primary">{project.name}</span>
      </a>
      <span className="hidden w-[80px] items-center justify-center text-mini text-text-tertiary md:flex">
        {project.health ? <HealthIconSmall health={project.health as HealthValue} /> : <span>—</span>}
      </span>
      <span className="hidden w-[28px] items-center justify-center md:flex">
        <PriorityIcon value={project.priority as 0 | 1 | 2 | 3 | 4} />
      </span>
      <span className="hidden w-[100px] items-center gap-1 text-mini text-text-tertiary md:flex">
        {project.lead ? (
          <>
            <Avatar initials={project.lead.initials} color={project.lead.color} size={14} />
            <span className="truncate">{project.lead.name}</span>
          </>
        ) : (
          <span>No lead</span>
        )}
      </span>
      <span className="w-[80px] text-right text-mini text-text-tertiary">{target}</span>
    </li>
  );
}

function ProjectFilterMenu({
  projectStates,
  priorities,
  onProjectStates,
  onPriorities,
}: {
  projectStates: ProjectState[];
  priorities: number[];
  onProjectStates: (s: ProjectState[]) => void;
  onPriorities: (p: number[]) => void;
}) {
  const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];
  const STATES: ProjectState[] = ["planned", "started", "paused", "completed", "canceled"];

  function toggleState(s: ProjectState) {
    onProjectStates(projectStates.includes(s) ? projectStates.filter((x) => x !== s) : [...projectStates, s]);
  }
  function togglePrio(p: number) {
    onPriorities(priorities.includes(p) ? priorities.filter((x) => x !== p) : [...priorities, p]);
  }

  return (
    <div className="p-2 text-small">
      <Section label="State">
        {STATES.map((s) => (
          <PopoverItem key={s} active={projectStates.includes(s)} onClick={() => toggleState(s)}>
            <StateGlyph state={s} />
            <span className="capitalize">{s}</span>
            {projectStates.includes(s) && <span className="ml-auto text-text-tertiary">✓</span>}
          </PopoverItem>
        ))}
      </Section>
      <Section label="Priority">
        {PRIORITY_LABELS.map((label, p) => (
          <PopoverItem key={p} active={priorities.includes(p)} onClick={() => togglePrio(p)}>
            <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />
            <span>{label}</span>
            {priorities.includes(p) && <span className="ml-auto text-text-tertiary">✓</span>}
          </PopoverItem>
        ))}
      </Section>
    </div>
  );
}

interface ProjectGroup {
  name: string;
  icon: React.ReactNode;
  projects: Project[];
}

function groupProjects(projects: Project[], by: "state" | "priority" | "lead" | "none"): ProjectGroup[] {
  if (by === "none") {
    return projects.length ? [{ name: "All projects", icon: <span />, projects }] : [];
  }
  if (by === "state") {
    const order: ProjectState[] = ["started", "planned", "paused", "completed", "canceled"];
    const map = new Map<ProjectState, Project[]>();
    for (const p of projects) {
      if (!map.has(p.state)) map.set(p.state, []);
      map.get(p.state)!.push(p);
    }
    return order
      .filter((s) => map.has(s))
      .map((s) => ({
        name: s.charAt(0).toUpperCase() + s.slice(1),
        icon: <StateGlyph state={s} />,
        projects: map.get(s)!,
      }));
  }
  if (by === "priority") {
    const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];
    const map = new Map<number, Project[]>();
    for (const p of projects) {
      if (!map.has(p.priority)) map.set(p.priority, []);
      map.get(p.priority)!.push(p);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : a[0] - b[0]))
      .map(([prio, list]) => ({
        name: PRIORITY_LABELS[prio],
        icon: <PriorityIcon value={prio as 0 | 1 | 2 | 3 | 4} />,
        projects: list,
      }));
  }
  // lead
  const map = new Map<string, { name: string; icon: React.ReactNode; projects: Project[] }>();
  for (const p of projects) {
    const k = p.lead?.id ?? "_nolead";
    const name = p.lead?.name ?? "No lead";
    if (!map.has(k)) {
      map.set(k, {
        name,
        icon: p.lead ? (
          <Avatar initials={p.lead.initials} color={p.lead.color} size={14} />
        ) : (
          <span className="inline-block h-3 w-3 rounded-pill border border-dashed border-border-strong" />
        ),
        projects: [],
      });
    }
    map.get(k)!.projects.push(p);
  }
  return [...map.values()];
}

function FilterMenu({
  priorities,
  statusGroups,
  teamKeys,
  teams,
  onPriorities,
  onStatusGroups,
  onTeamKeys,
}: {
  priorities: number[];
  statusGroups: StateGroup[];
  teamKeys: string[];
  teams: Team[];
  onPriorities: (p: number[]) => void;
  onStatusGroups: (s: StateGroup[]) => void;
  onTeamKeys: (k: string[]) => void;
}) {
  const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];
  const STATUS_GROUPS: { v: StateGroup; label: string }[] = [
    { v: "backlog", label: "Backlog" },
    { v: "unstarted", label: "Todo" },
    { v: "started", label: "In progress" },
    { v: "completed", label: "Done" },
    { v: "canceled", label: "Canceled" },
  ];

  function togglePrio(p: number) {
    onPriorities(priorities.includes(p) ? priorities.filter((x) => x !== p) : [...priorities, p]);
  }
  function toggleStatus(s: StateGroup) {
    onStatusGroups(statusGroups.includes(s) ? statusGroups.filter((x) => x !== s) : [...statusGroups, s]);
  }
  function toggleTeam(k: string) {
    onTeamKeys(teamKeys.includes(k) ? teamKeys.filter((x) => x !== k) : [...teamKeys, k]);
  }

  return (
    <div className="p-2 text-small">
      <Section label="Priority">
        {PRIORITY_LABELS.map((label, p) => (
          <PopoverItem key={p} active={priorities.includes(p)} onClick={() => togglePrio(p)}>
            <AlertOctagon size={11} className="text-text-tertiary" />
            <span>{label}</span>
            {priorities.includes(p) && <span className="ml-auto text-text-tertiary">✓</span>}
          </PopoverItem>
        ))}
      </Section>
      <Section label="Status">
        {STATUS_GROUPS.map((s) => (
          <PopoverItem key={s.v} active={statusGroups.includes(s.v)} onClick={() => toggleStatus(s.v)}>
            <CircleDot size={11} className="text-text-tertiary" />
            <span>{s.label}</span>
            {statusGroups.includes(s.v) && <span className="ml-auto text-text-tertiary">✓</span>}
          </PopoverItem>
        ))}
      </Section>
      {teams.length > 0 && (
        <Section label="Team">
          {teams.map((t) => (
            <PopoverItem key={t.key} active={teamKeys.includes(t.key)} onClick={() => toggleTeam(t.key)}>
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: t.icon_color }} />
              <span>{t.name}</span>
              {teamKeys.includes(t.key) && <span className="ml-auto text-text-tertiary">✓</span>}
            </PopoverItem>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-1 py-1 text-micro font-medium uppercase tracking-[0.04em] text-text-quaternary">{label}</div>
      <PopoverList>{children}</PopoverList>
    </div>
  );
}

function ScopeTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 text-small font-medium transition-colors",
        active
          ? "bg-elevated text-text-primary ring-1 ring-white/[0.08]"
          : "text-text-tertiary ring-1 ring-border-subtle hover:bg-row-hover hover:text-text-secondary",
      )}
    >
      {label}
    </button>
  );
}

function DestRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5",
        active && "text-text-primary",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {active && <Check size={12} className="text-text-secondary" />}
    </button>
  );
}

function DestinationIcon({ dest }: { dest: SaveDestination }) {
  if (dest.kind === "personal") return <Lock size={11} className="text-text-tertiary" />;
  if (dest.kind === "workspace") return <Users size={11} className="text-text-tertiary" />;
  return <span className="inline-block h-3 w-3 rounded-sm" style={{ background: dest.team.icon_color }} />;
}

function destinationLabel(dest: SaveDestination): string {
  if (dest.kind === "team") return dest.team.name;
  return dest.label;
}

function groupIssues(issues: Issue[], by: "state" | "priority" | "assignee" | "team" | "none"): GroupBucket[] {
  if (by === "none") {
    return issues.length
      ? [{ name: "All issues", group: "started", position: 0, issues }]
      : [];
  }
  if (by === "state") {
    const map = new Map<string, GroupBucket>();
    for (const i of issues) {
      const key = i.state.name;
      if (!map.has(key)) {
        map.set(key, { name: i.state.name, group: i.state.group, position: i.state.position, issues: [] });
      }
      map.get(key)!.issues.push(i);
    }
    return [...map.values()].sort((a, b) => a.position - b.position);
  }
  if (by === "priority") {
    const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];
    const map = new Map<number, Issue[]>();
    for (const i of issues) {
      if (!map.has(i.priority)) map.set(i.priority, []);
      map.get(i.priority)!.push(i);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : a[0] - b[0]))
      .map(([p, list]) => ({ name: PRIORITY_LABELS[p], group: "started" as StateGroup, position: p, issues: list }));
  }
  if (by === "assignee") {
    const map = new Map<string, GroupBucket>();
    for (const i of issues) {
      const k = i.assignee?.id ?? "_unassigned";
      const n = i.assignee?.name ?? "Unassigned";
      if (!map.has(k)) map.set(k, { name: n, group: "started" as StateGroup, position: 0, issues: [] });
      map.get(k)!.issues.push(i);
    }
    return [...map.values()];
  }
  // team
  const map = new Map<string, GroupBucket>();
  for (const i of issues) {
    const k = i.team.key;
    if (!map.has(k)) map.set(k, { name: i.team.name, group: "started" as StateGroup, position: 0, issues: [] });
    map.get(k)!.issues.push(i);
  }
  return [...map.values()];
}
