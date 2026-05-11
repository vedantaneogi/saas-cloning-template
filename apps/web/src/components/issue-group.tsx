"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import clsx from "clsx";
import { IssueRow } from "@/components/issue-row";
import { StatusIcon } from "@/components/icons";
import type { Issue } from "@/lib/api";

export function IssueGroup({
  title,
  group,
  count,
  issues,
  workspaceSlug,
}: {
  title: string;
  group: string;
  count: number;
  issues: Issue[];
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(true);
  const completed = group === "completed" || group === "canceled";
  return (
    <section className="border-b border-border-subtle last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-[34px] w-full items-center gap-2 bg-elevated px-3 text-small text-text-secondary hover:bg-elevated-hover"
      >
        <ChevronDown size={12} className={clsx("text-text-tertiary transition-transform", !open && "-rotate-90")} />
        <StatusIcon group={group} />
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-text-tertiary">{count}</span>
        <span className="ml-auto opacity-0 hover:opacity-100">
          <Plus size={14} className="text-text-tertiary" />
        </span>
      </button>
      {open && (
        <div>
          {issues.map((issue) => (
            <IssueRow key={issue.identifier} issue={issue} workspaceSlug={workspaceSlug} dim={completed} />
          ))}
        </div>
      )}
    </section>
  );
}
