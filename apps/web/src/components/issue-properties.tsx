"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Calendar, Folders, Target } from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon } from "@/components/icons";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { ProjectIconBlock } from "@/components/project-icons";
import {
  listCycles,
  listMembers,
  listProjects,
  listTeamLabels,
  listTeamStates,
  patchIssue,
  type Cycle,
  type IssueDetail,
  type Label,
  type Member,
  type Project,
  type WorkflowState,
} from "@/lib/api";

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;
const PRIORITIES = [0, 1, 2, 3, 4] as const;

const ESTIMATE_SCALES = {
  fibonacci: [{ v: 1, l: "1" }, { v: 2, l: "2" }, { v: 3, l: "3" }, { v: 5, l: "5" }, { v: 8, l: "8" }],
  linear: [{ v: 1, l: "1" }, { v: 2, l: "2" }, { v: 3, l: "3" }, { v: 4, l: "4" }, { v: 5, l: "5" }],
  exponential: [{ v: 1, l: "1" }, { v: 2, l: "2" }, { v: 4, l: "4" }, { v: 8, l: "8" }, { v: 16, l: "16" }],
  tshirt: [{ v: 1, l: "XS" }, { v: 2, l: "S" }, { v: 3, l: "M" }, { v: 5, l: "L" }, { v: 8, l: "XL" }],
  none: [] as { v: number; l: string }[],
} as const;

