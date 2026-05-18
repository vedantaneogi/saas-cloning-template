"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { CircleDashed, Compass, Plus } from "lucide-react";
import { Avatar } from "@/components/icons";
import { InitiativesControls } from "@/components/initiatives-controls";
import { NewInitiativeRow } from "@/components/new-initiative-row";
import { useInitiativesPrefs, type InitiativesPrefs } from "@/lib/initiatives-prefs";
import { useHydrated } from "@/lib/use-hydrated";
import type { Initiative, Member, Team } from "@/lib/api";

type Base = "active" | "planned" | "completed";

const DEFAULT_VISIBLE_COLS: Pick<
  InitiativesPrefs,
  | "show_description"
  | "show_owner"
  | "show_start_date"
  | "show_target_date"
  | "show_completed"
  | "show_updated"
  | "show_created"
  | "show_teams"
  | "show_initiative_health"
  | "show_projects"
  | "show_active_projects"
> = {
  show_description: true,
  show_owner: true,
  show_start_date: false,
  show_target_date: true,
  show_completed: false,
  show_updated: false,
  show_created: false,
  show_teams: false,
  show_initiative_health: true,
  show_projects: true,
  show_active_projects: true,
};

/**
 * Client wrapper for /initiatives. Owns the page header (with the "+"
 * button that toggles the inline NewInitiativeRow), the Active /
 * Planned / Completed pill tabs, the Filter+Display chip cluster, the
 * column header + the filtered + grouped row list.
 *
 * Tab state is query-param driven (?base=active|planned|completed) so
 * the URL stays shareable; everything else (filters, display) is
 * already URL/localStorage-backed by InitiativesControls.
 */
