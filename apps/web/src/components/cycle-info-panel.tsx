"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { LinkIcon, Plus, Star, Target } from "lucide-react";
import { CycleMenu } from "@/components/cycle-menu";
import { useCyclePrefs } from "@/lib/cycle-prefs";
import { useHydrated } from "@/lib/use-hydrated";
import type { Cycle, Issue, Team } from "@/lib/api";

/**
 * Right-side info panel for a cycle. Mounted next to the issue list
 * when prefs.right_panel_open is on (3rd chip in CycleControls).
 *
 * Layout follows Linear's reference:
 *   - Status pill + date range, with an arrow between the two dates.
 *   - Cycle name + favorite + 3-dot menu (same CycleMenu used in the
 *     header so all 6 actions are available from the panel too).
 *   - "+ Add document or link" affordance (drops a link into the
 *     panel's local list — there's no document store backing this yet,
 *     so persistence is limited to the current session).
 *   - Progress section: Scope / Started / Completed counts + a
 *     percent-of-scope donut.
 */
export function CycleInfoPanel({
  workspaceSlug,
  team,
  cycle,
  issues,
}: {
  workspaceSlug: string;
  team: Team;
  cycle: Cycle;
  issues: Issue[];
}) {
  const { prefs, update } = useCyclePrefs(workspaceSlug, cycle.id);
  const hydrated = useHydrated();
  const [links, setLinks] = useState<Array<{ url: string; label: string }>>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const showFavorite = hydrated && prefs.favorite;

  const totals = useMemo(() => {
    const scope = issues.length;
    let started = 0;
    let completed = 0;
    for (const i of issues) {
      if (i.state.group === "completed") completed += 1;
      else if (i.state.group === "started" || i.state.group === "unstarted") started += 1;
    }
    const unstarted = scope - started - completed;
    return { scope, started, completed, unstarted };
  }, [issues]);

  const pct = totals.scope > 0 ? Math.round((totals.completed / totals.scope) * 100) : 0;

  function addLink() {
    const v = draft.trim();
    if (!v) {
      setAdding(false);
      return;
    }
    setLinks((ls) => [...ls, { url: v, label: prettyHost(v) }]);
    setDraft("");
    setAdding(false);
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col gap-3 border-l border-border-subtle bg-app px-4 py-4">
      <div className="flex items-center gap-2">
        <StatusPill cycle={cycle} />
        <span className="text-mini text-text-tertiary">
          {fmtDate(cycle.starts_at)} <span className="text-text-quaternary">→</span> {fmtDate(cycle.ends_at)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Target size={13} className="text-text-tertiary" />
        <span className="flex-1 truncate text-small font-semibold text-text-primary">{cycle.name}</span>
        <button
          type="button"
          onClick={() => update({ favorite: !prefs.favorite })}
          aria-label={showFavorite ? "Unfavorite cycle" : "Favorite cycle"}
          className={clsx(
            "rounded-md p-1 transition-colors",
            showFavorite
              ? "text-amber-400"
              : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
          )}
        >
          <Star size={11} strokeWidth={1.75} fill={showFavorite ? "currentColor" : "none"} />
        </button>
        <CycleMenu workspaceSlug={workspaceSlug} cycle={cycle} />
      </div>

      {cycle.description && (
        <p className="text-mini text-text-tertiary">{cycle.description}</p>
      )}

      <div>
        {links.map((l, i) => (
          <a
            key={i}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-mini text-text-secondary hover:bg-row-hover"
          >
            <LinkIcon size={11} className="text-text-tertiary" />
            <span className="flex-1 truncate">{l.label}</span>
          </a>
        ))}
        {adding ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <LinkIcon size={11} className="text-text-tertiary" />
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setAdding(false); setDraft(""); }
                if (e.key === "Enter") addLink();
              }}
              onBlur={addLink}
              placeholder="https://…"
              className="flex-1 bg-transparent text-mini text-text-primary placeholder:text-text-quaternary focus:outline-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Plus size={11} />
            <span>Add document or link</span>
          </button>
        )}
      </div>

      <div className="rounded-md border border-border-subtle p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-mini font-medium text-text-secondary">Progress</span>
          <span className="text-mini text-text-tertiary">{pct}%</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Donut pct={pct} />
          <ul className="flex-1 space-y-1 text-mini">
            <ProgressRow swatch="bg-text-quaternary" label="Scope" value={totals.scope} />
            <ProgressRow swatch="bg-amber-400" label="Started" value={totals.started} pct={totals.scope > 0 ? Math.round((totals.started / totals.scope) * 100) : 0} />
            <ProgressRow swatch="bg-accent" label="Completed" value={totals.completed} pct={pct} />
          </ul>
        </div>

        <Bar started={totals.started} completed={totals.completed} unstarted={totals.unstarted} scope={totals.scope} />
      </div>
    </aside>
  );
}

function ProgressRow({
  swatch,
  label,
  value,
  pct,
}: {
  swatch: string;
  label: string;
  value: number;
  pct?: number;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className={clsx("inline-block h-2 w-2 rounded-pill", swatch)} />
      <span className="flex-1 text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
      {pct !== undefined && (
        <span className="w-8 text-right text-text-tertiary">{pct}%</span>
      )}
    </li>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const off = c - (c * pct) / 100;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={r} className="fill-none stroke-border-subtle" strokeWidth="4" />
      <circle
        cx="24"
        cy="24"
        r={r}
        className="fill-none stroke-accent"
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        className="fill-text-primary"
        fontSize="11"
        fontWeight="600"
      >
        {pct}%
      </text>
    </svg>
  );
}

function Bar({
  started,
  completed,
  unstarted,
  scope,
}: {
  started: number;
  completed: number;
  unstarted: number;
  scope: number;
}) {
  if (scope === 0) {
    return (
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-pill" />
    );
  }
  const cP = (completed / scope) * 100;
  const sP = (started / scope) * 100;
  const uP = (unstarted / scope) * 100;
  return (
    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-pill bg-pill">
      <span className="block h-full bg-accent" style={{ width: `${cP}%` }} />
      <span className="block h-full bg-amber-400" style={{ width: `${sP}%` }} />
      <span className="block h-full bg-text-quaternary/60" style={{ width: `${uP}%` }} />
    </div>
  );
}

function StatusPill({ cycle }: { cycle: Cycle }) {
  const label =
    cycle.status === "active" ? "Current" : cycle.status === "upcoming" ? "Upcoming" : "Completed";
  const cls =
    cycle.status === "active"
      ? "bg-accent/15 text-accent"
      : cycle.status === "upcoming"
        ? "bg-amber-400/15 text-amber-400"
        : "bg-pill text-text-tertiary";
  return (
    <span className={clsx("rounded-sm px-1.5 py-0.5 text-micro font-medium", cls)}>{label}</span>
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function prettyHost(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
