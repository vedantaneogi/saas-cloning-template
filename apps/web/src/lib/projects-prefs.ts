"use client";

import { useEffect, useState } from "react";

/**
 * Per-workspace prefs for the /projects list. Mirrors my-issues-prefs:
 * localStorage cache + custom event so toolbar / list / insights panel
 * stay in sync without prop drilling.
 */

export type ProjectsView = "list" | "board" | "timeline";
export type ProjectsGrouping =
  | "no_grouping"
  | "status"
  | "priority"
  | "health"
  | "lead"
  | "initiative"
  | "team";
export type ProjectsOrdering =
  | "manual"
  | "name"
  | "updated"
  | "created"
  | "priority"
  | "target"
  | "status";
export type ShowClosed = "all" | "active" | "hide_closed";
export type ProjectsInsightsTab = "health" | "teams" | "leads";

export type HealthFilterValue = "onTrack" | "atRisk" | "offTrack" | "noUpdate";
export type DateFilterValue =
  | "has_target"
  | "no_target"
  | "overdue"
  | "has_start"
  | "no_start";
export type MilestoneFilterValue = "with_milestones" | "no_milestones";
export type TriState = "any" | "yes" | "no";

export type AdvancedRuleField =
  | "name"
  | "status"
  | "priority"
  | "health"
  | "lead"
  | "creator"
  | "issue_count"
  | "label";
export type AdvancedRuleOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "gt"
  | "lt"
  | "in";

export interface AdvancedRule {
  id: string;
  field: AdvancedRuleField;
  operator: AdvancedRuleOperator;
  value: string;
}

export type RelationsFilterValue = "any" | "with_relations" | "no_relations";

export interface ProjectsPrefs {
  // Filters — empty array (or "any") means dimension is off.
  status: string[];           // ProjectState values
  priorities: number[];       // 0..4
  health: HealthFilterValue[];
  lead_ids: string[];
  member_ids: string[];       // member ids belonging to project's teams
  creator_ids: string[];
  team_keys: string[];
  label_ids: string[];
  template_ids: string[];
  project_ids: string[];      // "Specific project" — restrict to these
  date_filter: DateFilterValue[];
  no_initiatives: boolean;    // when true, only show projects with no initiative
  milestone_filter: MilestoneFilterValue[];
  relations_filter: RelationsFilterValue;
  ai_filter: string;          // free-text NL filter prompt
  advanced_rules: AdvancedRule[]; // structured query rows
  search: string;             // title + summary search
  // Display
  view: ProjectsView;
  grouping: ProjectsGrouping;
  ordering: ProjectsOrdering;
  show_closed: ShowClosed;
  // Display properties — column visibility
  show_milestones: boolean;
  show_summary: boolean;
  show_priority: boolean;
  show_status: boolean;
  show_health: boolean;
  show_teams: boolean;
  show_lead: boolean;
  show_members: boolean;
  show_dependencies: boolean;
  show_start_date: boolean;
  show_target_date: boolean;
  show_issues: boolean;
  show_created: boolean;
  show_updated: boolean;
  show_completed: boolean;
  show_labels: boolean;
  // Insights right rail
  insights_open: boolean;
  insights_tab: ProjectsInsightsTab;
  // Board view — columns the user manually hid via the 3-dot menu.
  hidden_states: string[];
}

const DEFAULTS: ProjectsPrefs = {
  status: [],
  priorities: [],
  health: [],
  lead_ids: [],
  member_ids: [],
  creator_ids: [],
  team_keys: [],
  label_ids: [],
  template_ids: [],
  project_ids: [],
  date_filter: [],
  no_initiatives: false,
  milestone_filter: [],
  relations_filter: "any",
  ai_filter: "",
  advanced_rules: [],
  search: "",
  view: "list",
  grouping: "no_grouping",
  ordering: "manual",
  show_closed: "all",
  show_milestones: true,
  show_summary: false,
  show_priority: true,
  show_status: true,
  show_health: true,
  show_teams: false,
  show_lead: true,
  show_members: false,
  show_dependencies: false,
  show_start_date: false,
  show_target_date: true,
  show_issues: true,
  show_created: false,
  show_updated: false,
  show_completed: false,
  show_labels: false,
  insights_open: false,
  insights_tab: "health",
  hidden_states: [],
};

const cache = new Map<string, ProjectsPrefs>();
const EVENT = "projects-prefs:changed";

function storageKey(slug: string) {
  return `projects-prefs:${slug}`;
}

function read(slug: string): ProjectsPrefs {
  if (cache.has(slug)) return cache.get(slug)!;
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ProjectsPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(slug: string, prefs: ProjectsPrefs) {
  cache.set(slug, prefs);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useProjectsPrefs(slug: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!cache.has(slug)) cache.set(slug, read(slug));
    function refresh() {
      // Re-read from localStorage in case an external mutator (saved
      // view import, dev evaluate, another tab) wrote without going
      // through write(). This keeps the in-memory cache authoritative.
      cache.delete(slug);
      cache.set(slug, read(slug));
      setTick((n) => n + 1);
    }
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [slug]);

  const prefs = cache.get(slug) ?? read(slug);

  function update(patch: Partial<ProjectsPrefs>) {
    write(slug, { ...prefs, ...patch });
  }

  function toggleInList<K extends keyof ProjectsPrefs>(
    key: K,
    value: ProjectsPrefs[K] extends Array<infer T> ? T : never,
  ) {
    const current = (prefs[key] as unknown as Array<unknown>) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next as ProjectsPrefs[K] } as unknown as Partial<ProjectsPrefs>);
  }

  function clearFilters() {
    update({
      status: [],
      priorities: [],
      health: [],
      lead_ids: [],
      member_ids: [],
      creator_ids: [],
      team_keys: [],
      label_ids: [],
      template_ids: [],
      project_ids: [],
      date_filter: [],
      no_initiatives: false,
      milestone_filter: [],
      relations_filter: "any",
      ai_filter: "",
      advanced_rules: [],
      search: "",
    });
  }

  function resetDisplay() {
    update({
      view: "list",
      grouping: "no_grouping",
      ordering: "manual",
      show_closed: "all",
      show_milestones: true,
      show_summary: false,
      show_priority: true,
      show_status: true,
      show_health: true,
      show_teams: false,
      show_lead: true,
      show_members: false,
      show_dependencies: false,
      show_start_date: false,
      show_target_date: true,
      show_issues: true,
      show_created: false,
      show_updated: false,
      show_completed: false,
      show_labels: false,
    });
  }

  const activeFilterCount =
    prefs.status.length +
    prefs.priorities.length +
    prefs.health.length +
    prefs.lead_ids.length +
    prefs.member_ids.length +
    prefs.creator_ids.length +
    prefs.team_keys.length +
    prefs.label_ids.length +
    prefs.template_ids.length +
    prefs.project_ids.length +
    prefs.date_filter.length +
    (prefs.no_initiatives ? 1 : 0) +
    prefs.milestone_filter.length +
    (prefs.relations_filter !== "any" ? 1 : 0) +
    (prefs.ai_filter.trim() ? 1 : 0) +
    prefs.advanced_rules.length +
    (prefs.search.trim() ? 1 : 0);

  return { prefs, update, toggleInList, clearFilters, resetDisplay, activeFilterCount };
}
