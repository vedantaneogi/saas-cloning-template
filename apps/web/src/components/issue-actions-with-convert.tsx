"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { IssueActions } from "@/components/issue-actions";
import { patchIssue, workspaceSearch, type Team, type SearchIssue } from "@/lib/api";

export function IssueActionsWithConvert({
  workspaceSlug,
  identifier,
  isArchived,
  currentTeamKey,
  teams,
  parentIdentifier,
}: {
  workspaceSlug: string;
  identifier: string;
  isArchived: boolean;
  currentTeamKey: string;
  teams: Team[];
  parentIdentifier: string | null | undefined;
}) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIssue[]>([]);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const r = await workspaceSearch(workspaceSlug, q, 8);
    setResults(r.issues.filter((i) => i.identifier !== identifier));
  }

  async function pick(parent: SearchIssue) {
    await patchIssue(workspaceSlug, identifier, { parent_identifier: parent.identifier });
    setConverting(false);
    setQuery("");
    setResults([]);
    router.refresh();
  }

  async function clearParent() {
    await patchIssue(workspaceSlug, identifier, { clear_parent: true });
    router.refresh();
  }

  return (
    <>
      <IssueActions
        workspaceSlug={workspaceSlug}
        identifier={identifier}
        isArchived={isArchived}
        currentTeamKey={currentTeamKey}
        teams={teams}
        onConvertToSubissue={parentIdentifier ? clearParent : () => setConverting(true)}
      />
      {converting && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-32"
          onClick={() => setConverting(false)}
        >
          <div
            className="w-[480px] rounded-md border border-border-subtle bg-elevated shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
              <span className="text-small font-medium text-text-primary">Convert to sub-issue of…</span>
              <button onClick={() => setConverting(false)} className="text-text-tertiary hover:text-text-secondary">
                <X size={14} />
              </button>
            </header>
            <input
              autoFocus
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search by ID or title…"
              className="w-full bg-transparent px-3 py-2 text-small outline-none placeholder:text-text-tertiary"
            />
            <ul className="max-h-72 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-small text-text-secondary hover:bg-row-hover"
                  >
                    <span className="w-16 shrink-0 font-mono text-mini text-text-tertiary">{r.identifier}</span>
                    <span className="truncate text-text-primary">{r.title}</span>
                  </button>
                </li>
              ))}
              {query && results.length === 0 && (
                <li className="px-3 py-3 text-mini text-text-tertiary">No matches.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
