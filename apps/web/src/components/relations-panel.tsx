"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GitBranch, Plus, X, Search, Copy, Link as LinkIconLucide } from "lucide-react";
import { PriorityIcon, StatusIcon } from "@/components/icons";
import { createIssueRelation, workspaceSearch, type IssueRelation, type RelationKind, type SearchIssue } from "@/lib/api";

const TYPES: { value: RelationKind; label: string; verb: string; icon: React.ReactNode }[] = [
  { value: "blocks", label: "Blocking", verb: "blocks", icon: <GitBranch size={11} className="text-priority-urgent" /> },
  { value: "blocked_by", label: "Blocked by", verb: "blocked by", icon: <GitBranch size={11} className="rotate-180 text-priority-high" /> },
  { value: "related", label: "Related", verb: "relates to", icon: <LinkIconLucide size={11} className="text-text-tertiary" /> },
  { value: "duplicate", label: "Duplicate", verb: "duplicates", icon: <Copy size={11} className="text-text-tertiary" /> },
];

export function RelationsPanel({
  workspaceSlug,
  identifier,
  relations,
}: {
  workspaceSlug: string;
  identifier: string;
  relations: IssueRelation[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<RelationKind>("blocks");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIssue[]>([]);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const r = await workspaceSearch(workspaceSlug, q, 6);
    setResults(r.issues.filter((i) => i.identifier !== identifier));
  }

  async function pick(target: SearchIssue) {
    await createIssueRelation(workspaceSlug, identifier, { type, target_identifier: target.identifier });
    setAdding(false);
    setQuery("");
    setResults([]);
    router.refresh();
  }

  const grouped = new Map<string, IssueRelation[]>();
  for (const r of relations) {
    const key = r.type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div className="mb-5">
      <header className="mb-1 flex items-center justify-between text-mini text-text-tertiary">
        <span>Relations</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md p-0.5 hover:bg-row-hover hover:text-text-secondary"
        >
          {adding ? <X size={12} /> : <Plus size={12} />}
        </button>
      </header>

      {adding && (
        <div className="mb-2 rounded-md border border-border-subtle bg-elevated p-2">
          <div className="mb-1 flex gap-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-1 rounded-pill px-2 py-0.5 text-mini ${
                  type === t.value ? "bg-row-selected text-text-primary" : "text-text-tertiary hover:bg-row-hover"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border-subtle pt-2">
            <Search size={11} className="text-text-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Find issue to relate…"
              className="flex-1 bg-transparent text-mini text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          {results.length > 0 && (
            <ul className="mt-1 max-h-40 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center gap-1.5 rounded-sm px-1 py-1 text-mini text-text-secondary hover:bg-row-hover"
                  >
                    <PriorityIcon value={r.priority} />
                    <StatusIcon group={r.state_group} />
                    <span className="w-14 shrink-0 font-mono text-text-tertiary">{r.identifier}</span>
                    <span className="truncate text-text-primary">{r.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {[...grouped.entries()].map(([t, list]) => {
        const tdef = TYPES.find((x) => x.value === t);
        return (
          <div key={t} className="mb-2">
            <div className="text-mini text-text-tertiary">{tdef?.label ?? t}</div>
            <div className="space-y-1">
              {list.map((r) => (
                <Link
                  key={r.target_identifier}
                  href={`/${workspaceSlug}/issue/${r.target_identifier}`}
                  className="flex items-center gap-1.5 truncate rounded-md px-1 py-1 hover:bg-row-hover"
                >
                  <PriorityIcon value={r.target_priority} />
                  <StatusIcon group={r.target_state_group} />
                  <span className="truncate">{r.target_title}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      {relations.length === 0 && !adding && (
        <p className="text-mini text-text-quaternary">No relations.</p>
      )}
    </div>
  );
}
