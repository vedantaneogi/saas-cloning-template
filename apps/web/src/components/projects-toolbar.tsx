"use client";

import { useMemo, useState } from "react";
import { Layers, SlidersHorizontal, Check, LayoutGrid, List, Eye } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverList, PopoverItem } from "@/components/popover";
import { ProjectsTable, type ProjectGroup } from "@/components/projects-table";
import { ProjectsGrid } from "@/components/projects-grid";
import type { Project, ProjectState } from "@/lib/api";

type Health = "onTrack" | "atRisk" | "offTrack";
type GroupBy = "none" | "status" | "health" | "lead";
type SortBy = "updated" | "name" | "target" | "status";
type Display = "table" | "grid";

const STATUS_OPTIONS: { value: ProjectState; label: string; dot: string }[] = [
  { value: "planned", label: "Planned", dot: "#95a2b3" },
  { value: "started", label: "Started", dot: "#5e6ad2" },
  { value: "paused", label: "Paused", dot: "#d9b34c" },
  { value: "completed", label: "Completed", dot: "#22c55e" },
  { value: "canceled", label: "Canceled", dot: "#6b6f76" },
];

const HEALTH_OPTIONS: { value: Health; label: string; dot: string }[] = [
  { value: "onTrack", label: "On track", dot: "#22c55e" },
  { value: "atRisk", label: "At risk", dot: "#d9b34c" },
  { value: "offTrack", label: "Off track", dot: "#f2453d" },
];

