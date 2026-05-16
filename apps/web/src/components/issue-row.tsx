"use client";

import Link from "next/link";
import clsx from "clsx";
import { GripVertical, Check } from "lucide-react";
import type { Issue } from "@/lib/api";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { useSelection } from "@/components/selection-context";
import { relTime } from "@/lib/time";

function shortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface IssueRowDisplay {
  // Optional column-visibility overrides. Unset = render the column.
  // Used by /my issues display options; other call sites leave this
  // undefined to keep the historical layout.
  id?: boolean;
  status?: boolean;
  assignee?: boolean;
  priority?: boolean;
  due_date?: boolean;
  labels?: boolean;
  updated?: boolean;
}

export function IssueRow({
  issue,
  workspaceSlug,
  dim,
  display,
}: {
  issue: Issue;
  workspaceSlug: string;
  dim?: boolean;
  display?: IssueRowDisplay;
}) {
  // Default everything on when no overrides provided.
  const show = {
    id: display?.id ?? true,
    status: display?.status ?? true,
    assignee: display?.assignee ?? true,
    priority: display?.priority ?? true,
    due_date: display?.due_date ?? true,
    labels: display?.labels ?? true,
    updated: display?.updated ?? true,
  };
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
        "group flex h-[38px] items-center gap-2 border-b border-border-subtle pl-3 pr-4 text-small hover:bg-row-hover",
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
      {show.priority && <PriorityIcon value={issue.priority} />}
      {show.id && (
        <span className="w-[68px] shrink-0 font-mono text-mini text-text-tertiary">{issue.identifier}</span>
      )}
      {show.status && <StatusIcon group={issue.state.group} />}
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

      {show.labels && issue.labels.length > 0 && (
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

      {(show.due_date || show.updated) && (
        <span className="w-14 text-right text-mini text-text-tertiary" title={issue.due_date ? `Due ${new Date(issue.due_date).toLocaleString()}` : `Updated ${relTime(issue.updated_at)} ago`}>
          {show.due_date && issue.due_date
            ? shortDate(issue.due_date)
            : show.updated
              ? relTime(issue.updated_at)
              : ""}
        </span>
      )}
      {show.assignee && (
        <span className="ml-1">
          {issue.assignee ? (
            <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={20} />
          ) : (
            <span className="inline-block h-[20px] w-[20px] rounded-pill border border-dashed border-border-strong" />
          )}
        </span>
      )}
    </Link>
  );
}
