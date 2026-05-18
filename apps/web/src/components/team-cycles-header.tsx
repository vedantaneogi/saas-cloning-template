"use client";

import { ChevronRight, Star } from "lucide-react";
import clsx from "clsx";
import { useTeamFavorite } from "@/lib/team-prefs";
import type { Team } from "@/lib/api";

/**
 * One-row breadcrumb header for /team/[teamKey]/cycles. Mirrors the
 * team-projects header — team-colored squircle glyph, team name ›
 * Cycles, and a favorite-team star that toggles the existing
 * useTeamFavorite hook (powers the sidebar Favorites section).
 */
export function TeamCyclesHeader({
  workspace,
  team,
}: {
  workspace: string;
  team: Team;
}) {
  const [favorited, toggleFavorite] = useTeamFavorite(workspace, team.key);
  void workspace;

  return (
    <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
        style={{ background: team.icon_color }}
      >
        <span className="inline-block h-2 w-2 rounded-pill bg-white/90" />
      </span>
      <span className="text-small font-semibold text-text-primary">{team.name}</span>
      <ChevronRight size={11} className="text-text-quaternary" />
      <span className="text-small font-semibold text-text-primary">Cycles</span>
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
    </header>
  );
}
