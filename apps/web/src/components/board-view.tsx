"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { createIssue, patchIssue, type Issue, type StateGroup } from "@/lib/api";

export function BoardView({
  groups,
  workspaceSlug,
  teamKey,
}: {
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  workspaceSlug: string;
  teamKey?: string;
}) {
  const router = useRouter();
  // Track the issue currently being dragged so columns can highlight when they're a valid drop target.
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function moveIssue(identifier: string, toStateId: string) {
    try {
      await patchIssue(workspaceSlug, identifier, { state_id: toStateId });
      router.refresh();
    } catch (e) {
      console.error("move failed", e);
    }
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3">
      {groups.map((g) => (
        <BoardColumn
          key={g.name}
          title={g.name}
          group={g.group}
          issues={g.issues}
          workspaceSlug={workspaceSlug}
          teamKey={teamKey}
          stateId={g.issues[0]?.state.id}
          isDragging={draggedId !== null}
          onDragStart={setDraggedId}
          onDragEnd={() => setDraggedId(null)}
          onDrop={moveIssue}
        />
      ))}
    </div>
  );
}

function BoardColumn({
  title,
  group,
  issues,
  workspaceSlug,
  teamKey,
  stateId,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  title: string;
  group: StateGroup;
  issues: Issue[];
  workspaceSlug: string;
  teamKey?: string;
  stateId?: string;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (identifier: string, toStateId: string) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [over, setOver] = useState(false);

  async function submit() {
    if (!teamKey || !draft.trim()) return;
    await createIssue(workspaceSlug, teamKey, { title: draft.trim(), state_id: stateId });
    setDraft("");
    router.refresh();
  }

  function handleDragOver(e: React.DragEvent) {
    if (!stateId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!over) setOver(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    if (!stateId) return;
    const identifier = e.dataTransfer.getData("text/issue-identifier");
    const fromStateId = e.dataTransfer.getData("text/from-state");
    if (!identifier || fromStateId === stateId) return;
    onDrop(identifier, stateId);
  }

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={clsx(
        "flex h-full w-[320px] shrink-0 flex-col rounded-md border bg-elevated transition-colors",
        over
          ? "border-accent ring-1 ring-accent/40"
          : isDragging
            ? "border-border-default"
            : "border-border-subtle",
      )}
    >
      <header className="flex h-[36px] shrink-0 items-center gap-2 border-b border-border-subtle px-3 text-small">
        <StatusIcon group={group} />
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-text-tertiary">{issues.length}</span>
        {teamKey && (
          <button
            onClick={() => setAdding(true)}
            className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            aria-label="Add issue"
          >
            <Plus size={13} />
          </button>
        )}
      </header>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {adding && teamKey && (
          <div className="rounded-md border border-border-subtle bg-app p-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") { setAdding(false); setDraft(""); }
              }}
              onBlur={() => { if (!draft.trim()) setAdding(false); }}
              placeholder={`New ${title.toLowerCase()} issue…`}
              className="w-full bg-transparent text-small text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
        )}
        {issues.map((issue) => (
          <BoardCard
            key={issue.identifier}
            issue={issue}
            workspaceSlug={workspaceSlug}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {issues.length === 0 && !adding && (
          <div className={clsx(
            "rounded-md border border-dashed py-6 text-center text-mini text-text-tertiary transition-colors",
            over ? "border-accent text-accent" : "border-border-subtle",
          )}>
            {over ? "Drop to move" : "No issues"}
          </div>
        )}
      </div>
    </section>
  );
}

function BoardCard({
  issue,
  workspaceSlug,
  onDragStart,
  onDragEnd,
}: {
  issue: Issue;
  workspaceSlug: string;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const dim = issue.state.group === "completed" || issue.state.group === "canceled";
  const [dragging, setDragging] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/issue-identifier", issue.identifier);
    e.dataTransfer.setData("text/from-state", issue.state.id);
    setDragging(true);
    onDragStart(issue.identifier);
  }
  function handleDragEnd() {
    setDragging(false);
    onDragEnd();
  }

  return (
    <Link
      href={`/${workspaceSlug}/issue/${issue.identifier}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={clsx(
        "block cursor-grab rounded-md border border-border-subtle bg-app p-2 text-small hover:border-border-strong active:cursor-grabbing",
        dim && "opacity-60",
        dragging && "opacity-40",
      )}
    >
      <header className="flex items-center gap-1.5 text-mini text-text-tertiary">
        <PriorityIcon value={issue.priority} />
        <span className="font-mono">{issue.identifier}</span>
        {issue.assignee && (
          <span className="ml-auto">
            <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={16} />
          </span>
        )}
      </header>
      <p className="mt-1.5 line-clamp-3 text-text-primary">{issue.title}</p>
      {issue.child_count > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-mini text-text-tertiary">
          <SubIssueProgress done={issue.child_done_count} total={issue.child_count} />
          <span>{issue.child_done_count}/{issue.child_count}</span>
        </div>
      )}
    </Link>
  );
}
