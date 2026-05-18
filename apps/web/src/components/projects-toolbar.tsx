"use client";

import { useMemo, useState } from "react";
import { Layers, SlidersHorizontal, Filter as FilterIcon, PanelRight } from "lucide-react";
import clsx from "clsx";
import { ProjectsTable, type ProjectGroup } from "@/components/projects-table";
import { ProjectsBoardView } from "@/components/projects-board-view";
import { ProjectsTimelineView } from "@/components/projects-timeline-view";
import { ProjectsFilterPopover } from "@/components/projects-filter-popover";
import { ProjectsDisplayOptions } from "@/components/projects-display-options";
import { ProjectsInsights } from "@/components/projects-insights";
import { ProjectsViewsBar, ProjectsViewEditor, ProjectsViewToast } from "@/components/projects-views-bar";
import {
  useProjectsPrefs,
  type ProjectsPrefs,
  type HealthFilterValue,
  type DateFilterValue,
  type MilestoneFilterValue,
} from "@/lib/projects-prefs";
import type { Label, Member, Project, ProjectState, Team, SavedView } from "@/lib/api";

const STATUS_LABELS: Record<ProjectState, string> = {
  planned: "Planned",
  started: "In Progress",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const HEALTH_LABELS: Record<HealthFilterValue, string> = {
  onTrack: "On track",
  atRisk: "At risk",
  offTrack: "Off track",
  noUpdate: "No update",
};

export function ProjectsToolbar({
  projects,
  workspace,
  members,
  teams,
  labels,
}: {
  projects: Project[];
  workspace: string;
  members: Member[];
  teams: Team[];
  labels: Label[];
}) {
  const { prefs, update, activeFilterCount } = useProjectsPrefs(workspace);
  const [creatingView, setCreatingView] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [activeView, setActiveView] = useState<SavedView | null>(null);

  function selectView(v: SavedView | null) {
    setActiveView(v);
    if (v === null) return;
    try {
      const blob = JSON.parse(v.query);
      // Only apply known pref keys — the saved blob may be from an
      // older schema (forward-compat).
      update(blob);
    } catch (e) {
      console.error("bad saved view payload", e);
    }
  }

  const filtered = useMemo(
    () => applyFilters(projects, prefs, members),
    [projects, prefs, members],
  );

  const sorted = useMemo(() => applyOrdering(filtered, prefs.ordering), [filtered, prefs.ordering]);

  const grouped: ProjectGroup[] = useMemo(
    () => applyGrouping(sorted, prefs.grouping),
    [sorted, prefs.grouping],
  );

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex h-[40px] shrink-0 items-center gap-1 px-4 text-mini">
          <ProjectsViewsBar
            workspaceSlug={workspace}
            onEnterCreate={() => {
              setEditingView(null);
              setCreatingView(true);
            }}
            onEnterEdit={(v) => {
              setEditingView(v);
              setCreatingView(true);
            }}
            isCreating={creatingView}
            activeViewId={activeView?.id ?? null}
            onSelectView={selectView}
          />
          <button
            type="button"
            onClick={() =>
              update({
                grouping: prefs.grouping === "initiative" ? "no_grouping" : "initiative",
              })
            }
            className={clsx(
              "ml-0.5 rounded-md p-1",
              prefs.grouping === "initiative"
                ? "bg-row-selected text-text-primary"
                : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
            aria-label="Group by initiative"
            title="Group by initiative"
          >
            <Layers size={13} />
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ProjectsFilterPopover
              workspaceSlug={workspace}
              members={members}
              teams={teams}
              labels={labels}
              projects={projects}
              trigger={({ open, toggle, active }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={clsx(
                    "relative rounded-md p-1 hover:bg-row-hover",
                    open || active
                      ? "text-text-primary"
                      : "text-text-tertiary hover:text-text-secondary",
                  )}
                  aria-label="Filter"
                  title="Filter"
                >
                  <FilterIcon size={13} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-pill bg-accent px-1 text-[9px] font-medium text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            />

            <ProjectsDisplayOptions
              workspaceSlug={workspace}
              trigger={({ open, toggle, active }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={clsx(
                    "relative rounded-md p-1 hover:bg-row-hover",
                    open || active
                      ? "text-text-primary"
                      : "text-text-tertiary hover:text-text-secondary",
                  )}
                  aria-label="Display options"
                  title="Display options"
                >
                  <SlidersHorizontal size={13} />
                  {active && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-pill bg-accent" />
                  )}
                </button>
              )}
            />

            <button
              type="button"
              onClick={() => update({ insights_open: !prefs.insights_open })}
              className={clsx(
                "rounded-md p-1 hover:bg-row-hover",
                prefs.insights_open
                  ? "bg-row-selected text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary",
              )}
              aria-label="Insights"
              title="Insights"
            >
              <PanelRight size={13} />
            </button>
          </div>
        </div>

        {creatingView && (
          <ProjectsViewEditor
            workspaceSlug={workspace}
            prefs={prefs}
            editing={editingView}
            onClose={() => {
              setCreatingView(false);
              setEditingView(null);
            }}
          />
        )}

        <ProjectsViewToast workspaceSlug={workspace} />

        <ActiveFilterChips prefs={prefs} update={update} members={members} teams={teams} labels={labels} projects={projects} />

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState onClear={() => clearAllFilters(workspace)} />
          ) : prefs.view === "board" ? (
            <ProjectsBoardView
              projects={filtered}
              workspace={workspace}
              hiddenColumns={prefs.hidden_states as never}
              onHideColumn={(state) => {
                if (prefs.hidden_states.includes(state)) return;
                update({ hidden_states: [...prefs.hidden_states, state] });
              }}
              onShowColumn={(state) => {
                if (!prefs.hidden_states.includes(state)) return;
                update({ hidden_states: prefs.hidden_states.filter((s) => s !== state) });
              }}
              onNewProject={(state) => {
                window.dispatchEvent(
                  new CustomEvent("new-project:open", { detail: { state } }),
                );
              }}
            />
          ) : prefs.view === "timeline" ? (
            <ProjectsTimelineView projects={filtered} workspace={workspace} />
          ) : (
            <ProjectsTable
              groups={grouped}
              workspace={workspace}
              showGroupHeaders={prefs.grouping !== "no_grouping"}
              members={members}
              prefs={prefs}
            />
          )}
        </div>
      </div>

      {prefs.insights_open && (
        <ProjectsInsights
          workspaceSlug={workspace}
          projects={filtered}
          teams={teams}
          members={members}
        />
      )}
    </div>
  );
}

// ---- filtering / grouping / ordering ---------------------------------------

function applyFilters(projects: Project[], prefs: ProjectsPrefs, _members: Member[]): Project[] {
  const now = Date.now();
  const memberTeamKeys = (memberId: string): Set<string> => {
    void memberId; // members[].team_id is not on the wire — approximation below
    return new Set<string>();
  };
  void memberTeamKeys;
  const q = prefs.search.trim().toLowerCase();
  return projects.filter((p) => {
    // Show closed projects
    if (prefs.show_closed === "active" && p.state !== "started") return false;
    if (prefs.show_closed === "hide_closed" && (p.state === "completed" || p.state === "canceled")) return false;

    if (prefs.status.length > 0 && !prefs.status.includes(p.state)) return false;
    if (prefs.priorities.length > 0 && !prefs.priorities.includes(p.priority)) return false;

    if (prefs.health.length > 0) {
      const h: HealthFilterValue = p.health ?? "noUpdate";
      if (!prefs.health.includes(h)) return false;
    }

    if (prefs.lead_ids.length > 0) {
      if (!p.lead || !prefs.lead_ids.includes(p.lead.id)) return false;
    }

    if (prefs.creator_ids.length > 0) {
      if (!p.creator || !prefs.creator_ids.includes(p.creator.id)) return false;
    }

    if (prefs.member_ids.length > 0) {
      // No wire-level "project members" — approximate as lead OR creator.
      const ids = [p.lead?.id, p.creator?.id].filter(Boolean) as string[];
      if (!prefs.member_ids.some((id) => ids.includes(id))) return false;
    }

    if (prefs.team_keys.length > 0) {
      const keys = p.team_keys ?? [];
      if (!prefs.team_keys.some((k) => keys.includes(k))) return false;
    }

    if (prefs.project_ids.length > 0 && !prefs.project_ids.includes(p.id)) return false;

    if (prefs.no_initiatives && p.initiative_id) return false;

    if (prefs.label_ids.length > 0) {
      const ids = p.label_ids ?? [];
      if (!prefs.label_ids.some((id) => ids.includes(id))) return false;
    }

    if (prefs.template_ids.length > 0) {
      if (!p.template_id || !prefs.template_ids.includes(p.template_id)) return false;
    }

    if (prefs.relations_filter !== "any") {
      const has = (p.dependency_ids ?? []).length > 0;
      if (prefs.relations_filter === "with_relations" && !has) return false;
      if (prefs.relations_filter === "no_relations" && has) return false;
    }

    if (prefs.milestone_filter.length > 0) {
      const has = Boolean(p.next_milestone);
      const want = (v: MilestoneFilterValue) => prefs.milestone_filter.includes(v);
      if (has && !want("with_milestones") && want("no_milestones")) return false;
      if (!has && !want("no_milestones") && want("with_milestones")) return false;
      if (want("with_milestones") && !want("no_milestones") && !has) return false;
      if (want("no_milestones") && !want("with_milestones") && has) return false;
    }

    if (prefs.date_filter.length > 0) {
      // OR semantics across the chosen date facets.
      const target = p.target_date ? new Date(p.target_date).getTime() : null;
      const start = p.start_date ? new Date(p.start_date).getTime() : null;
      const matches = prefs.date_filter.some((f: DateFilterValue) => {
        if (f === "has_target") return target != null;
        if (f === "no_target") return target == null;
        if (f === "overdue") return target != null && target < now && p.state !== "completed";
        if (f === "has_start") return start != null;
        if (f === "no_start") return start == null;
        return false;
      });
      if (!matches) return false;
    }

    if (q) {
      const haystack = (p.name + " " + (p.description ?? "")).toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (prefs.ai_filter.trim()) {
      if (!matchesAiPrompt(p, prefs.ai_filter, _members)) return false;
    }

    if (prefs.advanced_rules.length > 0) {
      for (const r of prefs.advanced_rules) {
        if (!matchesAdvancedRule(p, r)) return false;
      }
    }

    return true;
  });
}

/**
 * Heuristic natural-language filter. Tokenizes the prompt and looks
 * for known signals (health phrases like "at risk", state names,
 * priority words, member names, "overdue" hints, etc.). Falls back to
 * a name-and-description substring match for any leftover tokens.
 */
function matchesAiPrompt(p: Project, prompt: string, members: Member[]): boolean {
  const text = prompt.toLowerCase();
  const checks: Array<(p: Project) => boolean> = [];

  // Health
  if (/at[\s-]?risk/.test(text)) checks.push((x) => x.health === "atRisk");
  if (/off[\s-]?track/.test(text)) checks.push((x) => x.health === "offTrack");
  if (/on[\s-]?track/.test(text)) checks.push((x) => x.health === "onTrack");
  if (/no update|stale/.test(text)) checks.push((x) => !x.health);

  // State
  if (/\b(in[\s-]?progress|started|active)\b/.test(text)) checks.push((x) => x.state === "started");
  if (/\bplanned|backlog\b/.test(text)) checks.push((x) => x.state === "planned");
  if (/\bpaused\b/.test(text)) checks.push((x) => x.state === "paused");
  if (/\bcompleted|done|shipped\b/.test(text)) checks.push((x) => x.state === "completed");
  if (/\bcanceled|cancelled\b/.test(text)) checks.push((x) => x.state === "canceled");

  // Priority
  if (/\burgent\b/.test(text)) checks.push((x) => x.priority === 1);
  if (/\bhigh priority|high\b/.test(text)) checks.push((x) => x.priority === 2);
  if (/\bmedium priority\b/.test(text)) checks.push((x) => x.priority === 3);
  if (/\blow priority\b/.test(text)) checks.push((x) => x.priority === 4);

  // Dates
  if (/\boverdue\b/.test(text)) {
    checks.push((x) => x.target_date != null && new Date(x.target_date).getTime() < Date.now() && x.state !== "completed");
  }
  if (/no target/.test(text)) checks.push((x) => !x.target_date);
  if (/has target|with target/.test(text)) checks.push((x) => !!x.target_date);

  // Initiative
  if (/no initiative/.test(text)) checks.push((x) => !x.initiative_id);

  // Lead by name
  for (const m of members) {
    const firstName = m.name.split(/\s+/)[0]?.toLowerCase();
    if (firstName && new RegExp(`\\b(led by|lead.*${escapeRegex(firstName)}|${escapeRegex(firstName)}'s)\\b`).test(text)) {
      checks.push((x) => x.lead?.id === m.id);
    } else if (firstName && text.includes(`by ${firstName}`)) {
      checks.push((x) => x.lead?.id === m.id || x.creator?.id === m.id);
    }
  }

  if (checks.length === 0) {
    // Fall back to substring search across name+description.
    const haystack = (p.name + " " + (p.description ?? "")).toLowerCase();
    return haystack.includes(text);
  }
  return checks.every((fn) => fn(p));
}

function matchesAdvancedRule(p: Project, rule: { field: string; operator: string; value: string }): boolean {
  const { field, operator, value } = rule;
  let actual: string | number = "";
  if (field === "name") actual = p.name.toLowerCase();
  else if (field === "status") actual = p.state;
  else if (field === "priority") actual = String(p.priority);
  else if (field === "health") actual = p.health ?? "noUpdate";
  else if (field === "lead") actual = p.lead?.id ?? "";
  else if (field === "creator") actual = p.creator?.id ?? "";
  else if (field === "issue_count") actual = p.issue_count;
  else if (field === "label") {
    const ids = p.label_ids ?? [];
    if (operator === "contains") return !value || ids.some((id) => id === value);
    if (operator === "equals") return ids.length === 1 && ids[0] === value;
    if (operator === "not_equals") return !ids.includes(value);
    return true;
  }

  const numeric = !isNaN(Number(value)) ? Number(value) : null;
  if (operator === "contains") return String(actual).toLowerCase().includes(value.toLowerCase());
  if (operator === "equals") return String(actual) === value;
  if (operator === "not_equals") return String(actual) !== value;
  if (operator === "gt") return numeric != null && Number(actual) > numeric;
  if (operator === "lt") return numeric != null && Number(actual) < numeric;
  return true;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyOrdering(projects: Project[], ordering: ProjectsPrefs["ordering"]): Project[] {
  const out = [...projects];
  if (ordering === "manual") return out;
  out.sort((a, b) => {
    if (ordering === "name") return a.name.localeCompare(b.name);
    if (ordering === "priority") {
      // Urgent (1) first; "No priority" (0) last.
      const ra = a.priority === 0 ? 99 : a.priority;
      const rb = b.priority === 0 ? 99 : b.priority;
      return ra - rb;
    }
    if (ordering === "target") {
      const ad = a.target_date ?? "9999";
      const bd = b.target_date ?? "9999";
      return ad.localeCompare(bd);
    }
    if (ordering === "status") return a.state.localeCompare(b.state);
    if (ordering === "created") {
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    }
    if (ordering === "updated") {
      const av = a.health_updated_at ?? a.created_at ?? "";
      const bv = b.health_updated_at ?? b.created_at ?? "";
      return bv.localeCompare(av);
    }
    return 0;
  });
  return out;
}

function applyGrouping(projects: Project[], grouping: ProjectsPrefs["grouping"]): ProjectGroup[] {
  if (grouping === "no_grouping") return [{ key: "all", label: "", projects }];

  const map = new Map<string, ProjectGroup>();
  const ensure = (key: string, label: string) => {
    if (!map.has(key)) map.set(key, { key, label, projects: [] });
    return map.get(key)!;
  };

  for (const p of projects) {
    if (grouping === "status") {
      ensure(p.state, STATUS_LABELS[p.state]).projects.push(p);
    } else if (grouping === "priority") {
      ensure(String(p.priority), PRIORITY_LABELS[p.priority]).projects.push(p);
    } else if (grouping === "health") {
      const h: HealthFilterValue = p.health ?? "noUpdate";
      ensure(h, HEALTH_LABELS[h]).projects.push(p);
    } else if (grouping === "lead") {
      ensure(p.lead?.id ?? "none", p.lead?.name ?? "No lead").projects.push(p);
    } else if (grouping === "initiative") {
      ensure(p.initiative_id ?? "none", p.initiative_name ?? "No initiative").projects.push(p);
    } else if (grouping === "team") {
      const keys = p.team_keys ?? [];
      if (keys.length === 0) ensure("none", "No team").projects.push(p);
      else for (const k of keys) ensure(k, k).projects.push(p);
    }
  }

  return Array.from(map.values());
}

function clearAllFilters(slug: string) {
  // Reach into the same prefs store the hook uses. We re-read inside the
  // EmptyState callback rather than capture stale state.
  try {
    const key = `projects-prefs:${slug}`;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const next = {
        ...parsed,
        status: [],
        priorities: [],
        health: [],
        lead_ids: [],
        member_ids: [],
        creator_ids: [],
        team_keys: [],
        label_ids: [],
        project_ids: [],
        date_filter: [],
        no_initiatives: false,
        milestone_filter: [],
        search: "",
      };
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("projects-prefs:changed"));
    }
  } catch {
    // ignore
  }
}

function ActiveFilterChips({
  prefs,
  update,
  members,
  teams,
  labels,
  projects,
}: {
  prefs: ProjectsPrefs;
  update: (patch: Partial<ProjectsPrefs>) => void;
  members: Member[];
  teams: Team[];
  labels: Label[];
  projects: Project[];
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  for (const s of prefs.status) {
    chips.push({
      label: `Status: ${STATUS_LABELS[s as ProjectState] ?? s}`,
      onRemove: () => update({ status: prefs.status.filter((v) => v !== s) }),
    });
  }
  for (const p of prefs.priorities) {
    chips.push({
      label: `Priority: ${PRIORITY_LABELS[p]}`,
      onRemove: () => update({ priorities: prefs.priorities.filter((v) => v !== p) }),
    });
  }
  for (const h of prefs.health) {
    chips.push({
      label: `Health: ${HEALTH_LABELS[h]}`,
      onRemove: () => update({ health: prefs.health.filter((v) => v !== h) }),
    });
  }
  for (const id of prefs.lead_ids) {
    const m = members.find((x) => x.id === id);
    chips.push({
      label: `Lead: ${m?.name ?? id}`,
      onRemove: () => update({ lead_ids: prefs.lead_ids.filter((v) => v !== id) }),
    });
  }
  for (const id of prefs.creator_ids) {
    const m = members.find((x) => x.id === id);
    chips.push({
      label: `Creator: ${m?.name ?? id}`,
      onRemove: () => update({ creator_ids: prefs.creator_ids.filter((v) => v !== id) }),
    });
  }
  for (const id of prefs.member_ids) {
    const m = members.find((x) => x.id === id);
    chips.push({
      label: `Member: ${m?.name ?? id}`,
      onRemove: () => update({ member_ids: prefs.member_ids.filter((v) => v !== id) }),
    });
  }
  for (const k of prefs.team_keys) {
    const t = teams.find((x) => x.key === k);
    chips.push({
      label: `Team: ${t?.name ?? k}`,
      onRemove: () => update({ team_keys: prefs.team_keys.filter((v) => v !== k) }),
    });
  }
  for (const id of prefs.label_ids) {
    const l = labels.find((x) => x.id === id);
    chips.push({
      label: `Label: ${l?.name ?? id}`,
      onRemove: () => update({ label_ids: prefs.label_ids.filter((v) => v !== id) }),
    });
  }
  for (const id of prefs.project_ids) {
    const proj = projects.find((x) => x.id === id);
    chips.push({
      label: `Project: ${proj?.name ?? id}`,
      onRemove: () => update({ project_ids: prefs.project_ids.filter((v) => v !== id) }),
    });
  }
  for (const d of prefs.date_filter) {
    chips.push({
      label: `Date: ${d.replace(/_/g, " ")}`,
      onRemove: () => update({ date_filter: prefs.date_filter.filter((v) => v !== d) }),
    });
  }
  for (const m of prefs.milestone_filter) {
    chips.push({
      label: `${m === "with_milestones" ? "With milestones" : "No milestones"}`,
      onRemove: () => update({ milestone_filter: prefs.milestone_filter.filter((v) => v !== m) }),
    });
  }
  if (prefs.no_initiatives) {
    chips.push({
      label: "No initiatives",
      onRemove: () => update({ no_initiatives: false }),
    });
  }
  if (prefs.search.trim()) {
    chips.push({
      label: `Search: ${prefs.search}`,
      onRemove: () => update({ search: "" }),
    });
  }
  for (const id of prefs.template_ids) {
    chips.push({
      label: `Template: ${id.slice(0, 6)}…`,
      onRemove: () => update({ template_ids: prefs.template_ids.filter((v) => v !== id) }),
    });
  }
  if (prefs.relations_filter !== "any") {
    chips.push({
      label: prefs.relations_filter === "with_relations" ? "Has dependencies" : "No dependencies",
      onRemove: () => update({ relations_filter: "any" }),
    });
  }
  if (prefs.ai_filter.trim()) {
    chips.push({
      label: `AI: ${prefs.ai_filter.slice(0, 30)}${prefs.ai_filter.length > 30 ? "…" : ""}`,
      onRemove: () => update({ ai_filter: "" }),
    });
  }
  if (prefs.advanced_rules.length > 0) {
    chips.push({
      label: `${prefs.advanced_rules.length} advanced rule${prefs.advanced_rules.length === 1 ? "" : "s"}`,
      onRemove: () => update({ advanced_rules: [] }),
    });
  }

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-4 py-1.5">
      {chips.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={c.onRemove}
          className="group inline-flex items-center gap-1 rounded-pill border border-border-subtle bg-elevated px-2 py-0.5 text-mini text-text-secondary hover:border-border-strong hover:text-text-primary"
        >
          <span>{c.label}</span>
          <span className="text-text-tertiary group-hover:text-text-primary">×</span>
        </button>
      ))}
    </div>
  );
}


function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-small text-text-tertiary">
      <span>No projects match these filters.</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-md px-2.5 py-1 text-mini text-text-secondary hover:bg-row-hover"
      >
        Clear filters
      </button>
    </div>
  );
}
