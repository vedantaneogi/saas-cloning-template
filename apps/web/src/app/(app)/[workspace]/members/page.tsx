import { ArrowDown, Users } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar } from "@/components/icons";
import { MemberTeamsCell } from "@/components/member-teams-cell";
import { InviteMemberIconButton } from "@/components/invite-member-icon-button";
import { formatJoinedDate, formatLastSeen } from "@/lib/member-status";
import { getWorkspace, listMembers, type Member, type Team } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-accent/15 text-accent",
  member: "bg-pill text-text-secondary",
  guest: "bg-pill text-text-tertiary",
};

export default async function MembersPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, members] = await Promise.all([
    getWorkspace(workspace),
    listMembers(workspace).catch(() => [] as Member[]),
  ]);
  const teams: Team[] = ws.teams ?? [];

  return (
    <>
      <Topbar
        title="Members"
        icon={<Users size={15} />}
        trailing={
          <span className="flex items-center gap-2">
            <span className="text-mini text-text-tertiary">{members.length}</span>
            <InviteMemberIconButton workspaceSlug={workspace} />
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto px-5 pt-2">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_180px_120px] items-center gap-3 px-2 py-2 text-mini font-medium text-text-tertiary">
          <span className="inline-flex items-center gap-1 text-text-secondary">
            Name <ArrowDown size={11} className="text-text-tertiary" />
          </span>
          <span>Status</span>
          <span>Joined</span>
          <span>Teams</span>
          <span>Last seen</span>
        </div>
        {members.map((m) => (
          <MemberRow key={m.id} member={m} teams={teams} workspaceSlug={workspace} />
        ))}
      </div>
    </>
  );
}

function MemberRow({
  member,
  teams,
  workspaceSlug,
}: {
  member: Member;
  teams: Team[];
  workspaceSlug: string;
}) {
  const role = (member.role ?? "member") as keyof typeof ROLE_LABEL;
  const joined = formatJoinedDate(member.joined_at);
  const seen = formatLastSeen(member.last_active_at);
  const teamKeys = member.team_keys ?? [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_180px_120px] items-center gap-3 rounded-md px-2 py-2.5 text-small hover:bg-row-hover">
      <span className="flex items-center gap-2.5">
        <Avatar initials={member.initials} color={member.color} size={24} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-text-primary">{member.name}</span>
          {member.email && (
            <span className="truncate text-mini text-text-tertiary">{member.email}</span>
          )}
        </span>
      </span>
      <span>
        <span className={`rounded-sm px-1.5 py-0.5 text-micro font-medium ${ROLE_TONE[role] ?? ROLE_TONE.member}`}>
          {ROLE_LABEL[role] ?? "Member"}
        </span>
      </span>
      <span className="text-mini text-text-tertiary">{joined}</span>
      <span className="min-w-0">
        <MemberTeamsCell
          workspaceSlug={workspaceSlug}
          teamKeys={teamKeys}
          allTeams={teams}
        />
      </span>
      <span className="flex items-center gap-1.5 text-mini text-text-tertiary">
        {seen.online && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-priority-low" aria-hidden />
        )}
        <span className={seen.online ? "text-text-secondary" : ""}>{seen.label}</span>
      </span>
    </div>
  );
}