export function ProjectsToolbar({ projects, workspace }: { projects: Project[]; workspace: string }) {
  const [statusFilter, setStatusFilter] = useState<Set<ProjectState>>(new Set());
  const [healthFilter, setHealthFilter] = useState<Set<Health>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [display, setDisplay] = useState<Display>("table");

  const filtered = useMemo(() => {
    let out = projects;
    if (statusFilter.size > 0) out = out.filter((p) => statusFilter.has(p.state));
    if (healthFilter.size > 0) out = out.filter((p) => (p.health ? healthFilter.has(p.health) : false));
    out = [...out].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "target") {
        const ad = a.target_date ?? "9999";
        const bd = b.target_date ?? "9999";
        return ad.localeCompare(bd);
      }
      if (sortBy === "status") return a.state.localeCompare(b.state);
      // updated — keep API order (most-recent first)
      return 0;
    });
    return out;
  }, [projects, statusFilter, healthFilter, sortBy]);

  const grouped: ProjectGroup[] = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", projects: filtered }];
    const groups = new Map<string, ProjectGroup>();
    for (const p of filtered) {
      let key: string;
      let label: string;
      if (groupBy === "status") {
        key = p.state;
        label = STATUS_OPTIONS.find((s) => s.value === p.state)?.label ?? p.state;
      } else if (groupBy === "health") {
        key = p.health ?? "none";
        label = HEALTH_OPTIONS.find((h) => h.value === p.health)?.label ?? "No update";
      } else {
        key = p.lead?.id ?? "none";
        label = p.lead?.name ?? "No lead";
      }
      if (!groups.has(key)) groups.set(key, { key, label, projects: [] });
      groups.get(key)!.projects.push(p);
    }
    return Array.from(groups.values());
  }, [filtered, groupBy]);

  const filterCount = statusFilter.size + healthFilter.size;
  const displayDirty = groupBy !== "none" || sortBy !== "updated";

  function toggleStatus(s: ProjectState) {
    setStatusFilter((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }
  function toggleHealth(h: Health) {
    setHealthFilter((cur) => {
      const next = new Set(cur);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }
  function clearFilters() {
    setStatusFilter(new Set());
    setHealthFilter(new Set());
  }

  return (
    <>
      <div className="flex h-[40px] shrink-0 items-center gap-1 px-4 text-mini">
        <button type="button" className="rounded-pill bg-row-selected px-2.5 py-1 text-text-primary">
          All projects
        </button>
        <button
          type="button"
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Group by initiative"
          title="Group by initiative"
        >
          <Layers size={13} />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <Popover
            align="end"
            width={240}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className={clsx(
                  "relative rounded-md p-1 hover:bg-row-hover",
                  open || filterCount > 0 ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
                )}
                aria-label="Filter"
                title="Filter"
              >
                <SlidersHorizontal size={13} />
                {filterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-pill bg-priority-urgent" />
                )}
              </button>
            )}
          >
            {() => (
              <div className="py-1.5">
                <SectionLabel>Status</SectionLabel>
                {STATUS_OPTIONS.map((s) => (
                  <CheckRow
                    key={s.value}
                    checked={statusFilter.has(s.value)}
                    onClick={() => toggleStatus(s.value)}
                  >
                    <span className="inline-block h-2 w-2 rounded-pill" style={{ background: s.dot }} />
                    {s.label}
                  </CheckRow>
                ))}
                <Divider />
                <SectionLabel>Health</SectionLabel>
                {HEALTH_OPTIONS.map((h) => (
                  <CheckRow
                    key={h.value}
                    checked={healthFilter.has(h.value)}
                    onClick={() => toggleHealth(h.value)}
                  >
                    <span className="inline-block h-2 w-2 rounded-pill" style={{ background: h.dot }} />
                    {h.label}
                  </CheckRow>
                ))}
                {filterCount > 0 && (
                  <>
                    <Divider />
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="block w-full px-2.5 py-1.5 text-left text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            )}
          </Popover>

          <Popover
            align="end"
            width={240}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className={clsx(
                  "relative rounded-md p-1 hover:bg-row-hover",
                  open || displayDirty ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
                )}
                aria-label="Display options"
                title="Display options"
              >
                <Eye size={13} />
                {displayDirty && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-pill bg-accent" />
                )}
              </button>
            )}
          >
            {() => (
              <div className="py-1.5">
                <SectionLabel>Group by</SectionLabel>
                <PopoverList>
                  {(["none", "status", "health", "lead"] as GroupBy[]).map((g) => (
                    <PopoverItem key={g} active={groupBy === g} onClick={() => setGroupBy(g)}>
                      <span className="capitalize">{g === "none" ? "No grouping" : g}</span>
                    </PopoverItem>
                  ))}
                </PopoverList>
                <Divider />
                <SectionLabel>Sort by</SectionLabel>
                <PopoverList>
                  {(["updated", "name", "target", "status"] as SortBy[]).map((s) => (
                    <PopoverItem key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
                      <span className="capitalize">{s === "target" ? "Target date" : s}</span>
                    </PopoverItem>
                  ))}
                </PopoverList>
              </div>
            )}
          </Popover>

          <button
            type="button"
            onClick={() => setDisplay((d) => (d === "table" ? "grid" : "table"))}
            className={clsx(
              "rounded-md p-1 hover:bg-row-hover",
              display === "grid" ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
            )}
            aria-label={display === "table" ? "Switch to grid view" : "Switch to list view"}
            title={display === "table" ? "Grid view" : "List view"}
          >
            {display === "table" ? <LayoutGrid size={13} /> : <List size={13} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState filterActive={filterCount > 0} onClear={clearFilters} />
        ) : display === "table" ? (
          <ProjectsTable groups={grouped} workspace={workspace} showGroupHeaders={groupBy !== "none"} />
        ) : (
          grouped.map((g) => (
            <section key={g.key}>
              {groupBy !== "none" && (
                <header className="flex h-[36px] items-center gap-2 px-4 text-mini text-text-tertiary">
                  <span className="font-medium text-text-secondary">{g.label || "—"}</span>
                  <span>{g.projects.length}</span>
                </header>
              )}
              <ProjectsGrid projects={g.projects} workspace={workspace} />
            </section>
          ))
        )}
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-1 text-micro font-medium uppercase tracking-wider text-text-tertiary">
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="my-1 border-border-subtle" />;
}

function CheckRow({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
    >
      <span
        className={clsx(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
          checked ? "border-accent bg-accent text-white" : "border-border-strong"
        )}
      >
        {checked && <Check size={9} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function EmptyState({ filterActive, onClear }: { filterActive: boolean; onClear: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-small text-text-tertiary">
      <span>{filterActive ? "No projects match these filters." : "No projects yet."}</span>
      {filterActive && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2.5 py-1 text-mini text-text-secondary hover:bg-row-hover"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
