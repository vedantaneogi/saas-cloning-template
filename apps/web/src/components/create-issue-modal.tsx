"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  BarChart3,
  Folders,
  Tag,
  Paperclip,
  Maximize2,
} from "lucide-react";
import { createIssue, listMembers, listTeamLabels, type Label, type Member, type Team } from "@/lib/api";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [stateName, setStateName] = useState("Todo");
  const [teamKey, setTeamKey] = useState<string>(teams[0]?.key ?? "");
  const [assignee, setAssignee] = useState<Member | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamLabels, setTeamLabels] = useState<Label[]>([]);
  const [createMore, setCreateMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    listMembers(workspaceSlug).then(setMembers);
    listTeamLabels(workspaceSlug, teamKey).then(setTeamLabels);
  }, [open, workspaceSlug, teamKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.matches("input, textarea, [contenteditable=true]");
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
      });
      reset();
      if (!createMore) {
        setOpen(false);
        router.push(`/${workspaceSlug}/issue/${created.identifier}`);
      } else {
        inputRef.current?.focus();
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
    setLabels([]);
    setStateName("Todo");
  }

  if (!open) return null;

  const stateGroup = STATES.find((s) => s.name === stateName)?.group ?? "unstarted";
  const teamObj = teams.find((t) => t.key === teamKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 pt-[14vh]"
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
        className="w-[740px] max-w-[92vw] overflow-hidden rounded-lg border border-border-default bg-elevated text-text-primary shadow-popover"
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
            width={200}
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
          <span className="text-mini text-text-tertiary">New issue</span>
          <div className="ml-auto flex items-center gap-1 text-text-tertiary">
            <button type="button" className="rounded-md p-1 hover:bg-row-hover hover:text-text-secondary" aria-label="Expand">
              <Maximize2 size={12} />
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

        {/* body */}
        <div className="px-4 pb-1 pt-1">
          <textarea
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            rows={1}
            className="w-full resize-none bg-transparent text-large font-semibold leading-snug text-text-primary outline-none placeholder:text-text-quaternary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description…"
            rows={2}
            className="mt-0.5 w-full resize-none bg-transparent text-small text-text-secondary outline-none placeholder:text-text-tertiary"
          />
        </div>

        {/* property chips */}
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-3 pt-1">
          {/* status */}
          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                <StatusIcon group={stateGroup} />
                <span>{stateName}</span>
              </Chip>
            )}
            width={180}
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

          {/* priority */}
          <Popover
            trigger={({ toggle }) => (
              <Chip onClick={toggle}>
                <PriorityIcon value={priority} />
                <span>{PRIORITY_LABELS[priority]}</span>
              </Chip>
            )}
            width={180}
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

          {/* assignee */}
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
                    <span className="inline-block h-3.5 w-3.5 rounded-pill border border-dashed border-border-strong" />
                    <span>Assignee</span>
                  </>
                )}
              </Chip>
            )}
            width={220}
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
                  <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
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

          {/* project placeholder */}
          <Chip disabled>
            <Folders size={12} />
            <span>Project</span>
          </Chip>

          {/* labels */}
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
            width={220}
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

          {/* estimate placeholder */}
          <Chip disabled>
            <BarChart3 size={12} />
            <span>Estimate</span>
          </Chip>

          {/* due date placeholder */}
          <Chip disabled>
            <Calendar size={12} />
            <span>Due date</span>
          </Chip>
        </div>

        <footer className="flex items-center justify-between border-t border-border-subtle px-3 py-2 text-mini">
          <button
            type="button"
            className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
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
                  "relative inline-flex h-3.5 w-6 cursor-pointer items-center rounded-pill transition " +
                  (createMore ? "bg-accent" : "bg-pill")
                }
              >
                <span
                  className={
                    "absolute h-2.5 w-2.5 rounded-pill bg-white transition-transform " +
                    (createMore ? "translate-x-3" : "translate-x-0.5")
                  }
                />
              </span>
              <span>Create more</span>
            </label>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="rounded-md bg-accent px-3 py-1 text-small font-medium text-white shadow-button transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-pill px-2 py-1 text-mini text-text-secondary transition hover:border-border-strong hover:bg-elevated-hover disabled:cursor-default disabled:opacity-60 disabled:hover:bg-pill"
    >
      {children}
    </button>
  );
}
