import { Topbar } from "@/components/topbar";
import { Users } from "lucide-react";
import { Avatar } from "@/components/icons";
import { listMembers } from "@/lib/api";

export default async function MembersSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const members = await listMembers(workspace).catch(() => []);
  return (
    <>
      <Topbar title="Members" icon={<Users size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px]">
          <h1 className="text-title3 font-semibold text-text-primary">Workspace members</h1>
          <p className="mt-1 text-small text-text-tertiary">
            People with access to this workspace. Invite + role management is not wired yet.
          </p>
          <ul className="mt-6 divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-small">
                <Avatar initials={m.initials} color={m.color} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-text-primary">{m.name}</div>
                </div>
                <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro text-text-tertiary">Member</span>
              </li>
            ))}
            {members.length === 0 && (
              <li className="px-4 py-6 text-center text-mini text-text-tertiary">No members.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
