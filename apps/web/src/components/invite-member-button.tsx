"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { InviteModal } from "@/components/invite-modal";

export function InviteMemberButton({ workspaceSlug }: { workspaceSlug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini font-medium text-white shadow-button hover:opacity-90"
      >
        <Plus size={12} /> Invite member
      </button>
      <InviteModal
        workspaceSlug={workspaceSlug}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
