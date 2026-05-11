"use client";

import Link from "next/link";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import type { Issue, StateGroup } from "@/lib/api";

export function BoardView({
  groups,
  workspaceSlug,
}: {
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  workspaceSlug: string;
}) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3">
      {groups.map((g) => (
        <BoardColumn key={g.name} title={g.name} group={g.group} issues={g.issues} workspaceSlug={workspaceSlug} />
      ))}
    </div>
  );
}

function BoardColumn({
  title,
  group,
  issues,
  workspaceSlug,
}: {
  title: string;
  group: StateGroup;
  issues: Issue[];
  workspaceSlug: string;
}) {
  return (
    <section className="flex h-full w-[320px] shrink-0 flex-col rounded-md border border-border-subtle bg-elevated">
      <header className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border-subtle px-3 text-small">
        <StatusIcon group={group} />
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-text-tertiary">{issues.length}</span>
        <button className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" aria-label="Add issue">
          <Plus size={13} />
        </button>
      </header>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {issues.map((issue) => (
          <BoardCard key={issue.identifier} issue={issue} workspaceSlug={workspaceSlug} />
        ))}
        {issues.length === 0 && (
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
      className="block rounded-md border border-border-subtle bg-app px-2.5 py-2 text-small transition hover:border-border-strong"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-mini text-text-tertiary">
        <PriorityIcon value={issue.priority} />
        <span className="font-mono">{issue.identifier}</span>
        {issue.child_count > 0 && (
          <span className="flex items-center gap-0.5">
            <SubIssueProgress done={issue.child_done_count} total={issue.child_count} />
            <span>
              {issue.child_done_count}/{issue.child_count}
            </span>
          </span>
        )}
      </div>
      <p className={clsx("line-clamp-2 text-small leading-snug", dim ? "text-text-tertiary line-through" : "text-text-primary")}>
        {issue.title}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {issue.labels.slice(0, 2).map((l) => (
          <span key={l.id} className="inline-flex items-center gap-1 rounded-pill bg-tag px-1.5 py-0.5 text-micro text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-pill" style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
        <span className="ml-auto">
          {issue.assignee ? (
            <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={16} />
          ) : (
            <span className="inline-block h-4 w-4 rounded-pill border border-dashed border-border-strong" />
          )}
        </span>
      </div>
    </Link>
  );
}
