"use client";

import Link from "next/link";
import { Box, Check, Folders } from "lucide-react";
import { Avatar } from "@/components/icons";
import { TeamMenu } from "@/components/team-menu";
import type { Team } from "@/lib/api";

/**
 * Table body for the workspace Teams page. Marked `"use client"` so each
 * row can host the same hover-revealed 3-dot menu (Favorite / Team
 * settings / Subscribe / Leave team / …) that the sidebar uses. Static
 * markup stays out of the bundle by living in the server-rendered page.
 */
export function TeamsTable({
  workspaceSlug,
  teams,
  memberCount,
  activeProjectsByTeam,
}: {
  workspaceSlug: string;
  teams: Team[];
  memberCount: number;
  activeProjectsByTeam: Record<string, number>;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-2">
      <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px_140px_36px] items-center gap-3 px-2 py-2 text-mini font-medium text-text-tertiary">
        <span>Name</span>
        <span>Membership</span>
        <span>Members</span>
        <span>Cycle</span>
        <span>Active projects</span>
        <span />
      </div>
      {teams.map((t) => (
        <TeamRow
          key={t.key}
          team={t}
          workspaceSlug={workspaceSlug}
          memberCount={memberCount}
          activeProjects={activeProjectsByTeam[t.key] ?? 0}
        />
      ))}
    </div>
  );
}

function TeamRow({
  team,
  workspaceSlug,
  memberCount,
  activeProjects,
}: {
  team: Team;
  workspaceSlug: string;
  memberCount: number;
  activeProjects: number;
}) {
  return (
    <div className="group/team grid grid-cols-[minmax(0,1fr)_140px_140px_140px_140px_36px] items-center gap-3 rounded-md px-2 py-2.5 text-small hover:bg-row-hover">
      <Link
        href={`/${workspaceSlug}/team/${team.key}/active`}
        className="flex min-w-0 items-center gap-2"
      >
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
          style={{ background: team.icon_color }}
        >
          <Folders size={11} className="text-white/80" />
        </span>
        <span className="truncate font-medium text-text-primary">{team.name}</span>
        <span className="rounded-sm bg-pill px-1.5 py-0.5 font-mono text-micro text-text-tertiary">
          {team.key}
        </span>
      </Link>
      <Link
        href={`/${workspaceSlug}/team/${team.key}/active`}
        className="flex items-center gap-1 text-mini text-text-secondary"
      >
        <Check size={11} className="text-text-tertiary" />
        Joined
      </Link>
      <Link
        href={`/${workspaceSlug}/team/${team.key}/active`}
        className="flex"
      >
        <Avatar initials={`${memberCount}`.slice(0, 2)} color="#5e6ad2" size={20} />
      </Link>
      <Link
        href={`/${workspaceSlug}/team/${team.key}/active`}
        className="text-mini text-text-tertiary"
      >
        {team.cycles_enabled ? "Enabled" : "—"}
      </Link>
      <Link
        href={`/${workspaceSlug}/team/${team.key}/active`}
        className="flex items-center gap-1 text-mini text-text-secondary"
      >
        <Box size={11} className="text-text-tertiary" />
        {activeProjects}
      </Link>
      <span className="flex justify-end">
        <TeamMenu team={team} workspaceSlug={workspaceSlug} />
      </span>
    </div>
  );
}
