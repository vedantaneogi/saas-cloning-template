"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getIssue, type IssueDetail } from "@/lib/api";

// Inline issue reference like [ENG-12]. Renders a styled link and on hover
// fetches the issue summary into a small popover.

const CACHE = new Map<string, IssueDetail | null>();

export function IssueRefLink({ workspaceSlug, identifier }: { workspaceSlug: string; identifier: string }) {
  const [hovered, setHovered] = useState(false);
  const [issue, setIssue] = useState<IssueDetail | null | undefined>(CACHE.get(identifier));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hovered) return;
    if (CACHE.has(identifier)) {
      setIssue(CACHE.get(identifier));
      return;
    }
    timer.current = setTimeout(() => {
      getIssue(workspaceSlug, identifier)
        .then((d) => {
          CACHE.set(identifier, d);
          setIssue(d);
        })
        .catch(() => {
          CACHE.set(identifier, null);
          setIssue(null);
        });
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hovered, identifier, workspaceSlug]);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/${workspaceSlug}/issue/${identifier}`}
        className="rounded-sm bg-pill px-1 py-0.5 font-mono text-mini text-text-primary hover:bg-elevated-hover"
      >
        {identifier}
      </Link>
      {hovered && issue !== undefined && (
        <span className="absolute bottom-full left-0 z-30 mb-1 w-[280px] rounded-md border border-border-subtle bg-elevated p-2 text-mini text-text-secondary shadow-popover">
          {issue ? (
            <>
              <span className="block text-text-primary">{issue.title}</span>
              <span className="mt-1 block text-text-tertiary">
                {issue.state.name} · {issue.assignee?.name ?? "Unassigned"}
              </span>
            </>
          ) : (
            <span className="text-text-tertiary">Issue not found.</span>
          )}
        </span>
      )}
    </span>
  );
}
