import { Folders } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { TeamsTable } from "@/components/teams-table";
import { InviteMemberIconButton } from "@/components/invite-member-icon-button";
import {
  getWorkspace,
  listMembers,
  listProjects,
  type Member,
  type Project,
} from "@/lib/api";

export default async function TeamsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, members, projects] = await Promise.all([
    getWorkspace(workspace),
    listMembers(workspace).catch(() => [] as Member[]),
    listProjects(workspace).catch(() => [] as Project[]),
  ]);

  const teams = ws.teams ?? [];
  const activeProjectsByTeam: Record<string, number> = {};
  for (const p of projects) {
    if (p.state !== "started" && p.state !== "planned") continue;
    for (const k of p.team_keys ?? []) {
      activeProjectsByTeam[k] = (activeProjectsByTeam[k] ?? 0) + 1;
    }
  }

  return (
    <>
      <Topbar
        title="Teams"
        icon={<Folders size={15} />}
        trailing={
          <span className="flex items-center gap-2">
            <span className="text-mini text-text-tertiary">{teams.length}</span>
            <InviteMemberIconButton workspaceSlug={workspace} />
          </span>
        }
      />
      <TeamsTable
        workspaceSlug={workspace}
        teams={teams}
        memberCount={members.length}
        activeProjectsByTeam={activeProjectsByTeam}
      />
    </>
  );
}
