"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy, Trash2, Archive, ArchiveRestore, ArrowRightLeft, GitMerge } from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import {
  archiveIssue,
  deleteIssue,
  duplicateIssue,
  moveIssue,
  unarchiveIssue,
  type Team,
} from "@/lib/api";

export function IssueActions({
  workspaceSlug,
  identifier,
  isArchived = false,
  currentTeamKey,
  teams = [],
  onConvertToSubissue,
}: {
  workspaceSlug: string;
  identifier: string;
  isArchived?: boolean;
  currentTeamKey?: string;
  teams?: Team[];
  onConvertToSubissue?: () => void;
}) {
  const router = useRouter();
  const [moveOpen, setMoveOpen] = useState(false);

  async function onDelete(close: () => void) {
    if (!confirm(`Delete ${identifier}? This cannot be undone.`)) return;
    close();
    await deleteIssue(workspaceSlug, identifier);
    router.push(`/${workspaceSlug}/inbox`);
    router.refresh();
  }

  async function onDuplicate(close: () => void) {
    close();
    const dup = await duplicateIssue(workspaceSlug, identifier);
    router.push(`/${workspaceSlug}/issue/${dup.identifier}`);
    router.refresh();
  }

  async function onArchive(close: () => void) {
    close();
    if (isArchived) await unarchiveIssue(workspaceSlug, identifier);
    else await archiveIssue(workspaceSlug, identifier);
    router.refresh();
  }

  async function onMove(close: () => void, teamKey: string) {
    close();
    const moved = await moveIssue(workspaceSlug, identifier, teamKey);
    router.push(`/${workspaceSlug}/issue/${moved.identifier}`);
    router.refresh();
  }

  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Issue actions"
        >
          <MoreHorizontal size={15} />
        </button>
      )}
      align="end"
      width={200}
    >
      {({ close }) => (
        <PopoverList>
          <PopoverItem onClick={() => onDuplicate(close)}>
            <Copy size={13} />
            Duplicate
          </PopoverItem>
          {onConvertToSubissue && (
            <PopoverItem onClick={() => { close(); onConvertToSubissue(); }}>
              <GitMerge size={13} />
              Convert to sub-issue
            </PopoverItem>
          )}
          {teams.length > 1 && (
            <div className="relative">
              <PopoverItem onClick={() => setMoveOpen((v) => !v)}>
                <ArrowRightLeft size={13} />
                Move to team…
              </PopoverItem>
              {moveOpen && (
                <div className="absolute left-full top-0 ml-1 w-44 rounded-md border border-border-subtle bg-elevated shadow-popover">
                  {teams.filter((t) => t.key !== currentTeamKey).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => onMove(close, t.key)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-small text-text-secondary hover:bg-row-hover"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-pill" style={{ background: t.icon_color }} />
                      {t.name}
                      <span className="ml-auto font-mono text-mini text-text-tertiary">{t.key}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <PopoverItem onClick={() => onArchive(close)}>
            {isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            {isArchived ? "Unarchive" : "Archive"}
          </PopoverItem>
          <PopoverItem onClick={() => onDelete(close)}>
            <Trash2 size={13} />
            <span className="text-priority-urgent">Delete</span>
          </PopoverItem>
        </PopoverList>
      )}
    </Popover>
  );
}
