"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { createIssue, type Issue, type StateGroup } from "@/lib/api";

export function BoardView({
  groups,
  workspaceSlug,
  teamKey,
}: {
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  workspaceSlug: string;
  teamKey?: string;
}) {
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
}: {
  title: string;
  group: StateGroup;
  issues: Issue[];
  workspaceSlug: string;
  teamKey?: string;
  stateId?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  async function submit() {
    if (!teamKey || !draft.trim()) return;
    await createIssue(workspaceSlug, teamKey, { title: draft.trim(), state_id: stateId });
    setDraft("");
    router.refresh();
  }

  return (
    <section className="flex h-full w-[320px] shrink-0 flex-col rounded-md border border-border-subtle bg-elevated">
      <header className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border-subtle px-3 text-small">
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
          <BoardCard key={issue.identifier} issue={issue} workspaceSlug={workspaceSlug} />
        ))}
        {issues.length === 0 && !adding && (
          <div className="rounded-md border border-dashed border-border-subtle py-6 text-center text-mini text-text-tertiary">
            No issues
          </div>
        )}
      </div>
    </section>
  );
}

function BoardCard({ issue, workspaceSlug }: { issue: Issue; workspaceSlug: string }) {
  const dim = issue.state.group === "completed" || issue.state.group === "canceled";
  return (
    <Link
      href={`/${workspaceSlug}/issue/${issue.identifier}`}
      className={clsx(
        "block rounded-md border border-border-subtle bg-app p-2 text-small hover:border-border-strong",
        dim && "opacity-60"
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
