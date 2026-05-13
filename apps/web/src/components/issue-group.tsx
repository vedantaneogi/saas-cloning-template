"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import clsx from "clsx";
import { IssueRow } from "@/components/issue-row";
import { StatusIcon } from "@/components/icons";
import { createIssue, type Issue } from "@/lib/api";

export function IssueGroup({
  title,
  group,
  count,
  issues,
  workspaceSlug,
  teamKey,
  stateId,
  stateName,
}: {
  title: string;
  group: string;
  count: number;
  issues: Issue[];
  workspaceSlug: string;
  teamKey?: string;
  stateId?: string;
  stateName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const completed = group === "completed" || group === "canceled";

  async function submit() {
    if (!teamKey || !draft.trim()) return;
    try {
      await createIssue(workspaceSlug, teamKey, {
        title: draft.trim(),
        state_id: stateId,
        state_name: stateId ? undefined : stateName,
      });
      setDraft("");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section className="border-b border-border-subtle last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex h-[36px] w-full items-center gap-2 bg-elevated px-3 text-small text-text-secondary hover:bg-elevated-hover"
      >
        <ChevronDown size={12} className={clsx("text-text-tertiary transition-transform", !open && "-rotate-90")} />
        <StatusIcon group={group} />
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-text-tertiary">{count}</span>
        {teamKey && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setAdding(true);
                setOpen(true);
              }
            }}
            className="ml-auto rounded-md p-1 text-text-tertiary opacity-0 hover:bg-row-hover hover:text-text-primary group-hover:opacity-100"
            title="Quick add"
          >
            <Plus size={14} />
          </span>
        )}
      </button>
      {open && (
        <div>
          {adding && teamKey && (
            <div className="flex h-[36px] items-center gap-2 border-b border-border-subtle bg-app px-3 text-small">
              <StatusIcon group={group} />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") { setAdding(false); setDraft(""); }
                }}
                onBlur={() => { if (!draft.trim()) setAdding(false); }}
                placeholder={`New ${title.toLowerCase()} issue…  (⏎ to add, Esc to cancel)`}
                className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>
          )}
          {issues.map((issue) => (
            <IssueRow key={issue.identifier} issue={issue} workspaceSlug={workspaceSlug} dim={completed} />
          ))}
        </div>
      )}
    </section>
  );
}
