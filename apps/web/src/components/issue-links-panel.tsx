"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest, GitBranch, Figma, Link2, Plus, X } from "lucide-react";
import { createIssueLink, deleteIssueLink, type IssueLink } from "@/lib/api";

function iconFor(type: IssueLink["type"]) {
  if (type === "github_pr") return <GitPullRequest size={12} />;
  if (type === "github_branch") return <GitBranch size={12} />;
  if (type === "figma") return <Figma size={12} />;
  return <Link2 size={12} />;
}

function statusBadge(status: IssueLink["status"]) {
  if (!status) return null;
  const cls = {
    open: "bg-state-started/15 text-state-started",
    merged: "bg-accent/15 text-accent",
    closed: "bg-priority-urgent/15 text-priority-urgent",
    draft: "bg-pill text-text-tertiary",
  }[status];
  return <span className={`rounded-sm px-1 py-0.5 text-micro ${cls}`}>{status}</span>;
}

export function IssueLinksPanel({
  workspaceSlug,
  identifier,
  links,
}: {
  workspaceSlug: string;
  identifier: string;
  links: IssueLink[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createIssueLink(workspaceSlug, identifier, { url: url.trim() });
      setUrl("");
      setAdding(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    await deleteIssueLink(workspaceSlug, identifier, id);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <header className="flex items-center gap-3 text-mini text-text-tertiary">
        <span className="font-medium text-text-secondary">Links</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-row-hover"
        >
          <Plus size={12} /> {adding ? "Cancel" : "Add"}
        </button>
      </header>

      {adding && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setAdding(false); setUrl(""); }
            }}
            placeholder="https://github.com/org/repo/pull/123"
            className="flex-1 rounded-md border border-border-subtle bg-elevated px-2 py-1 text-small outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!url.trim() || submitting}
            className="rounded-md bg-accent px-2 py-1 text-mini text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {links.length > 0 && (
        <ul className="mt-2 space-y-1">
          {links.map((ln) => (
            <li
              key={ln.id}
              className="group flex items-center gap-2 rounded-md border border-border-subtle bg-elevated px-2 py-1.5 text-small"
            >
              <span className="text-text-tertiary">{iconFor(ln.type)}</span>
              <a
                href={ln.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-text-primary hover:underline"
              >
                {ln.title}
              </a>
              {statusBadge(ln.status)}
              <button
                type="button"
                onClick={() => remove(ln.id)}
                className="opacity-0 transition group-hover:opacity-100 text-text-tertiary hover:text-text-primary"
                title="Remove link"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
