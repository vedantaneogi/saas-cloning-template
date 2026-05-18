"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Star, Target } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { CycleMenu } from "@/components/cycle-menu";
import { CycleControls } from "@/components/cycle-controls";
import { CompleteCycleButton } from "@/components/complete-cycle-button";
import { useCyclePrefs } from "@/lib/cycle-prefs";
import { useHydrated } from "@/lib/use-hydrated";
import { listCycles, type Cycle, type Team } from "@/lib/api";

/**
 * Custom header for /cycle/[cycleId]. Two rows, matching Linear:
 *   Row 1 — team glyph + Team name › Cycles › Cycle N (with a chevron
 *           dropdown to switch cycles), favorite star, the 3-dot menu
 *           (CycleMenu) and a "Complete cycle" button when the cycle
 *           is active.
 *   Row 2 — status pill + date range on the left, the 3-chip controls
 *           (Filter / Display / Panel) on the right.
 */
export function CycleHeader({
  workspaceSlug,
  team,
  cycle,
}: {
  workspaceSlug: string;
  team: Team;
  cycle: Cycle;
}) {
  const { prefs, update } = useCyclePrefs(workspaceSlug, cycle.id);
  const [current, setCurrent] = useState(cycle);
  const hydrated = useHydrated();

  useEffect(() => setCurrent(cycle), [cycle]);

  const showFavorite = hydrated && prefs.favorite;

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <TeamGlyph team={team} />
        <Link
          href={`/${workspaceSlug}/team/${team.key}/active`}
          className="text-small text-text-secondary hover:text-text-primary"
        >
          {team.name}
        </Link>
        <ChevronRight size={11} className="text-text-quaternary" />
        <Link
          href={`/${workspaceSlug}/team/${team.key}/cycles`}
          className="text-small text-text-secondary hover:text-text-primary"
        >
          Cycles
        </Link>
        <ChevronRight size={11} className="text-text-quaternary" />
        <CycleSwitcher
          workspaceSlug={workspaceSlug}
          teamKey={team.key}
          cycle={current}
        />
        <button
          type="button"
          onClick={() => update({ favorite: !prefs.favorite })}
          aria-label={showFavorite ? "Unfavorite cycle" : "Favorite cycle"}
          className={clsx(
            "ml-0.5 rounded-md p-1 transition-colors",
            showFavorite ? "text-amber-400" : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
          )}
        >
          <Star size={12} strokeWidth={1.75} fill={showFavorite ? "currentColor" : "none"} />
        </button>
        <span className="ml-auto flex items-center gap-2">
          {current.status === "active" && (
            <CompleteCycleButton
              workspaceSlug={workspaceSlug}
              cycleId={current.id}
              remaining={current.issue_count - current.completed_issue_count}
            />
          )}
          <CycleMenu
            workspaceSlug={workspaceSlug}
            cycle={current}
            onCycleChange={(next) => setCurrent(next)}
          />
        </span>
      </header>

      <div className="flex h-[44px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <StatusPill cycle={current} />
        <span className="text-mini text-text-tertiary">{formatRange(current.starts_at, current.ends_at)}</span>
        <span className="ml-auto">
          <CycleControls
            workspaceSlug={workspaceSlug}
            cycleId={current.id}
            teamKey={team.key}
          />
        </span>
      </div>
    </>
  );
}

function CycleSwitcher({
  workspaceSlug,
  teamKey,
  cycle,
}: {
  workspaceSlug: string;
  teamKey: string;
  cycle: Cycle;
}) {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loaded, setLoaded] = useState(false);

  return (
    <Popover
      align="start"
      width={260}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={() => {
            toggle();
            if (!loaded) {
              listCycles(workspaceSlug, teamKey)
                .then((cs) => { setCycles(cs); setLoaded(true); })
                .catch(() => setLoaded(true));
            }
          }}
          className={clsx(
            "flex items-center gap-1 rounded-md px-1 py-0.5 text-small font-semibold text-text-primary hover:bg-row-hover",
            open && "bg-row-hover",
          )}
        >
          {cycle.name}
          <ChevronDown size={11} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {!loaded && (
            <div className="px-2.5 py-2 text-mini text-text-tertiary">Loading…</div>
          )}
          {loaded && cycles.length === 0 && (
            <div className="px-2.5 py-2 text-mini text-text-tertiary">No cycles.</div>
          )}
          {loaded && cycles.length > 0 && (
            <>
              <div className="px-2.5 pb-1 pt-0.5 text-micro uppercase tracking-wide text-text-quaternary">
                Switch cycle
              </div>
              {cycles
                .slice()
                .sort((a, b) => a.number - b.number)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      close();
                      router.push(`/${workspaceSlug}/cycle/${c.id}`);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small hover:bg-row-hover",
                      c.id === cycle.id ? "text-text-primary" : "text-text-secondary",
                    )}
                  >
                    <Target size={11} className="text-text-tertiary" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <StatusPill cycle={c} compact />
                  </button>
                ))}
            </>
          )}
        </div>
      )}
    </Popover>
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

function StatusPill({ cycle, compact }: { cycle: Cycle; compact?: boolean }) {
  const label =
    cycle.status === "active" ? "Current" : cycle.status === "upcoming" ? "Upcoming" : "Completed";
  const cls =
    cycle.status === "active"
      ? "bg-accent/15 text-accent"
      : cycle.status === "upcoming"
        ? "bg-amber-400/15 text-amber-400"
        : "bg-pill text-text-tertiary";
  return (
    <span
      className={clsx(
        "rounded-sm px-1.5 py-0.5 font-medium",
        cls,
        compact ? "text-[10px]" : "text-micro",
      )}
    >
      {label}
    </span>
  );
}

function formatRange(a: string, b: string) {
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(a)} → ${fmt(b)}`;
}
