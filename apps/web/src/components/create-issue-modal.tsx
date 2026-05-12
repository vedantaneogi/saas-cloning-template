"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronRight,
  Calendar,
  BarChart3,
  Tag,
  Paperclip,
  FileText,
  Maximize2,
  Minimize2,
  Box,
  CircleDashed,
  CircleDot,
  MoreHorizontal,
} from "lucide-react";
import {
  createIssue,
  listCycles,
  listMembers,
  listProjects,
  listTeamLabels,
  listTemplates,
  type Cycle,
  type IssueTemplateBody,
  type Label,
  type Member,
  type Project,
  type Team,
  type Template,
} from "@/lib/api";
import { StatusIcon, PriorityIcon, Avatar } from "@/components/icons";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;
const PRIORITIES = [0, 1, 2, 3, 4] as const;
const STATES = [
  { name: "Backlog", group: "backlog" },
  { name: "Todo", group: "unstarted" },
  { name: "In Progress", group: "started" },
  { name: "In Review", group: "started" },
  { name: "Done", group: "completed" },
  { name: "Canceled", group: "canceled" },
] as const;

export function CreateIssueModal({ workspaceSlug, teams }: { workspaceSlug: string; teams: Team[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [stateName, setStateName] = useState("Backlog");
  const [teamKey, setTeamKey] = useState<string>(teams[0]?.key ?? "");
  const [assignee, setAssignee] = useState<Member | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [dueDate, setDueDate] = useState<string>(""); // yyyy-mm-dd
  const [estimate, setEstimate] = useState<number | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);

  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [teamLabels, setTeamLabels] = useState<Label[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [createMore, setCreateMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    listMembers(workspaceSlug).then(setMembers).catch(() => {});
    listProjects(workspaceSlug).then(setProjects).catch(() => setProjects([]));
    if (teamKey) {
      listTeamLabels(workspaceSlug, teamKey).then(setTeamLabels).catch(() => setTeamLabels([]));
      listCycles(workspaceSlug, teamKey).then(setCycles).catch(() => setCycles([]));
      listTemplates(workspaceSlug, { kind: "issue", teamKey }).then(setTemplates).catch(() => setTemplates([]));
    }
  }, [open, workspaceSlug, teamKey]);

  function applyTemplate(t: Template) {
    const body = t.body as IssueTemplateBody;
    if (body.title && !title.trim()) setTitle(body.title);
    if (body.description) setDescription(body.description);
    if (typeof body.priority === "number") setPriority(body.priority);
    if (Array.isArray(body.label_ids) && body.label_ids.length) {
      const matched = teamLabels.filter((l) => body.label_ids!.includes(l.id));
      setLabels(matched);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target?.matches?.("input, textarea, [contenteditable=true]") ?? false;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("create-issue:open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("create-issue:open", onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const ta = descRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(60, ta.scrollHeight) + "px";
  }, [description, open, expanded]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createIssue(workspaceSlug, teamKey, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        state_name: stateName,
        assignee_id: assignee?.id,
        label_ids: labels.map((l) => l.id),
        project_id: project?.id,
        cycle_id: cycle?.id,
        due_date: dueDate || undefined,
        estimate: estimate ?? undefined,
      });
      reset();
      if (!createMore) {
        setOpen(false);
        router.push(`/${workspaceSlug}/issue/${created.identifier}`);
      } else {
        titleRef.current?.focus();
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setTitle("");
    setDescription("");
    setPriority(0);
    setAssignee(null);
    setProject(null);
    setCycle(null);
    setDueDate("");
    setEstimate(null);
    setLabels([]);
    setStateName("Backlog");
  }

  if (!open) return null;

  const stateGroup = STATES.find((s) => s.name === stateName)?.group ?? "backlog";
  const teamObj = teams.find((t) => t.key === teamKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 transition-opacity"
      style={{ paddingTop: expanded ? "4vh" : "12vh" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        className="flex flex-col overflow-hidden rounded-xl bg-elevated text-text-primary shadow-popover transition-[width,height] duration-300 ease-out"
        style={
          expanded
            ? { width: "min(1100px, 94vw)", height: "88vh" }
            : { width: "min(720px, 92vw)", height: "min(560px, 78vh)" }
        }
      >
        {/* header */}
        <header className="flex items-center gap-1.5 px-3.5 pt-3 pb-1.5">
          <Popover
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-1.5 rounded-md bg-pill px-1.5 py-0.5 text-mini text-text-secondary hover:bg-elevated-hover"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: teamObj?.icon_color ?? "#5e6ad2" }} />
                <span className="font-medium">{teamObj?.key ?? teamKey}</span>
              </button>
            )}
            width={220}
          >
            {({ close }) => (
              <PopoverList>
                {teams.map((t) => (
                  <PopoverItem
                    key={t.key}
                    active={t.key === teamKey}
                    onClick={() => {
                      setTeamKey(t.key);
                      close();
                    }}
                  >
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ background: t.icon_color }} />
                    <span>{t.name}</span>
                    <span className="ml-auto text-text-tertiary">{t.key}</span>
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>
          <ChevronRight size={12} className="text-text-tertiary" />
          <span className="text-small font-medium text-text-primary">New issue</span>

          {templates.length > 0 && (
            <Popover
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="ml-2 flex items-center gap-1 rounded-md bg-pill px-1.5 py-0.5 text-mini text-text-secondary hover:bg-elevated-hover"
                  title="Apply a template"
                >
                  <FileText size={11} />
                  Template
                </button>
              )}
              width={260}
            >
              {({ close }) => (
                <PopoverList>
                  {templates.map((t) => (
                    <PopoverItem
                      key={t.id}
                      onClick={() => {
                        applyTemplate(t);
                        close();
                      }}
                    >
                      <FileText size={11} className="text-text-tertiary" />
                      <span className="truncate">{t.name}</span>
                      {t.team_key && <span className="ml-auto text-text-tertiary">{t.team_key}</span>}
                    </PopoverItem>
                  ))}
                </PopoverList>
              )}
            </Popover>
          )}

          <div className="ml-auto flex items-center gap-1 text-text-tertiary">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md p-1 hover:bg-row-hover hover:text-text-secondary"
              aria-label={expanded ? "Minimize" : "Expand"}
              title={expanded ? "Minimize" : "Expand"}
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-row-hover hover:text-text-secondary"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        {/* scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-2">
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            rows={1}
            className="w-full resize-none bg-transparent text-large font-semibold leading-snug text-text-primary outline-none placeholder:text-text-quaternary"
          />
          <textarea
            ref={descRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description…"
            className="mt-2 w-full resize-none bg-transparent text-default leading-relaxed text-text-secondary outline-none placeholder:text-text-tertiary"
            style={{ minHeight: expanded ? 360 : 60 }}
          />
        </div>

        {/* property chips */}
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2">
          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                <StatusIcon group={stateGroup} />
                <span>{stateName}</span>
              </Chip>
            )}
            width={200}
          >
            {({ close }) => (
              <PopoverList>
                {STATES.map((s) => (
                  <PopoverItem
                    key={s.name}
                    active={s.name === stateName}
                    onClick={() => {
                      setStateName(s.name);
                      close();
                    }}
                  >
                    <StatusIcon group={s.group} />
                    {s.name}
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>

          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                <PriorityIcon value={priority} />
                <span>{priority === 0 ? "Priority" : PRIORITY_LABELS[priority]}</span>
              </Chip>
            )}
            width={200}
          >
            {({ close }) => (
              <PopoverList>
                {PRIORITIES.map((p) => (
                  <PopoverItem
                    key={p}
                    active={p === priority}
                    onClick={() => {
                      setPriority(p);
                      close();
                    }}
                  >
                    <PriorityIcon value={p} />
                    {PRIORITY_LABELS[p]}
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>

          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                {assignee ? (
                  <>
                    <Avatar initials={assignee.initials} color={assignee.color} size={14} />
                    <span>{assignee.name.split(" ")[0]}</span>
                  </>
                ) : (
                  <>
                    <CircleDashed size={12} />
                    <span>Assignee</span>
                  </>
                )}
              </Chip>
            )}
            width={240}
          >
            {({ close }) => (
              <PopoverList>
                <PopoverItem
                  active={!assignee}
                  onClick={() => {
                    setAssignee(null);
                    close();
                  }}
                >
                  <CircleDashed size={14} className="text-text-tertiary" />
                  <span className="text-text-tertiary">Unassigned</span>
                </PopoverItem>
                {members.map((m) => (
                  <PopoverItem
                    key={m.id}
                    active={assignee?.id === m.id}
                    onClick={() => {
                      setAssignee(m);
                      close();
                    }}
                  >
                    <Avatar initials={m.initials} color={m.color} size={18} />
                    {m.name}
                  </PopoverItem>
                ))}
              </PopoverList>
            )}
          </Popover>

          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                <Box size={12} />
                <span>{project ? project.name : "Project"}</span>
              </Chip>
            )}
            width={280}
          >
            {({ close }) => (
              <PopoverList>
                <PopoverItem
                  active={!project}
                  onClick={() => {
                    setProject(null);
                    close();
                  }}
                >
                  <CircleDashed size={14} className="text-text-tertiary" />
                  <span className="text-text-tertiary">No project</span>
                </PopoverItem>
                {projects.length === 0 ? (
                  <li className="px-2.5 py-2 text-mini text-text-tertiary">No projects yet.</li>
                ) : (
                  projects.map((p) => (
                    <PopoverItem
                      key={p.id}
                      active={project?.id === p.id}
                      onClick={() => {
                        setProject(p);
                        close();
                      }}
                    >
                      <span className="h-3 w-3 rounded-sm" style={{ background: p.icon_color }} />
                      <span className="truncate">{p.name}</span>
                    </PopoverItem>
                  ))
                )}
              </PopoverList>
            )}
          </Popover>

          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                {labels.length === 0 ? (
                  <>
                    <Tag size={12} />
                    <span>Labels</span>
                  </>
                ) : (
                  <>
                    <span className="flex -space-x-0.5">
                      {labels.slice(0, 3).map((l) => (
                        <span key={l.id} className="h-2 w-2 rounded-pill ring-1 ring-elevated" style={{ background: l.color }} />
                      ))}
                    </span>
                    <span>{labels.length === 1 ? labels[0].name : `${labels.length} labels`}</span>
                  </>
                )}
              </Chip>
            )}
            width={240}
          >
            {() => (
              <PopoverList>
                {teamLabels.length === 0 && (
                  <li className="px-2.5 py-2 text-mini text-text-tertiary">No labels available</li>
                )}
                {teamLabels.map((l) => {
                  const active = labels.some((x) => x.id === l.id);
                  return (
                    <PopoverItem
                      key={l.id}
                      active={active}
                      onClick={() => {
                        setLabels((cur) =>
                          active ? cur.filter((x) => x.id !== l.id) : [...cur, l]
                        );
                      }}
                    >
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

          {/* Cycle chip — visible only when team has cycles */}
          {cycles.length > 0 && (
            <Popover
              trigger={({ toggle }) => (
                <Chip onClick={toggle}>
                  <CircleDot size={12} />
                  <span>{cycle ? `Cycle ${cycle.number}` : "Cycle"}</span>
                </Chip>
              )}
              width={240}
            >
              {({ close }) => (
                <PopoverList>
                  <PopoverItem
                    active={!cycle}
                    onClick={() => {
                      setCycle(null);
                      close();
                    }}
                  >
                    <CircleDashed size={14} className="text-text-tertiary" />
                    <span className="text-text-tertiary">No cycle</span>
                  </PopoverItem>
                  {cycles.map((c) => (
                    <PopoverItem
                      key={c.id}
                      active={cycle?.id === c.id}
                      onClick={() => {
                        setCycle(c);
                        close();
                      }}
                    >
                      <CircleDot size={12} className="text-text-tertiary" />
                      <span>Cycle {c.number}</span>
                      {c.name && <span className="ml-auto text-text-tertiary">{c.name}</span>}
                    </PopoverItem>
                  ))}
                </PopoverList>
              )}
            </Popover>
          )}

          {/* More menu: due date + estimate + parent */}
          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle} ariaLabel="More properties">
                <MoreHorizontal size={12} />
              </Chip>
            )}
            width={280}
          >
            {() => (
              <div className="space-y-2 p-2">
                <label className="flex items-center gap-2 text-mini">
                  <Calendar size={12} className="text-text-tertiary" />
                  <span className="text-text-tertiary">Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="ml-auto rounded-md bg-app px-2 py-1 text-mini text-text-primary outline-none focus:ring-1 focus:ring-accent"
                  />
                </label>
                <label className="flex items-center gap-2 text-mini">
                  <BarChart3 size={12} className="text-text-tertiary" />
                  <span className="text-text-tertiary">Estimate</span>
                  <input
                    type="number"
                    value={estimate ?? ""}
                    onChange={(e) => setEstimate(e.target.value ? Number(e.target.value) : null)}
                    placeholder="—"
                    min={0}
                    max={99}
                    className="ml-auto w-16 rounded-md bg-app px-2 py-1 text-mini text-text-primary outline-none focus:ring-1 focus:ring-accent"
                  />
                </label>
                <div className="border-t border-border-subtle pt-2 text-mini text-text-quaternary">
                  Set parent issue from the issue detail page after creating.
                </div>
              </div>
            )}
          </Popover>
        </div>

        <footer className="flex items-center justify-between border-t border-border-subtle/0 px-3 py-2 text-mini">
          <button
            type="button"
            className="rounded-md bg-pill p-1.5 text-text-tertiary hover:bg-elevated-hover hover:text-text-secondary"
            aria-label="Attach"
          >
            <Paperclip size={13} />
          </button>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-text-tertiary">
              <span
                role="switch"
                aria-checked={createMore}
                onClick={() => setCreateMore((v) => !v)}
                className={
                  "relative inline-flex h-4 w-7 cursor-pointer items-center rounded-pill transition " +
                  (createMore ? "bg-accent" : "bg-pill")
                }
              >
                <span
                  className={
                    "absolute h-3 w-3 rounded-pill bg-white transition-transform " +
                    (createMore ? "translate-x-3.5" : "translate-x-0.5")
                  }
                />
              </span>
              <span>Create more</span>
            </label>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="rounded-md bg-accent px-3 py-1.5 text-small font-medium text-white shadow-button transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create issue"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Chip({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-md bg-pill px-2 py-1 text-mini text-text-secondary transition hover:bg-elevated-hover disabled:cursor-default disabled:opacity-60 disabled:hover:bg-pill"
    >
      {children}
    </button>
  );
}
