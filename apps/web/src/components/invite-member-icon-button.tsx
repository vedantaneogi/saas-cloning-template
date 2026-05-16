"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { InviteModal } from "@/components/invite-modal";

/**
 * Compact "+" trailing action used in the Members + Teams topbar — opens
 * the same Invite modal as the sidebar Try-section row, but rendered as a
 * minimal icon to match Linear's table-page chrome.
 */
export function InviteMemberIconButton({ workspaceSlug }: { workspaceSlug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Invite member"
        title="Invite member"
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
      >
        <Plus size={14} />
      </button>
      <InviteModal
        workspaceSlug={workspaceSlug}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