export function InitiativesBody({
  workspaceSlug,
  initiatives,
  members,
  teams,
  initialBase,
}: {
  workspaceSlug: string;
  initiatives: Initiative[];
  members: Member[];
  teams: Team[];
  initialBase: Base;
}) {
  const sp = useSearchParams();
  const hydrated = useHydrated();
  const { prefs } = useInitiativesPrefs(workspaceSlug);
  const [rows, setRows] = useState<Initiative[]>(initiatives);
  const [creating, setCreating] = useState(false);

  const base = ((sp.get("base") as Base | null) ?? initialBase) as Base;

  const visible = useMemo(
    () => applyFilters(rows.filter((i) => byBase(i, base)), sp),
    [rows, base, sp],
  );

  const sorted = useMemo(() => sortInitiatives(visible, prefs.ordering), [visible, prefs.ordering]);
  const groups = useMemo(() => groupInitiatives(sorted, prefs.grouping), [sorted, prefs.grouping]);

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <h1 className="truncate text-small font-semibold text-text-primary">Initiatives</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New initiative"
          title="New initiative"
          className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={14} />
        </button>
      </header>

      <div className="flex h-[44px] shrink-0 items-center gap-1.5 border-b border-border-subtle px-4">
        <PillTab base="active" current={base} workspaceSlug={workspaceSlug}>Active</PillTab>
        <PillTab base="planned" current={base} workspaceSlug={workspaceSlug}>Planned</PillTab>
        <PillTab base="completed" current={base} workspaceSlug={workspaceSlug}>Completed</PillTab>
        <span className="ml-auto flex items-center gap-2">
          <InitiativesControls workspaceSlug={workspaceSlug} teams={teams} />
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ColumnHeader prefs={prefs} hydrated={hydrated} />

        {creating && (
          <NewInitiativeRow
            workspaceSlug={workspaceSlug}
            members={members}
            defaultStatus={base}
            onCancel={() => setCreating(false)}
            onCreated={(next) => {
              setRows((prev) => [next, ...prev]);
              setCreating(false);
            }}
          />
        )}

        {visible.length === 0 && !creating && (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
            {rows.length === 0
              ? "No initiatives yet."
              : `No ${base} initiatives match the current filters.`}
          </div>
        )}

        {groups.map((g) => (
          <section key={g.key}>
            {g.label && (
              <header className="flex h-[32px] items-center gap-2 bg-elevated px-5 text-mini">
                <span className="font-medium text-text-secondary">{g.label}</span>
                <span className="text-text-tertiary">{g.rows.length}</span>
              </header>
            )}
            {g.rows.map((i) => (
              <InitiativeRow
                key={i.id}
                initiative={i}
                workspaceSlug={workspaceSlug}
                prefs={prefs}
                hydrated={hydrated}
              />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tabs / columns / row
// ---------------------------------------------------------------------------

function PillTab({
  base,
  current,
  workspaceSlug,
  children,
}: {
  base: Base;
  current: Base;
  workspaceSlug: string;
  children: React.ReactNode;
}) {
  const sp = useSearchParams();
  const params = new URLSearchParams(sp.toString());
  params.set("base", base);
  const active = current === base;
  return (
    <Link
      href={`/${workspaceSlug}/initiatives?${params.toString()}`}
      scroll={false}
      className={clsx(
        "flex h-7 items-center rounded-full border px-3 text-mini transition-colors",
        active
          ? "border-border-strong bg-row-selected text-text-primary"
          : "border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
      )}
    >
      {children}
    </Link>
  );
}

function ColumnHeader({ prefs, hydrated }: { prefs: InitiativesPrefs; hydrated: boolean }) {
  const p = hydrated ? prefs : ({ ...DEFAULT_VISIBLE_COLS } as InitiativesPrefs);
  return (
    <header className="flex h-[36px] items-center border-b border-border-subtle px-5 text-mini font-medium text-text-tertiary">
      <span className="flex-1">Name</span>
      <span className="flex shrink-0 items-center gap-6">
        {p.show_owner && <Col w={48} label="Owner" />}
        {p.show_target_date && <Col w={72} label="Target" />}
        {p.show_start_date && <Col w={72} label="Start" />}
        {p.show_created && <Col w={72} label="Created" />}
        {p.show_updated && <Col w={72} label="Updated" />}
        {p.show_completed && <Col w={72} label="Completed" />}
        {p.show_teams && <Col w={72} label="Teams" />}
        {p.show_projects && <Col w={60} label="Projects" />}
        {p.show_initiative_health && <Col w={100} label="Initiative Health" />}
        {p.show_active_projects && <Col w={120} label="Active Projects" />}
      </span>
    </header>
  );
}

function Col({ w, label }: { w: number; label: string }) {
  return (
    <span className="text-mini" style={{ width: w, textAlign: "left" }}>{label}</span>
  );
}

function InitiativeRow({
  initiative,
  workspaceSlug,
  prefs,
  hydrated,
}: {
  initiative: Initiative;
  workspaceSlug: string;
  prefs: InitiativesPrefs;
  hydrated: boolean;
}) {
  const p = hydrated ? prefs : ({ ...DEFAULT_VISIBLE_COLS } as InitiativesPrefs);
  const activeProjects = Math.max(0, initiative.project_count - initiative.completed_project_count);

  return (
    <Link
      href={`/${workspaceSlug}/initiative/${initiative.slug_id}`}
      className="group flex min-h-[52px] items-start gap-3 border-b border-border-subtle px-5 py-2.5 text-small transition-colors hover:bg-row-hover"
    >
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
        style={{ background: initiative.icon_color }}
      >
        <Compass size={11} className="text-white/80" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">{initiative.name}</span>
        {p.show_description && initiative.description && (
          <span className="mt-0.5 block truncate text-mini text-text-tertiary">{initiative.description}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-6 pt-0.5">
        {p.show_owner && (
          <span className="flex w-12 items-center">
            {initiative.owner ? (
              <Avatar initials={initiative.owner.initials} color={initiative.owner.color} size={18} />
            ) : (
              <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
            )}
          </span>
        )}
        {p.show_target_date && (
          <span className="w-[72px] text-mini text-text-primary">
            {initiative.target_date ? formatTarget(initiative.target_date) : <span className="text-text-quaternary">—</span>}
          </span>
        )}
        {p.show_start_date && (
          <span className="w-[72px] text-mini text-text-quaternary">—</span>
        )}
        {p.show_created && (
          <span className="w-[72px] text-mini text-text-quaternary">—</span>
        )}
        {p.show_updated && (
          <span className="w-[72px] text-mini text-text-quaternary">—</span>
        )}
        {p.show_completed && (
          <span className="w-[72px] text-mini text-text-quaternary">—</span>
        )}
        {p.show_teams && (
          <span className="w-[72px] text-mini text-text-quaternary">—</span>
        )}
        {p.show_projects && (
          <span className="flex w-[60px] items-center gap-1.5">
            <HexBadge />
            <span className="text-mini text-text-primary">{initiative.project_count}</span>
          </span>
        )}
        {p.show_initiative_health && (
          <span className="flex w-[100px] items-center gap-1.5">
            <HexBadge />
            <span className="text-mini text-text-primary">{initiative.completed_project_count}</span>
          </span>
        )}
        {p.show_active_projects && (
          <span className="flex w-[120px] items-center gap-1.5 text-mini text-text-tertiary">
            <CircleDashed size={11} className="text-text-quaternary" />
            <span>{activeProjects > 0 ? `${activeProjects} active` : "No updates"}</span>
          </span>
        )}
      </span>
    </Link>
  );
}

function HexBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
      <path
        d="M7 1L12.5 4V10L7 13L1.5 10V4L7 1Z"
        fill="rgba(99, 102, 241, 0.18)"
        stroke="rgba(99, 102, 241, 0.55)"
        strokeWidth="1"
      />
      <path d="M4.5 7L6.3 8.8L9.5 5.5" stroke="rgba(165, 180, 252, 0.95)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Filter / sort / group helpers
// ---------------------------------------------------------------------------

function byBase(i: Initiative, base: Base): boolean {
  if (base === "completed") return i.status === "completed" || i.status === "canceled";
  return i.status === base;
}

function applyFilters(rows: Initiative[], sp: URLSearchParams | null): Initiative[] {
  if (!sp) return rows;
  const owners = listParam(sp, "owner");
  const dates = listParam(sp, "date");
  // `team` / `health` filter rows live in URL state so users see the
  // chip badge count update, but the API doesn't expose team-rollups or
  // a health field on initiatives yet — those trims are intentionally
  // no-ops until the model lands.
  return rows.filter((i) => {
    if (owners.length > 0) {
      const id = i.owner?.id ?? "_none";
      if (!owners.includes(id)) return false;
    }
    if (dates.length > 0) {
      if (!dates.some((d) => matchesDate(i, d))) return false;
    }
    return true;
  });
}

function matchesDate(i: Initiative, key: string): boolean {
  if (key === "no_target") return !i.target_date;
  if (!i.target_date) return false;
  const t = new Date(i.target_date);
  const now = new Date();
  if (key === "overdue") return t.getTime() < now.getTime();
  const sameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  if (key === "due_this_month") return sameMonth(t, now);
  if (key === "due_next_month") {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return sameMonth(t, next);
  }
  return true;
}

function listParam(sp: URLSearchParams, key: string): string[] {
  const v = sp.get(key);
  return v ? v.split(",").filter(Boolean) : [];
}

function sortInitiatives(rows: Initiative[], ordering: string): Initiative[] {
  const list = [...rows];
  switch (ordering) {
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "target":
      list.sort((a, b) => {
        const at = a.target_date ? new Date(a.target_date).getTime() : Number.POSITIVE_INFINITY;
        const bt = b.target_date ? new Date(b.target_date).getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      });
      break;
    default:
      break;
  }
  return list;
}

interface Group {
  key: string;
  label: string | null;
  rows: Initiative[];
}

function groupInitiatives(rows: Initiative[], by: string): Group[] {
  if (by === "no_grouping") return [{ key: "_all", label: null, rows }];
  if (by === "owner") {
    const map = new Map<string, Group>();
    for (const i of rows) {
      const k = i.owner?.id ?? "_none";
      const label = i.owner?.name ?? "No owner";
      if (!map.has(k)) map.set(k, { key: k, label, rows: [] });
      map.get(k)!.rows.push(i);
    }
    return [...map.values()];
  }
  if (by === "status") {
    const map = new Map<string, Group>();
    for (const i of rows) {
      const k = i.status;
      if (!map.has(k)) map.set(k, { key: k, label: cap(k), rows: [] });
      map.get(k)!.rows.push(i);
    }
    return [...map.values()];
  }
  return [{ key: "_all", label: null, rows }];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTarget(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
