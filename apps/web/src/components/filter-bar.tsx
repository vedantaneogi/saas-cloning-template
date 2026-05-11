"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, X, ChevronRight } from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { Avatar, PriorityIcon, StatusIcon } from "@/components/icons";
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

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

export function FilterBar({ workspaceSlug, teamKey }: { workspaceSlug: string; teamKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    listMembers(workspaceSlug).then(setMembers);
    listTeamLabels(workspaceSlug, teamKey).then(setLabels);
    listTeamStates(workspaceSlug, teamKey).then(setStates);
    listProjects(workspaceSlug).then(setProjects);
  }, [workspaceSlug, teamKey]);

  const active = useMemo(() => {
    const out: { property: string; value: string; label: React.ReactNode }[] = [];
    const priority = params.get("priority");
    if (priority) {
      priority.split(",").forEach((p) => {
        const i = Number(p);
        out.push({
          property: "priority",
          value: p,
          label: (
            <>
              <PriorityIcon value={i as 0 | 1 | 2 | 3 | 4} />
              <span>{PRIORITY_LABELS[i] ?? p}</span>
            </>
          ),
        });
      });
    }
    const stateIds = params.get("state");
    if (stateIds) {
      stateIds.split(",").forEach((id) => {
        const s = states.find((x) => x.id === id);
        out.push({
          property: "state",
          value: id,
          label: (
            <>
              <StatusIcon group={s?.group ?? "unstarted"} />
              <span>{s?.name ?? "State"}</span>
            </>
          ),
        });
      });
    }
    const assigneeIds = params.get("assignee");
    if (assigneeIds) {
      assigneeIds.split(",").forEach((id) => {
        const m = members.find((x) => x.id === id);
        out.push({
          property: "assignee",
          value: id,
          label: m ? (
            <>
              <Avatar initials={m.initials} color={m.color} size={14} />
              <span>{m.name}</span>
            </>
          ) : (
            <span>{id === "none" ? "No assignee" : "Member"}</span>
          ),
        });
      });
    }
    const labelIds = params.get("label");
    if (labelIds) {
      labelIds.split(",").forEach((id) => {
        const l = labels.find((x) => x.id === id);
        out.push({
          property: "label",
          value: id,
          label: l ? (
            <>
              <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
              <span>{l.name}</span>
            </>
          ) : (
            <span>Label</span>
          ),
        });
      });
    }
    const projectIds = params.get("project");
    if (projectIds) {
      projectIds.split(",").forEach((id) => {
        const p = projects.find((x) => x.id === id);
        out.push({
          property: "project",
          value: id,
          label: p ? (
            <>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.icon_color }} />
              <span>{p.name}</span>
            </>
          ) : (
            <span>{id === "none" ? "No project" : "Project"}</span>
          ),
        });
      });
    }
    return out;
  }, [params, members, labels, states, projects]);

  function removeFilter(property: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    const existing = sp.get(property);
    if (!existing) return;
    const next = existing.split(",").filter((v) => v !== value).join(",");
    if (next) sp.set(property, next);
    else sp.delete(property);
    router.push(sp.toString() ? `${pathname}?${sp}` : pathname);
  }

  function addFilter(property: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    const existing = sp.get(property);
    const set = new Set(existing ? existing.split(",") : []);
    set.add(value);
    sp.set(property, [...set].join(","));
    router.push(`${pathname}?${sp}`);
  }

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-5 py-1.5">
      {active.map((f, i) => (
        <span
          key={`${f.property}:${f.value}:${i}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-pill px-2 py-0.5 text-mini text-text-secondary"
        >
          <span className="text-text-tertiary">{labelForProperty(f.property)}</span>
          <ChevronRight size={10} className="text-text-quaternary" />
          {f.label}
          <button
            onClick={() => removeFilter(f.property, f.value)}
            className="ml-0.5 rounded-sm text-text-tertiary hover:text-text-secondary"
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function FilterTrigger({
  workspaceSlug,
  teamKey,
}: {
  workspaceSlug: string;
  teamKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [property, setProperty] = useState<string | null>(null);

  useEffect(() => {
    listMembers(workspaceSlug).then(setMembers);
    listTeamLabels(workspaceSlug, teamKey).then(setLabels);
    listTeamStates(workspaceSlug, teamKey).then(setStates);
    listProjects(workspaceSlug).then(setProjects);
  }, [workspaceSlug, teamKey]);

  function addFilter(prop: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    const existing = sp.get(prop);
    const set = new Set(existing ? existing.split(",") : []);
    set.add(value);
    sp.set(prop, [...set].join(","));
    router.push(`${pathname}?${sp}`);
  }

  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Filter"
        >
          <Filter size={15} />
        </button>
      )}
      align="end"
      width={220}
    >
      {({ close }) => {
        if (!property) {
          return (
            <PopoverList>
              <PopoverItem onClick={() => setProperty("priority")}>Priority…</PopoverItem>
              <PopoverItem onClick={() => setProperty("state")}>Status…</PopoverItem>
              <PopoverItem onClick={() => setProperty("assignee")}>Assignee…</PopoverItem>
              <PopoverItem onClick={() => setProperty("label")}>Label…</PopoverItem>
              <PopoverItem onClick={() => setProperty("project")}>Project…</PopoverItem>
            </PopoverList>
          );
        }
        if (property === "priority") {
          return (
            <PopoverList>
              {[1, 2, 3, 4, 0].map((p) => (
                <PopoverItem
                  key={p}
                  onClick={() => {
                    addFilter("priority", String(p));
                    setProperty(null);
                    close();
                  }}
                >
                  <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />
                  {PRIORITY_LABELS[p]}
                </PopoverItem>
              ))}
            </PopoverList>
          );
        }
        if (property === "state") {
          return (
            <PopoverList>
              {states.map((s) => (
                <PopoverItem
                  key={s.id}
                  onClick={() => {
                    addFilter("state", s.id);
                    setProperty(null);
                    close();
                  }}
                >
                  <StatusIcon group={s.group} />
                  {s.name}
                </PopoverItem>
              ))}
            </PopoverList>
          );
        }
        if (property === "assignee") {
          return (
            <PopoverList>
              <PopoverItem
                onClick={() => {
                  addFilter("assignee", "none");
                  setProperty(null);
                  close();
                }}
              >
                <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
                No assignee
              </PopoverItem>
              {members.map((m) => (
                <PopoverItem
                  key={m.id}
                  onClick={() => {
                    addFilter("assignee", m.id);
                    setProperty(null);
                    close();
                  }}
                >
                  <Avatar initials={m.initials} color={m.color} size={18} />
                  {m.name}
                </PopoverItem>
              ))}
            </PopoverList>
          );
        }
        if (property === "label") {
          return (
            <PopoverList>
              {labels.map((l) => (
                <PopoverItem
                  key={l.id}
                  onClick={() => {
                    addFilter("label", l.id);
                    setProperty(null);
                    close();
                  }}
                >
                  <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
                  {l.name}
                </PopoverItem>
              ))}
            </PopoverList>
          );
        }
        if (property === "project") {
          return (
            <PopoverList>
              <PopoverItem
                onClick={() => {
                  addFilter("project", "none");
                  setProperty(null);
                  close();
                }}
              >
                <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-border-strong" />
                No project
              </PopoverItem>
              {projects.map((p) => (
                <PopoverItem
                  key={p.id}
                  onClick={() => {
                    addFilter("project", p.id);
                    setProperty(null);
                    close();
                  }}
                >
                  <span className="h-3 w-3 rounded-sm" style={{ background: p.icon_color }} />
                  {p.name}
                </PopoverItem>
              ))}
            </PopoverList>
          );
        }
        return null;
      }}
    </Popover>
  );
}

function labelForProperty(p: string) {
  return { priority: "Priority", state: "Status", assignee: "Assignee", label: "Label", project: "Project" }[p] ?? p;
}
