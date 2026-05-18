"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark, ChevronRight, Star } from "lucide-react";
import clsx from "clsx";
import { SaveViewButton } from "@/components/save-view-button";
import { TeamCsvActions } from "@/components/team-csv-actions";
import { TeamIssueViewsBar } from "@/components/team-issue-views-bar";
import { TeamIssuesControls } from "@/components/team-issues-controls";
import { TeamNotificationBell } from "@/components/team-notification-bell";
import { useTeamFavorite } from "@/lib/team-prefs";
import type { SavedView, Team } from "@/lib/api";

type Base = "active" | "backlog" | "all";

/**
 * Custom header for /team/[teamKey]/[view]. Matches Linear's two-row
 * layout:
 *   Row 1 — team-colored squircle icon + team name › Issues + favorite
 *           star, with a bell on the far right for notification prefs.
 *   Row 2 — pill-style tabs (All issues / Active / Backlog) + a small
 *           Saved-views shortcut, with Filter / Display / Panel and the
 *           CSV menu trailing on the right.
 *
 * When the page is rendered for a saved view, row 1 swaps the breadcrumb
 * for the view name + favorite + the Save-changes/Reset controls.
 */
export function TeamIssuesHeader({
  workspace,
  team,
  view,
  savedView,
}: {
  workspace: string;
  team: Team;
  view: Base;
  savedView: SavedView | null;
}) {
  const sp = useSearchParams();
  const [favorited, toggleFavorite] = useTeamFavorite(workspace, team.key);

  function tabHref(target: Base) {
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.delete("view_id");
    const qs = next.toString();
    return `/${workspace}/team/${team.key}/${target}${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        {savedView ? (
          <>
            <span style={{ color: savedView.icon_color }}>
              <Bookmark size={14} strokeWidth={1.75} />
            </span>
            <Link
              href={`/${workspace}/team/${team.key}/active`}
              className="flex items-center gap-1 text-small text-text-secondary hover:text-text-primary"
            >
              <TeamGlyph team={team} />
              {team.name}
            </Link>
            <ChevronRight size={11} className="text-text-quaternary" />
            <span className="text-small font-semibold text-text-primary">{savedView.name}</span>
          </>
        ) : (
          <>
            <TeamGlyph team={team} />
            <span className="text-small font-semibold text-text-primary">{team.name}</span>
            <ChevronRight size={11} className="text-text-quaternary" />
            <span className="text-small font-semibold text-text-primary">Issues</span>
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
          </>
        )}
        <span className="ml-auto">
          <TeamNotificationBell workspaceSlug={workspace} teamKey={team.key} />
        </span>
      </header>

      <div className="flex h-[44px] shrink-0 items-center gap-1.5 border-b border-border-subtle px-4">
        {savedView ? (
          // When viewing a saved view we hide the base tabs (the view
          // already pinned its own base via the saved query). Saved-view
          // icon takes their place so the row keeps the same height.
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-text-tertiary">
            <Bookmark size={12} />
          </span>
        ) : (
          <>
            <PillTab href={tabHref("all")} label="All issues" active={view === "all"} />
            <PillTab href={tabHref("active")} label="Active" active={view === "active"} />
            <PillTab href={tabHref("backlog")} label="Backlog" active={view === "backlog"} />
            <TeamIssueViewsBar
              workspaceSlug={workspace}
              teamKey={team.key}
              activeViewId={savedView?.id ?? null}
            />
          </>
        )}

        <span className="ml-auto flex items-center gap-2">
          <SaveViewButton workspaceSlug={workspace} teamKey={team.key} base={view} savedView={savedView} />
          <TeamIssuesControls workspaceSlug={workspace} teamKey={team.key} />
          <TeamCsvActions workspaceSlug={workspace} teamKey={team.key} />
        </span>
      </div>
    </>
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

function PillTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={clsx(
        "flex h-7 items-center rounded-full border px-3 text-mini transition-colors",
        active
          ? "border-border-strong bg-row-selected text-text-primary"
          : "border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
      )}
    >
      {label}
    </Link>
  );
}
