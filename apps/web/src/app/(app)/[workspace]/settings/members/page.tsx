import { Topbar } from "@/components/topbar";
import { Users } from "lucide-react";
import { listMembers } from "@/lib/api";
import { MembersList } from "@/components/members-list";
import { InviteMemberButton } from "@/components/invite-member-button";

export default async function MembersSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const members = await listMembers(workspace).catch(() => []);
  return (
    <>
      <Topbar
        title="Members"
        icon={<Users size={15} />}
        trailing={<InviteMemberButton workspaceSlug={workspace} />}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px]">
          <h1 className="text-title3 font-semibold text-text-primary">Workspace members</h1>
          <p className="mt-1 text-small text-text-tertiary">
            People with access to this workspace. Admins manage settings and billing, Members create and edit issues, Guests have read-only access.
          </p>
          <MembersList workspaceSlug={workspace} initialMembers={members} />
        </div>
      </div>
    </>
  );
}
