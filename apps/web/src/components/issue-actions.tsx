"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy, Trash2 } from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { deleteIssue, duplicateIssue } from "@/lib/api";

export function IssueActions({
  workspaceSlug,
  identifier,
}: {
  workspaceSlug: string;
  identifier: string;
}) {
  const router = useRouter();

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
      width={180}
    >
      {({ close }) => (
        <PopoverList>
          <PopoverItem onClick={() => onDuplicate(close)}>
            <Copy size={13} />
            Duplicate
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
