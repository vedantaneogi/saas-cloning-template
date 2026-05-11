"use client";

import Link from "next/link";
import clsx from "clsx";
import { GripVertical, Check } from "lucide-react";
import type { Issue } from "@/lib/api";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { useSelection } from "@/components/selection-context";

export function IssueRow({
  issue,
  workspaceSlug,
  dim,
}: {
  issue: Issue;
  workspaceSlug: string;
  dim?: boolean;
}) {
  const sel = useSelection();
  const selected = sel?.isSelected(issue.identifier) ?? false;
  const anySelected = (sel?.count ?? 0) > 0;

  function handleCheckboxClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    sel?.toggle(issue.identifier, { shiftKey: e.shiftKey });
  }

  return (
    <Link
      href={`/${workspaceSlug}/issue/${issue.identifier}`}
      className={clsx(
        "group flex h-[34px] items-center gap-2 border-b border-border-subtle pl-2 pr-4 text-small hover:bg-row-hover",
        selected && "bg-row-selected"
      )}
    >
      {sel ? (
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={selected ? "Deselect" : "Select"}
          className={clsx(
            "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-sm border transition-opacity",
            selected
              ? "border-accent bg-accent opacity-100 text-white"
              : anySelected
                ? "border-border-strong opacity-100 hover:border-text-tertiary"
                : "border-border-strong opacity-0 group-hover:opacity-100 hover:border-text-tertiary"
          )}
        >
          {selected && <Check size={10} strokeWidth={3} />}
        </button>
      ) : (
        <span className="text-text-quaternary opacity-0 group-hover:opacity-100">
          <GripVertical size={12} />
        </span>
      )}
      <PriorityIcon value={issue.priority} />
      <span className="w-14 shrink-0 font-mono text-mini text-text-tertiary">{issue.identifier}</span>
      <StatusIcon group={issue.state.group} />
      <span className={clsx("flex-1 truncate text-text-primary", dim && "text-text-tertiary line-through")}>
        {issue.title}
      </span>

      {issue.child_count > 0 && (
        <span className="flex items-center gap-1 text-mini text-text-tertiary">
          <SubIssueProgress done={issue.child_done_count} total={issue.child_count} />
          <span>
            {issue.child_done_count}/{issue.child_count}
          </span>
        </span>
      )}

      {issue.labels.length > 0 && (
        <span className="flex items-center gap-1.5">
          {issue.labels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1.5 rounded-pill bg-tag px-2 py-0.5 text-mini text-text-secondary"
            >
              <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
        </span>
      )}

      <span className="w-12 text-right text-mini text-text-tertiary">May 11</span>
      <span className="ml-1">
        {issue.assignee ? (
          <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={18} />
        ) : (
          <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
        )}
      </span>
    </Link>
  );
}