export function IssueProperties({ workspaceSlug, issue }: { workspaceSlug: string; issue: IssueDetail }) {
  const router = useRouter();
  const [state, setState] = useState(issue.state);
  const [priority, setPriority] = useState(issue.priority);
  const [assignee, setAssignee] = useState(issue.assignee);
  const [labels, setLabels] = useState(issue.labels);
  const [estimate, setEstimate] = useState<number | null>(issue.estimate);
  const [dueDate, setDueDate] = useState<string | null>(issue.due_date);

  const [project, setProject] = useState<{ id: string; name: string; slug: string; color: string } | null>(
    issue.project_id ? { id: issue.project_id, name: issue.project_name || "Project", slug: issue.project_slug_id || "", color: "#5e6ad2" } : null
  );

  const [states, setStates] = useState<WorkflowState[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(issue.cycle_id);

  useEffect(() => {
    listTeamStates(workspaceSlug, issue.team.key).then(setStates);
    listMembers(workspaceSlug).then(setMembers);
    listTeamLabels(workspaceSlug, issue.team.key).then(setAllLabels);
    listProjects(workspaceSlug).then(setAllProjects);
    if (issue.team.cycles_enabled) {
      listCycles(workspaceSlug, issue.team.key).then(setCycles).catch(() => {});
    }
  }, [workspaceSlug, issue.team.key, issue.team.cycles_enabled]);

  const currentCycle = cycles.find((c) => c.id === cycleId) || null;

  async function update(patch: Parameters<typeof patchIssue>[2]) {
    await patchIssue(workspaceSlug, issue.identifier, patch);
    router.refresh();
  }

  // Direct priority shortcuts (0-4) + open-picker shortcuts (S/A/L/P/E).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.matches("input, textarea, [contenteditable=true]");
      if (typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-4]$/.test(e.key)) {
        e.preventDefault();
        const p = Number(e.key) as 0 | 1 | 2 | 3 | 4;
        setPriority(p);
        update({ priority: p });
        return;
      }
      const propMap: Record<string, string> = {
        s: "status",
        a: "assignee",
        l: "labels",
        p: "priority",
        e: "estimate",
      };
      const prop = propMap[e.key.toLowerCase()];
      if (!prop) return;
      const btn = document.querySelector<HTMLButtonElement>(`[data-issue-prop="${prop}"] button`);
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.identifier]);

  function toggleLabel(label: Label) {
    const has = labels.some((l) => l.id === label.id);
    const next = has ? labels.filter((l) => l.id !== label.id) : [...labels, label];
    setLabels(next);
    update({ label_ids: next.map((l) => l.id) });
  }

  return (
    <>
      <Section title="Properties">
        <Row label="Status">
          <Popover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover">
                <StatusIcon group={state.group} />
                <span>{state.name}</span>
              </button>
            )}
            width={200}
          >
            {({ close }) => (
              <PopoverList>
                {states.map((s) => (
                  <PopoverItem
                    key={s.id}
                    active={s.id === state.id}
                    onClick={async () => {
                      setState(s);
                      close();
                      await update({ state_id: s.id });
                    }}
                  >
                    <StatusIcon group={s.group} />
                    {s.name}
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>
        </Row>

        <Row label="Priority">
          <Popover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover">
                <PriorityIcon value={priority} />
                <span>{PRIORITY_LABELS[priority]}</span>
              </button>
            )}
            width={180}
          >
            {({ close }) => (
              <PopoverList>
                {PRIORITIES.map((p) => (
                  <PopoverItem
                    key={p}
                    active={p === priority}
                    onClick={async () => {
                      setPriority(p);
                      close();
                      await update({ priority: p });
                    }}
                  >
                    <PriorityIcon value={p} />
                    {PRIORITY_LABELS[p]}
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>
        </Row>

        <Row label="Assignee">
          <Popover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover">
                {assignee ? (
                  <>
                    <Avatar initials={assignee.initials} color={assignee.color} size={18} />
                    <span>{assignee.name}</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
                    <span className="text-text-tertiary">Unassigned</span>
                  </>
                )}
              </button>
            )}
            width={220}
          >
            {({ close }) => (
              <PopoverList>
                <PopoverItem
                  active={!assignee}
                  onClick={async () => {
                    setAssignee(null);
                    close();
                    await update({ assignee_id: null });
                  }}
                >
                  <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
                  <span className="text-text-tertiary">Unassigned</span>
                </PopoverItem>
                {members.map((m) => (
                  <PopoverItem
                    key={m.id}
                    active={assignee?.id === m.id}
                    onClick={async () => {
                      setAssignee(m);
                      close();
                      await update({ assignee_id: m.id });
                    }}
                  >
                    <Avatar initials={m.initials} color={m.color} size={18} />
                    {m.name}
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>
        </Row>

        {(() => {
          const scaleKey = (issue.team.estimate_scale ?? "fibonacci") as keyof typeof ESTIMATE_SCALES;
          const scale = ESTIMATE_SCALES[scaleKey] ?? ESTIMATE_SCALES.fibonacci;
          if (scale.length === 0) return null;
          const currentLabel = scale.find((e) => e.v === estimate)?.l;
          return (
            <Row label="Estimate">
              <Popover
                trigger={({ toggle }) => (
                  <button onClick={toggle} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover">
                    <BarChart3 size={12} className="text-text-tertiary" />
                    <span>{currentLabel ?? <span className="text-text-tertiary">No estimate</span>}</span>
                  </button>
                )}
                width={160}
              >
                {({ close }) => (
                  <PopoverList>
                    <PopoverItem
                      active={estimate === null}
                      onClick={async () => {
                        setEstimate(null);
                        close();
                        await update({ clear_estimate: true });
                      }}
                    >
                      <span className="text-text-tertiary">No estimate</span>
                    </PopoverItem>
                    {scale.map((e) => (
                      <PopoverItem
                        key={e.v}
                        active={estimate === e.v}
                        onClick={async () => {
                          setEstimate(e.v);
                          close();
                          await update({ estimate: e.v });
                        }}
                      >
                        <BarChart3 size={12} className="text-text-tertiary" />
                        {e.l}
                      </PopoverItem>
                    ))}
                  </PopoverList>
                )}
              </Popover>
            </Row>
          );
        })()}

        <Row label="Due date">
          <DueDatePicker
            value={dueDate}
            onChange={async (val) => {
              setDueDate(val);
              if (val === null) {
                await update({ clear_due_date: true });
              } else {
                await update({ due_date: val });
              }
            }}
          />
        </Row>
      </Section>

      <Section title="Project">
        <Popover
          trigger={({ toggle }) => (
            <button onClick={toggle} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover">
              {project ? (
                <>
                  <ProjectIconBlock color={project.color} size={12} />
                  <span>{project.name}</span>
                </>
              ) : (
                <>
                  <Folders size={12} className="text-text-tertiary" />
                  <span className="text-text-tertiary">Add to project</span>
                </>
              )}
            </button>
          )}
          width={240}
        >
          {({ close }) => (
            <PopoverList>
              <PopoverItem
                active={!project}
                onClick={async () => {
                  setProject(null);
                  close();
                  await update({ clear_project: true });
                }}
              >
                <Folders size={12} className="text-text-tertiary" />
                <span className="text-text-tertiary">No project</span>
              </PopoverItem>
              {allProjects.map((p) => (
                <PopoverItem
                  key={p.id}
                  active={project?.id === p.id}
                  onClick={async () => {
                    setProject({ id: p.id, name: p.name, slug: p.slug_id, color: p.icon_color });
                    close();
                    await update({ project_id: p.id });
                  }}
                >
                  <ProjectIconBlock color={p.icon_color} size={12} />
                  {p.name}
                </PopoverItem>
              ))}
            </PopoverList>
          )}
        </Popover>
      </Section>

      {issue.team.cycles_enabled && (
        <Section title="Cycle">
          <Popover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover">
                <Target size={12} className="text-text-tertiary" />
                {currentCycle ? (
                  <span>
                    {currentCycle.name}
                    <span className="ml-1.5 text-mini text-text-tertiary">
                      ({currentCycle.status})
                    </span>
                  </span>
                ) : (
                  <span className="text-text-tertiary">Add to cycle</span>
                )}
              </button>
            )}
            width={240}
          >
            {({ close }) => (
              <PopoverList>
                <PopoverItem
                  active={!cycleId}
                  onClick={async () => {
                    setCycleId(null);
                    close();
                    await update({ clear_cycle: true });
                  }}
                >
                  <Target size={12} className="text-text-tertiary" />
                  <span className="text-text-tertiary">No cycle</span>
                </PopoverItem>
                {cycles
                  .filter((c) => c.status !== "completed")
                  .map((c) => (
                    <PopoverItem
                      key={c.id}
                      active={cycleId === c.id}
                      onClick={async () => {
                        setCycleId(c.id);
                        close();
                        await update({ cycle_id: c.id });
                      }}
                    >
                      <Target size={12} className="text-text-tertiary" />
                      <span>{c.name}</span>
                      <span className="ml-auto text-mini text-text-tertiary">{c.status}</span>
                    </PopoverItem>
                  ))}
              </PopoverList>
            )}
          </Popover>
        </Section>
      )}

      <Section title="Labels">
        <Popover
          trigger={({ toggle }) => (
            <button onClick={toggle} className="block w-full rounded-md text-left hover:bg-row-hover">
              {labels.length === 0 ? (
                <span className="px-1 py-0.5 text-text-tertiary">Add labels…</span>
              ) : (
                <div className="flex flex-wrap gap-1.5 px-1 py-0.5">
                  {labels.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1.5 rounded-pill bg-tag px-2 py-0.5 text-mini text-text-secondary"
                    >
                      <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
                      {l.name}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )}
          width={220}
        >
          {() => (
            <PopoverList>
              {allLabels.length === 0 && (
                <li className="px-2.5 py-2 text-mini text-text-tertiary">No labels available</li>
              )}
              {allLabels.map((l) => {
                const active = labels.some((x) => x.id === l.id);
                return (
                  <PopoverItem key={l.id} active={active} onClick={() => toggleLabel(l)}>
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                      {active ? <span className="inline-block h-2 w-2 rounded-pill bg-accent" /> : null}
                    </span>
                    <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
                    {l.name}
                  </PopoverItem>
                );
              })}
            </PopoverList>
          )}
        </Popover>
      </Section>
    </>
  );
}

function DueDatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const display = value
    ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-row-hover"
      >
        <Calendar size={12} className="text-text-tertiary" />
        <span>{display ?? <span className="text-text-tertiary">No date</span>}</span>
      </button>
      {open && (
        <span className="absolute left-0 top-full z-40 mt-1 flex items-center gap-1 rounded-md border border-border-default bg-elevated p-2 shadow-popover">
          <input
            type="date"
            defaultValue={value ? value.slice(0, 10) : ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v ? new Date(v + "T00:00:00Z").toISOString() : null);
              setOpen(false);
            }}
            className="bg-input text-small text-text-primary outline-none"
          />
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover"
          >
            Clear
          </button>
        </span>
      )}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex w-full items-center justify-between text-mini text-text-tertiary">
        <span>{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const prop = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex items-center text-small" data-issue-prop={prop}>
      <span className="w-16 shrink-0 text-text-tertiary">{label}</span>
      <span className="flex items-center text-text-secondary">{children}</span>
    </div>
  );
}
