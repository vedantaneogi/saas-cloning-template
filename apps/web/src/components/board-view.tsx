"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { CheckSquare, EyeOff, MoreHorizontal, Plus } from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { Popover } from "@/components/popover";
import { useSelection } from "@/components/selection-context";
import { createIssue, patchIssue, type Issue, type StateGroup } from "@/lib/api";

export function BoardView({
  groups,
  workspaceSlug,
  teamKey,
  onHideColumn,
}: {
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  workspaceSlug: string;
  teamKey?: string;
  /**
   * Called when the user picks "Hide column" from a column's 3-dot menu.
   * If undefined the action is omitted from the menu (older call sites
   * that don't track hidden columns).
   */
  onHideColumn?: (group: StateGroup) => void;
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

  // No-team boards (e.g. /my issues) can't create directly; bounce the
  // user into the global create-issue modal, which lets them pick a
  // team. We hook into the sidebar's existing event so we don't have to
  // duplicate modal plumbing here.
  function openCreate() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("create-issue:open"));
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
          onOpenCreate={openCreate}
          onHideColumn={onHideColumn}
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
  onOpenCreate,
  onHideColumn,
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
  onOpenCreate: () => void;
  onHideColumn?: (group: StateGroup) => void;
}) {
  const router = useRouter();
  const sel = useSelection();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [over, setOver] = useState(false);

  async function submit() {
    if (!teamKey || !draft.trim()) return;
    await createIssue(workspaceSlug, teamKey, { title: draft.trim(), state_id: stateId });
    setDraft("");
    router.refresh();
  }

  function handleAddClick() {
    if (teamKey) setAdding(true);
    else onOpenCreate();
  }

  function selectAllInColumn(close: () => void) {
    if (!sel) {
      close();
      return;
    }
    for (const i of issues) sel.toggle(i.identifier);
    close();
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
        // Frosted-glass column: translucent fill + heavy blur + hairline
        // white outline, matching Linear's board screenshot. The base
        // sits over the page so the gradient bleeds through.
        "flex h-full w-[320px] shrink-0 flex-col rounded-xl border bg-white/[0.025] backdrop-blur-md transition-colors",
        over
          ? "border-accent ring-1 ring-accent/40"
          : isDragging
            ? "border-white/15"
            : "border-white/10",
      )}
    >
      <header className="flex h-[40px] shrink-0 items-center gap-2 px-3 text-small">
        <StatusIcon group={group} />
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-text-tertiary">{issues.length}</span>
        <span className="ml-auto flex items-center gap-0.5">
          <Popover
            align="end"
            width={200}
            surface="glass"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={`Column actions for ${title}`}
                title="Column actions"
                className={clsx(
                  "rounded-md p-1 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-secondary",
                  open && "bg-white/10 text-text-secondary",
                )}
              >
                <MoreHorizontal size={13} />
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => selectAllInColumn(close)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                >
                  <CheckSquare size={13} className="text-text-tertiary" />
                  <span>Select all in column</span>
                </button>
                {onHideColumn && (
                  <button
                    type="button"
                    onClick={() => { onHideColumn(group); close(); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                  >
                    <EyeOff size={13} className="text-text-tertiary" />
                    <span>Hide column</span>
                  </button>
                )}
              </div>
            )}
          </Popover>
          <button
            onClick={handleAddClick}
            className="rounded-md p-1 text-text-tertiary hover:bg-white/10 hover:text-text-secondary"
            aria-label="Add issue"
          >
            <Plus size={13} />
          </button>
        </span>
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
        // Card surface: brighter translucent overlay against the column
        // so cards visibly float above the column glass. Hairline
        // border tightens the edge without a hard outline.
        "block cursor-grab rounded-lg border border-white/10 bg-white/[0.04] p-3 text-small shadow-sm transition-colors hover:bg-white/[0.07] hover:border-white/15 active:cursor-grabbing",
        dim && "opacity-60",
        dragging && "opacity-40",
      )}
    >
      <header className="flex items-center gap-1.5 text-mini text-text-tertiary">
        <span className="font-mono">{issue.identifier}</span>
        {issue.assignee && (
          <span className="ml-auto">
            <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={16} />
          </span>
        )}
      </header>
      <div className="mt-1.5 flex items-start gap-1.5">
        <PriorityIcon value={issue.priority} />
        <p className="line-clamp-3 flex-1 text-text-primary">{issue.title}</p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-mini text-text-tertiary">
        {issue.child_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <SubIssueProgress done={issue.child_done_count} total={issue.child_count} />
            <span>{issue.child_done_count}/{issue.child_count}</span>
          </span>
        )}
        {issue.created_at && (
          <span className="ml-auto">Created {new Date(issue.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        )}
      </div>
    </Link>
  );
}
