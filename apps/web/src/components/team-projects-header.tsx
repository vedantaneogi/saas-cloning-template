"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import clsx from "clsx";
import { TeamNotificationBell } from "@/components/team-notification-bell";
import { useTeamFavorite } from "@/lib/team-prefs";
import type { Team } from "@/lib/api";

/**
 * One-row breadcrumb header for /team/[teamKey]/projects. Mirrors the
 * team issues header but without the All/Active/Backlog pill row — the
 * Projects toolbar below already supplies its own All-projects pill
 * (via ProjectsViewsBar) plus the Filter / Display / Panel chips, so
 * we just provide the title + favorite + bell here.
 */
export function TeamProjectsHeader({
  workspace,
  team,
  trailing,
}: {
  workspace: string;
  team: Team;
  trailing?: React.ReactNode;
}) {
  const [favorited, toggleFavorite] = useTeamFavorite(workspace, team.key);
  void workspace;

  return (
    <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
      <TeamGlyph team={team} />
      <span className="text-small font-semibold text-text-primary">{team.name}</span>
      <ChevronRight size={11} className="text-text-quaternary" />
      <span className="text-small font-semibold text-text-primary">Projects</span>
      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={favorited ? "Unfavorite team" : "Favorite team"}
        className={clsx(
          "ml-0.5 rounded-md p-1 transition-colors",
          favorited ? "text-amber-400" : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
        )}
      >
        <Star size={12} strokeWidth={1.75} fill={favorited ? "currentColor" : "none"} />
      </button>
      <span className="ml-auto flex items-center gap-2">
        {trailing}
        <TeamNotificationBell workspaceSlug={workspace} teamKey={team.key} />
      </span>
    </header>
  );
}

function TeamGlyph({ team }: { team: Team }) {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold text-white"
      style={{ background: team.icon_color }}
    >
      <span className="inline-block h-2 w-2 rounded-pill bg-white/90" />
    </span>
  );
}
