"use client";

import { List, LayoutGrid, GitMerge, ChevronDown, Check } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import {
  useProjectsPrefs,
  type ProjectsGrouping,
  type ProjectsOrdering,
  type ProjectsView,
  type ShowClosed,
  type ProjectsPrefs,
} from "@/lib/projects-prefs";

const GROUPING_LABELS: Record<ProjectsGrouping, string> = {
  no_grouping: "No grouping",
  status: "Status",
  priority: "Priority",
  health: "Health",
  lead: "Lead",
  initiative: "Initiative",
  team: "Team",
};

const ORDERING_LABELS: Record<ProjectsOrdering, string> = {
  manual: "Manual",
  name: "Name",
  updated: "Last updated",
  created: "Created",
  priority: "Priority",
  target: "Target date",
  status: "Status",
};

const SHOW_CLOSED_LABELS: Record<ShowClosed, string> = {
  all: "All",
  active: "Active",
  hide_closed: "Hide closed",
};

const DISPLAY_PROP_KEYS = [
  { key: "show_milestones", label: "Milestones" },
  { key: "show_summary", label: "Summary" },
  { key: "show_priority", label: "Priority" },
  { key: "show_status", label: "Status" },
  { key: "show_health", label: "Health" },
  { key: "show_teams", label: "Teams" },
  { key: "show_lead", label: "Lead" },
  { key: "show_members", label: "Members" },
  { key: "show_dependencies", label: "Dependencies" },
  { key: "show_start_date", label: "Start date" },
  { key: "show_target_date", label: "Target date" },
  { key: "show_issues", label: "Issues" },
  { key: "show_created", label: "Created" },
  { key: "show_updated", label: "Updated" },
  { key: "show_completed", label: "Completed" },
  { key: "show_labels", label: "Labels" },
] as const;

export function ProjectsDisplayOptions({
  workspaceSlug,
  trigger,
}: {
  workspaceSlug: string;
  trigger: (props: { open: boolean; toggle: () => void; active: boolean }) => React.ReactNode;
}) {
  const { prefs, update, resetDisplay } = useProjectsPrefs(workspaceSlug);
  const dirty = displayDirty(prefs);

  return (
    <Popover
      align="end"
      width={360}
      surface="glass"
      trigger={({ open, toggle }) => trigger({ open, toggle, active: dirty })}
    >
      {() => (
        <div className="py-2.5">
          {/* View tabs */}
          <div className="mx-2 flex items-center gap-1 rounded-md bg-app/40 p-1">
            <ViewTab
              icon={<List size={12} />}
              label="List"
              active={prefs.view === "list"}
              onClick={() => update({ view: "list" })}
            />
            <ViewTab
              icon={<LayoutGrid size={12} />}
              label="Board"
              active={prefs.view === "board"}
              onClick={() => update({ view: "board" })}
            />
            <ViewTab
              icon={<GitMerge size={12} />}
              label="Timeline"
              active={prefs.view === "timeline"}
              onClick={() => update({ view: "timeline" })}
            />
          </div>

          <div className="mt-3 px-3">
            <Row label="Grouping">
              <NativeSelect
                value={prefs.grouping}
                onChange={(v) => update({ grouping: v as ProjectsGrouping })}
                options={Object.entries(GROUPING_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Row>
            <Row label="Ordering">
              <NativeSelect
                value={prefs.ordering}
                onChange={(v) => update({ ordering: v as ProjectsOrdering })}
                options={Object.entries(ORDERING_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Row>
            <Row label="Show closed projects">
              <NativeSelect
                value={prefs.show_closed}
                onChange={(v) => update({ show_closed: v as ShowClosed })}
                options={Object.entries(SHOW_CLOSED_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Row>
          </div>

          <hr className="my-2.5 border-border-subtle" />

          <div className="px-3">
            <div className="pb-1.5 text-mini font-medium text-text-secondary">List options</div>
            <div className="pb-2 text-micro text-text-tertiary">Display properties</div>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {DISPLAY_PROP_KEYS.map((d) => {
                const on = prefs[d.key as keyof ProjectsPrefs] as boolean;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => update({ [d.key]: !on } as Partial<ProjectsPrefs>)}
                    className={clsx(
                      "rounded-pill px-2 py-0.5 text-mini transition-colors",
                      on
                        ? "bg-row-selected text-text-primary"
                        : "bg-app/40 text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="my-2.5 border-border-subtle" />

          <div className="flex items-center justify-between gap-2 px-3">
            <button
              type="button"
              onClick={resetDisplay}
              className="text-mini text-text-tertiary hover:text-text-secondary"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {/* decorative — would push to all members */}}
              className="text-mini text-accent hover:underline"
              title="Coming soon"
            >
              Set default for everyone
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function ViewTab({
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
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-mini transition-colors",
        active
          ? "bg-elevated text-text-primary shadow-sm"
          : "text-text-tertiary hover:text-text-secondary",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-mini text-text-secondary">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md bg-app/40 py-1 pl-2 pr-6 text-mini text-text-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={10}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
    </div>
  );
}

function displayDirty(prefs: ProjectsPrefs): boolean {
  return (
    prefs.view !== "list" ||
    prefs.grouping !== "no_grouping" ||
    prefs.ordering !== "manual" ||
    prefs.show_closed !== "all"
  );
}

// suppress unused import warning until Check icon is wired into selected
// option row — kept for parity with Linear's option list (a hidden Check
// appears next to the active value when the popover is open).
void Check;
