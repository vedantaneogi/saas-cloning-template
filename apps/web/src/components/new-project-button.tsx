"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Calendar,
  ChevronDown,
  CircleDashed,
  GitBranch,
  LogIn,
  Plus,
  Smile,
  Square,
  Tag,
  Users,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverList, PopoverItem } from "@/components/popover";
import { MarkdownEditor } from "@/components/markdown-editor";
import { PriorityIcon } from "@/components/icons";
import {
  createMilestone,
  createProject,
  listTemplates,
  type Member,
  type ProjectState,
  type ProjectTemplateBody,
  type Template,
} from "@/lib/api";

const STATES: { value: ProjectState; label: string }[] = [
  { value: "planned", label: "Backlog" },
  { value: "started", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

const COLOR_SWATCHES = [
  "#5e6ad2", "#4ea7fc", "#26b5ce", "#22c55e", "#d9b34c",
  "#f2994a", "#eb5757", "#bc7cf0", "#95a2b3", "#f2c94c",
];

type Milestone = { id: string; name: string; target_date: string };

export function NewProjectButton({
  workspaceSlug,
  workspaceName,
  workspaceColor,
  members,
}: {
  workspaceSlug: string;
  workspaceName: string;
  workspaceColor: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<ProjectState>("planned");
  const [priority, setPriority] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [leadId, setLeadId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [iconColor, setIconColor] = useState("#5e6ad2");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listTemplates(workspaceSlug, { kind: "project" })
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [open, workspaceSlug]);

  function reset() {
    setName(""); setSummary(""); setDescription("");
    setState("planned"); setPriority(0); setLeadId("");
    setStartDate(""); setTargetDate(""); setIconColor("#5e6ad2");
    setTemplateId(""); setMilestones([]);
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const body = t.body as ProjectTemplateBody;
    if (body.name && !name.trim()) setName(body.name);
    if (body.description && !description.trim()) setDescription(body.description);
    if (body.icon_color) setIconColor(body.icon_color);
    // Preview milestones in the list so the user sees what they're about to get.
    if (body.milestones) {
      const base = targetDate ? new Date(targetDate) : new Date();
      const previews: Milestone[] = body.milestones.map((m, i) => {
        let target = "";
        if (m.target_date_offset_days != null) {
          const d = new Date(base);
          d.setDate(d.getDate() + m.target_date_offset_days);
          target = d.toISOString().slice(0, 10);
        }
        return { id: `tpl-${i}`, name: m.name, target_date: target };
      });
      setMilestones(previews);
    }
  }

  async function submit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const description_payload = [summary.trim(), description.trim()].filter(Boolean).join("\n\n");
      const p = await createProject(workspaceSlug, {
        name: name.trim(),
        description: description_payload || undefined,
        state,
        priority,
        icon_color: iconColor,
        lead_id: leadId || undefined,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
      });
      for (const m of milestones) {
        if (!m.name.trim()) continue;
        try {
          await createMilestone(workspaceSlug, p.slug_id, {
            name: m.name.trim(),
            ...(m.target_date ? { target_date: new Date(m.target_date).toISOString() } : {}),
          });
        } catch (e) {
          console.error("milestone create failed", e);
        }
      }
      setOpen(false);
      reset();
      router.push(`/${workspaceSlug}/project/${p.slug_id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const wsKey = (workspaceName.match(/\b[A-Za-z]/g) ?? []).slice(0, 3).join("").toUpperCase() || workspaceSlug.slice(0, 3).toUpperCase();
  const leadMember = members.find((m) => m.id === leadId);
  const stateMeta = STATES.find((s) => s.value === state);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        aria-label="New project"
        title="New project"
      >
        <Plus size={14} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-lg border border-border-subtle bg-elevated shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Breadcrumb header */}
            <header className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5 text-mini">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-micro font-semibold text-white"
                  style={{ background: workspaceColor }}
                  title={workspaceName}
                >
                  {wsKey.slice(0, 1)}
                </span>
                <span className="text-text-secondary">{wsKey}</span>
                <ChevronDown size={12} className="-rotate-90 text-text-tertiary" />
                <span className="font-medium text-text-primary">New project</span>
              </div>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
              >
                <X size={14} />
              </button>
            </header>

            {/* Main content */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-8 pt-6">
              <Popover
                align="start"
                width={220}
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle hover:bg-row-hover"
                    style={{ color: iconColor }}
                    aria-label="Project icon color"
                  >
                    <Box size={18} strokeWidth={1.75} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="grid grid-cols-5 gap-1.5 p-2">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setIconColor(c); close(); }}
                        className={clsx(
                          "h-6 w-6 rounded-md hover:ring-2 hover:ring-offset-1 hover:ring-offset-elevated",
                          iconColor === c && "ring-2 ring-white/40 ring-offset-1 ring-offset-elevated",
                        )}
                        style={{ background: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                )}
              </Popover>

              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder="Project name"
                className="w-full bg-transparent text-title2 font-semibold text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Add a short summary..."
                className="w-full bg-transparent text-small text-text-secondary outline-none placeholder:text-text-tertiary"
              />

              {/* Chip row */}
              <div className="-mx-1 flex flex-wrap items-center gap-1.5 pt-1 text-mini">
                <Popover
                  align="start"
                  width={180}
                  trigger={({ toggle }) => (
                    <Chip onClick={toggle}>
                      <CircleDashed size={12} className="text-text-tertiary" />
                      <span>{stateMeta?.label ?? "Backlog"}</span>
                    </Chip>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      {STATES.map((s) => (
                        <PopoverItem
                          key={s.value}
                          active={state === s.value}
                          onClick={() => { setState(s.value); close(); }}
                        >
                          <span>{s.label}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  )}
                </Popover>

                <Popover
                  align="start"
                  width={180}
                  trigger={({ toggle }) => (
                    <Chip onClick={toggle}>
                      <PriorityIcon value={priority} />
                      <span>{priority === 0 ? "No priority" : PRIORITY_LABELS[priority]}</span>
                    </Chip>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      {[1, 2, 3, 4, 0].map((p) => (
                        <PopoverItem
                          key={p}
                          active={priority === p}
                          onClick={() => { setPriority(p as 0 | 1 | 2 | 3 | 4); close(); }}
                        >
                          <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />
                          <span>{PRIORITY_LABELS[p]}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  )}
                </Popover>

                <Popover
                  align="start"
                  width={220}
                  trigger={({ toggle }) => (
                    <Chip onClick={toggle}>
                      {leadMember ? (
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center rounded-pill text-micro font-medium text-white"
                          style={{ background: leadMember.color }}
                        >
                          {leadMember.initials}
                        </span>
                      ) : (
                        <Smile size={12} className="text-text-tertiary" />
                      )}
                      <span>{leadMember ? leadMember.name : "Lead"}</span>
                    </Chip>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      {members.map((m) => (
                        <PopoverItem
                          key={m.id}
                          active={leadId === m.id}
                          onClick={() => { setLeadId(m.id); close(); }}
                        >
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-pill text-micro font-medium text-white"
                            style={{ background: m.color }}
                          >
                            {m.initials}
                          </span>
                          <span>{m.name}</span>
                        </PopoverItem>
                      ))}
                      {leadId && (
                        <PopoverItem onClick={() => { setLeadId(""); close(); }}>
                          <X size={12} className="text-text-tertiary" />
                          <span>No lead</span>
                        </PopoverItem>
                      )}
                    </PopoverList>
                  )}
                </Popover>

                <Chip disabled title="Project members — coming soon">
                  <Users size={12} className="text-text-tertiary" />
                  <span>Members</span>
                </Chip>

                <DateChip
                  value={startDate}
                  placeholder="Start"
                  icon={<LogIn size={12} className="text-text-tertiary" />}
                  onChange={setStartDate}
                />

                <DateChip
                  value={targetDate}
                  placeholder="Target"
                  icon={<Square size={12} className="text-text-tertiary" />}
                  onChange={setTargetDate}
                />

                <Chip disabled title="Project labels — coming soon">
                  <Tag size={12} className="text-text-tertiary" />
                  <span>Labels</span>
                </Chip>

                <Chip disabled title="Project dependencies — coming soon">
                  <GitBranch size={12} className="text-text-tertiary" />
                  <span>Dependencies</span>
                </Chip>
              </div>

              <hr className="my-2 border-border-subtle" />

              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write a description, a project brief, or collect ideas..."
                minHeight={180}
              />
            </div>

            {/* Milestones row */}
            <MilestonesBlock
              milestones={milestones}
              onChange={setMilestones}
            />

            {/* Footer */}
            <footer className="flex items-center justify-between border-t border-border-subtle px-4 py-2.5 text-mini">
              {templates.length > 0 ? (
                <Popover
                  align="start"
                  placement="up"
                  width={240}
                  trigger={({ toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                    >
                      {templateId
                        ? <>Template: {templates.find((t) => t.id === templateId)?.name}</>
                        : "Use template"}
                      <ChevronDown size={10} />
                    </button>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      <PopoverItem
                        active={templateId === ""}
                        onClick={() => { setTemplateId(""); setMilestones([]); close(); }}
                      >
                        <span>Blank project</span>
                      </PopoverItem>
                      {templates.map((t) => (
                        <PopoverItem
                          key={t.id}
                          active={templateId === t.id}
                          onClick={() => { applyTemplate(t.id); close(); }}
                        >
                          <span>{t.name}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  )}
                </Popover>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setOpen(false); reset(); }}
                  className="rounded-md border border-border-subtle px-3 py-1 text-text-secondary hover:bg-row-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!name.trim() || submitting}
                  className="rounded-md bg-accent px-3 py-1 text-white shadow-button hover:bg-accent-hover disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create project"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Chip({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-pill border border-border-subtle px-2.5 py-1 text-mini",
        disabled
          ? "cursor-not-allowed text-text-tertiary opacity-70"
          : "text-text-secondary hover:bg-row-hover hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function DateChip({
  value,
  placeholder,
  icon,
  onChange,
}: {
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="inline-flex">
      <button
        type="button"
        onClick={() => ref.current?.showPicker?.() ?? ref.current?.focus()}
        className="inline-flex items-center gap-1.5 rounded-pill border border-border-subtle px-2.5 py-1 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
      >
        {value ? <Calendar size={12} className="text-text-tertiary" /> : icon}
        <span>{value ? fmtDate(value) : placeholder}</span>
      </button>
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute h-0 w-0 opacity-0"
        tabIndex={-1}
      />
    </span>
  );
}

function MilestonesBlock({
  milestones,
  onChange,
}: {
  milestones: Milestone[];
  onChange: (m: Milestone[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  function commit() {
    if (!newName.trim()) return;
    onChange([...milestones, { id: `local-${Date.now()}`, name: newName.trim(), target_date: newDate }]);
    setNewName(""); setNewDate("");
    setAdding(false);
  }

  return (
    <div className="border-t border-border-subtle px-8 py-3">
      <div className="flex items-center justify-between text-mini text-text-tertiary">
        <span className="font-medium">Milestones{milestones.length > 0 && ` · ${milestones.length}`}</span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md p-1 hover:bg-row-hover hover:text-text-secondary"
          aria-label="Add milestone"
          title="Add milestone"
        >
          <Plus size={12} />
        </button>
      </div>
      {(milestones.length > 0 || adding) && (
        <ul className="mt-2 space-y-1">
          {milestones.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-mini hover:bg-row-hover">
              <span className="inline-block h-1.5 w-1.5 rounded-pill bg-text-tertiary" />
              <input
                value={m.name}
                onChange={(e) => {
                  const next = [...milestones];
                  next[i] = { ...m, name: e.target.value };
                  onChange(next);
                }}
                className="flex-1 bg-transparent text-text-primary outline-none"
              />
              <input
                type="date"
                value={m.target_date}
                onChange={(e) => {
                  const next = [...milestones];
                  next[i] = { ...m, target_date: e.target.value };
                  onChange(next);
                }}
                className="rounded-md bg-transparent px-1 py-0.5 text-text-tertiary outline-none hover:bg-elevated-hover"
              />
              <button
                type="button"
                onClick={() => onChange(milestones.filter((x) => x.id !== m.id))}
                className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                aria-label="Remove milestone"
              >
                <X size={11} />
              </button>
            </li>
          ))}
          {adding && (
            <li className="flex items-center gap-2 rounded-md px-1 py-1 text-mini">
              <span className="inline-block h-1.5 w-1.5 rounded-pill bg-text-tertiary" />
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Milestone name"
                className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-md bg-transparent px-1 py-0.5 text-text-tertiary outline-none"
              />
              <button
                type="button"
                onClick={commit}
                className="rounded-md px-2 py-0.5 text-accent hover:bg-row-hover"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setNewName(""); setNewDate(""); }}
                className="rounded-md p-1 text-text-tertiary hover:bg-row-hover"
              >
                <X size={11} />
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
