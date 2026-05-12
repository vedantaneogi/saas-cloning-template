"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { createIssue, type Issue } from "@/lib/api";

export function SubIssuesPanel({
  workspaceSlug,
  parentIdentifier,
  teamKey,
  subIssues,
}: {
  workspaceSlug: string;
  parentIdentifier: string;
  teamKey: string;
  subIssues: Issue[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const completed = subIssues.filter((s) => s.state.group === "completed").length;

  async function submit() {
    if (!draft.trim()) return;
    await createIssue(workspaceSlug, teamKey, {
      title: draft.trim(),
      parent_identifier: parentIdentifier,
    });
    setDraft("");
    setAdding(false);
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-md border border-border-subtle">
      <header className="flex items-center gap-2 px-3 py-2 text-mini text-text-tertiary">
        <ChevronDown size={12} />
        <span className="font-medium text-text-secondary">Sub-issues</span>
        {subIssues.length > 0 && (
          <span className="flex items-center gap-1">
            <SubIssueProgress done={completed} total={subIssues.length} />
            <span>{completed}/{subIssues.length}</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ml-auto flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={12} /> Add
        </button>
      </header>
      <ul>
        {subIssues.map((s) => (
          <li key={s.identifier}>
            <Link
              href={`/${workspaceSlug}/issue/${s.identifier}`}
              className="flex h-[34px] items-center gap-2 border-t border-border-subtle pl-3 pr-3 text-small hover:bg-row-hover"
            >
              <PriorityIcon value={s.priority} />
              <span className="w-14 shrink-0 font-mono text-mini text-text-tertiary">{s.identifier}</span>
              <StatusIcon group={s.state.group} />
              <span className="flex-1 truncate text-text-primary">{s.title}</span>
              {s.assignee ? (
                <Avatar initials={s.assignee.initials} color={s.assignee.color} size={18} />
              ) : (
                <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
              )}
            </Link>
          </li>
        ))}
        {adding && (
          <li className="flex h-[34px] items-center gap-2 border-t border-border-subtle pl-3 pr-3 text-small">
            <Plus size={12} className="text-text-tertiary" />
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") { setAdding(false); setDraft(""); }
              }}
              onBlur={() => { if (!draft.trim()) setAdding(false); }}
              placeholder="Sub-issue title…  (⏎ to add, Esc to cancel)"
              className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </li>
        )}
      </ul>
    </section>
  );
}
