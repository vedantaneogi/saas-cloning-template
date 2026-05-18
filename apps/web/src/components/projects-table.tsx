"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Box, Calendar, Check, Diamond, X } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverList, PopoverItem } from "@/components/popover";
import { PriorityIcon } from "@/components/icons";
import { HealthBadgeInline, type HealthValue } from "@/components/health-icon";
import { createProjectUpdate, patchProject } from "@/lib/api";
import type { Member, Project, ProjectState, UpdateHealth } from "@/lib/api";
import type { ProjectsPrefs } from "@/lib/projects-prefs";

export type ProjectGroup = {
  key: string;
  label: string;
  projects: Project[];
};

// Default column visibility used when toolbar doesn't pass prefs (e.g.
// the per-team projects page, which keeps its own simpler layout).
const DEFAULT_VIS = {
  show_priority: true,
  show_status: true,
  show_health: true,
  show_lead: true,
  show_target_date: true,
  show_start_date: false,
  show_issues: true,
  show_teams: false,
  show_members: false,
  show_milestones: true,
  show_created: false,
  show_updated: false,
  show_completed: false,
} as const;

const STATE_META: Record<ProjectState, { label: string; color: string; pct: number }> = {
  planned: { label: "Planned", color: "#6b6f76", pct: 0 },
  started: { label: "In Progress", color: "#facc15", pct: 35 },
  paused: { label: "Paused", color: "#d9b34c", pct: 50 },
  completed: { label: "Completed", color: "#22c55e", pct: 100 },
  canceled: { label: "Canceled", color: "#6b6f76", pct: 100 },
};

const STATE_OPTIONS: ProjectState[] = ["planned", "started", "paused", "completed", "canceled"];

const HEALTH_OPTIONS: { value: UpdateHealth; label: string }[] = [
  { value: "onTrack", label: "On track" },
  { value: "atRisk", label: "At risk" },
  { value: "offTrack", label: "Off track" },
];

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

export function ProjectsTable({
  groups,
  workspace,
  showGroupHeaders,
  members,
  prefs,
}: {
  groups: ProjectGroup[];
  workspace: string;
  showGroupHeaders: boolean;
  members: Member[];
  prefs?: ProjectsPrefs;
}) {
  const hasAny = groups.some((g) => g.projects.length > 0);
  if (!hasAny) return null;
  const vis = prefs ?? DEFAULT_VIS;
  const colCount =
    1 +
    Number(vis.show_health ?? true) +
    Number(vis.show_priority ?? true) +
    Number(vis.show_lead ?? true) +
    Number(vis.show_target_date ?? true) +
    Number(vis.show_start_date ?? false) +
    Number(vis.show_issues ?? true) +
    Number(vis.show_status ?? true) +
    Number(vis.show_teams ?? false) +
    Number(vis.show_members ?? false) +
    Number(vis.show_created ?? false) +
    Number(vis.show_updated ?? false);
  return (
    <table className="w-full text-small">
      <thead>
        <tr className="text-mini font-normal text-text-tertiary">
          <th className="px-4 py-2.5 text-left font-normal">Name</th>
          {vis.show_health && <th className="w-[150px] px-3 py-2.5 text-left font-normal">Health</th>}
          {vis.show_priority && <th className="w-[80px] px-3 py-2.5 text-left font-normal">Priority</th>}
          {vis.show_lead && <th className="w-[80px] px-3 py-2.5 text-left font-normal">Lead</th>}
          {vis.show_start_date && <th className="w-[110px] px-3 py-2.5 text-left font-normal">Start date</th>}
          {vis.show_target_date && <th className="w-[120px] px-3 py-2.5 text-left font-normal">Target date</th>}
          {vis.show_teams && <th className="w-[120px] px-3 py-2.5 text-left font-normal">Teams</th>}
          {vis.show_members && <th className="w-[120px] px-3 py-2.5 text-left font-normal">Members</th>}
          {vis.show_issues && <th className="w-[70px] px-3 py-2.5 text-left font-normal">Issues</th>}
          {vis.show_created && <th className="w-[110px] px-3 py-2.5 text-left font-normal">Created</th>}
          {vis.show_updated && <th className="w-[110px] px-3 py-2.5 text-left font-normal">Updated</th>}
          {vis.show_status && <th className="w-[140px] px-4 py-2.5 text-left font-normal">Status</th>}
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <ProjectGroupBlock
            key={g.key}
            group={g}
            workspace={workspace}
            showHeader={showGroupHeaders}
            members={members}
            vis={vis}
            colCount={colCount}
          />
        ))}
      </tbody>
    </table>
  );
}

function ProjectGroupBlock({
  group,
  workspace,
  showHeader,
  members,
  vis,
  colCount,
}: {
  group: ProjectGroup;
  workspace: string;
  showHeader: boolean;
  members: Member[];
  vis: ProjectsPrefs | typeof DEFAULT_VIS;
  colCount: number;
}) {
  return (
    <>
      {showHeader && (
        <tr className="bg-elevated">
          <td colSpan={colCount} className="px-4 py-2 text-mini text-text-tertiary">
            <span className="font-medium text-text-secondary">{group.label || "—"}</span>{" "}
            <span>{group.projects.length}</span>
          </td>
        </tr>
      )}
      {group.projects.map((p) => (
        <ProjectRow key={p.id} project={p} workspace={workspace} members={members} vis={vis} />
      ))}
    </>
  );
}

function ProjectRow({
  project: p,
  workspace,
  members,
  vis,
}: {
  project: Project;
  workspace: string;
  members: Member[];
  vis: ProjectsPrefs | typeof DEFAULT_VIS;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const issuePct =
    p.issue_count > 0 ? Math.round((p.completed_issue_count / p.issue_count) * 100) : 0;

  function mutate(fn: () => Promise<unknown>) {
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <tr className={clsx("group hover:bg-row-hover", pending && "opacity-60")}>
      <td className="px-4 py-3">
        <Link href={`/${workspace}/project/${p.slug_id}`} className="flex items-center gap-2">
          <ProjectGlyph color={p.icon_color} />
          <span className="font-medium text-text-primary">{p.name}</span>
          {vis.show_milestones && p.next_milestone && (
            <span className="ml-2 flex items-center gap-1 text-mini text-text-tertiary">
              <Diamond size={9} className="text-priority-medium" fill="currentColor" />
              <span className="text-text-secondary">{p.next_milestone.name}</span>
              {p.next_milestone.target_date && (
                <span>{fmtDate(p.next_milestone.target_date)}</span>
              )}
            </span>
          )}
        </Link>
      </td>

      {vis.show_health && (
        <CellTd>
          <HealthPicker
            health={p.health ?? null}
            at={p.health_updated_at ?? null}
            onChange={(h) =>
              mutate(() =>
                createProjectUpdate(workspace, p.slug_id, { body: "", health: h }),
              )
            }
          />
        </CellTd>
      )}

      {vis.show_priority && (
        <CellTd>
          <PriorityPicker
            value={p.priority ?? 0}
            onChange={(pr) => mutate(() => patchProject(workspace, p.slug_id, { priority: pr }))}
          />
        </CellTd>
      )}

      {vis.show_lead && (
        <CellTd>
          <LeadPicker
            lead={p.lead}
            members={members}
            onSelect={(memberId) =>
              mutate(() => patchProject(workspace, p.slug_id, { lead_id: memberId }))
            }
            onClear={() => mutate(() => patchProject(workspace, p.slug_id, { clear_lead: true }))}
          />
        </CellTd>
      )}

      {vis.show_start_date && (
        <CellTd className="text-text-tertiary text-mini">
          {p.start_date ? fmtDate(p.start_date) : <span className="text-text-quaternary">—</span>}
        </CellTd>
      )}

      {vis.show_target_date && (
        <CellTd>
          <DatePicker
            value={p.target_date}
            onSet={(iso) => mutate(() => patchProject(workspace, p.slug_id, { target_date: iso }))}
            onClear={() => mutate(() => patchProject(workspace, p.slug_id, { clear_target_date: true }))}
          />
        </CellTd>
      )}

      {vis.show_teams && (
        <CellTd className="text-mini text-text-secondary">
          {(p.team_keys ?? []).length > 0 ? (p.team_keys ?? []).join(", ") : (
            <span className="text-text-quaternary">—</span>
          )}
        </CellTd>
      )}

      {vis.show_members && (
        <CellTd className="text-mini text-text-secondary">
          {p.lead?.name ?? <span className="text-text-quaternary">—</span>}
        </CellTd>
      )}

      {vis.show_issues && <CellTd className="text-text-secondary">{p.issue_count}</CellTd>}

      {vis.show_created && (
        <CellTd className="text-mini text-text-tertiary">
          {p.created_at ? fmtDate(p.created_at) : <span className="text-text-quaternary">—</span>}
        </CellTd>
      )}

      {vis.show_updated && (
        <CellTd className="text-mini text-text-tertiary">
          {p.health_updated_at ? fmtDate(p.health_updated_at) : <span className="text-text-quaternary">—</span>}
        </CellTd>
      )}

      {vis.show_status && (
        <CellTd>
          <StatePicker
            state={p.state}
            issuePct={issuePct}
            onChange={(s) => mutate(() => patchProject(workspace, p.slug_id, { state: s }))}
          />
        </CellTd>
      )}
    </tr>
  );
}

function CellTd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("px-3 py-2", className)}>{children}</td>;
}

function ProjectGlyph({ color }: { color: string }) {
  return (
    <span
      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm"
      style={{ color }}
    >
      <Box size={15} strokeWidth={1.75} />
    </span>
  );
}

// --- Health -----------------------------------------------------------------

function HealthPicker({
  health,
  at,
  onChange,
}: {
  health: string | null;
  at: string | null;
  onChange: (h: UpdateHealth) => void;
}) {
  return (
    <Popover
      align="start"
      width={200}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="-mx-1.5 -my-0.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-mini hover:bg-elevated-hover"
        >
          <HealthBadge health={health} at={at} />
        </button>
      )}
    >
      {({ close }) => (
        <PopoverList>
          {HEALTH_OPTIONS.map((h) => (
            <PopoverItem
              key={h.value}
              active={health === h.value}
              onClick={() => {
                onChange(h.value);
                close();
              }}
            >
              <HealthDot health={h.value} />
              <span>{h.label}</span>
            </PopoverItem>
          ))}
        </PopoverList>
      )}
    </Popover>
  );
}

function HealthBadge({ health, at }: { health: string | null; at: string | null }) {
  return (
    <HealthBadgeInline
      health={(health as HealthValue | null) ?? null}
      at={at}
    />
  );
}

function HealthDot({ health }: { health: UpdateHealth }) {
  const color =
    health === "onTrack" ? "#1ec27a" : health === "atRisk" ? "#f5b83d" : "#f2453d";
  return <span className="inline-block h-2 w-2 rounded-pill" style={{ background: color }} />;
}


// --- Priority ---------------------------------------------------------------

function PriorityPicker({
  value,
  onChange,
}: {
  value: 0 | 1 | 2 | 3 | 4;
  onChange: (p: 0 | 1 | 2 | 3 | 4) => void;
}) {
  return (
    <Popover
      align="start"
      width={180}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="-mx-1 -my-0.5 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-mini text-text-secondary hover:bg-elevated-hover"
          aria-label={`Priority ${PRIORITY_LABELS[value]}`}
        >
          <PriorityIcon value={value} />
          {value !== 0 && <span>{PRIORITY_LABELS[value]}</span>}
        </button>
      )}
    >
      {({ close }) => (
        <PopoverList>
          {[1, 2, 3, 4, 0].map((p) => (
            <PopoverItem
              key={p}
              active={value === p}
              onClick={() => {
                onChange(p as 0 | 1 | 2 | 3 | 4);
                close();
              }}
            >
              <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />
              <span>{PRIORITY_LABELS[p]}</span>
            </PopoverItem>
          ))}
        </PopoverList>
      )}
    </Popover>
  );
}

// --- Lead -------------------------------------------------------------------

function LeadPicker({
  lead,
  members,
  onSelect,
  onClear,
}: {
  lead: Member | null;
  members: Member[];
  onSelect: (memberId: string) => void;
  onClear: () => void;
}) {
  return (
    <Popover
      align="start"
      width={220}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center rounded-md p-0.5 hover:bg-elevated-hover"
          aria-label={lead ? `Lead ${lead.name}` : "Set lead"}
        >
          {lead ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-pill text-micro font-medium text-white"
              style={{ background: lead.color }}
              title={lead.name}
            >
              {lead.initials}
            </span>
          ) : (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-pill border border-dashed border-border-strong text-text-tertiary">
              <Check size={9} className="opacity-0" />
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <PopoverList>
          {members.map((m) => (
            <PopoverItem
              key={m.id}
              active={lead?.id === m.id}
              onClick={() => {
                onSelect(m.id);
                close();
              }}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-pill text-micro font-medium text-white"
                style={{ background: m.color }}
              >
                {m.initials}
              </span>
              <span className="flex-1 truncate">{m.name}</span>
              {lead?.id === m.id && <Check size={12} className="text-text-secondary" />}
            </PopoverItem>
          ))}
          {lead && (
            <PopoverItem
              onClick={() => {
                onClear();
                close();
              }}
            >
              <X size={12} className="text-text-tertiary" />
              <span>No lead</span>
            </PopoverItem>
          )}
        </PopoverList>
      )}
    </Popover>
  );
}

// --- Date -------------------------------------------------------------------

function DatePicker({
  value,
  onSet,
  onClear,
}: {
  value: string | null;
  onSet: (iso: string) => void;
  onClear: () => void;
}) {
  return (
    <Popover
      align="start"
      width={220}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="-mx-1.5 -my-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-mini text-text-tertiary hover:bg-elevated-hover"
        >
          {value ? (
            <>
              <Calendar size={11} />
              <span>{fmtDate(value)}</span>
            </>
          ) : (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-dashed border-border-strong">
              <Calendar size={10} />
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div className="p-2 text-small">
          <input
            type="date"
            defaultValue={value ? value.slice(0, 10) : ""}
            onChange={(e) => {
              if (e.target.value) {
                onSet(e.target.value);
                close();
              }
            }}
            className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 text-text-primary outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onClear();
                close();
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            >
              <X size={12} />
              Remove target date
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

// --- State (status ring + label) -------------------------------------------

function StatePicker({
  state,
  issuePct,
  onChange,
}: {
  state: ProjectState;
  issuePct: number;
  onChange: (s: ProjectState) => void;
}) {
  const meta = STATE_META[state];
  return (
    <Popover
      align="end"
      width={200}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="-mx-1.5 -my-0.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-mini text-text-secondary hover:bg-elevated-hover"
        >
          <StateRing color={meta.color} pct={state === "completed" ? 100 : issuePct} state={state} />
          <span>{meta.label}</span>
        </button>
      )}
    >
      {({ close }) => (
        <PopoverList>
          {STATE_OPTIONS.map((s) => (
            <PopoverItem
              key={s}
              active={state === s}
              onClick={() => {
                onChange(s);
                close();
              }}
            >
              <StateRing
                color={STATE_META[s].color}
                pct={STATE_META[s].pct}
                state={s}
              />
              <span>{STATE_META[s].label}</span>
            </PopoverItem>
          ))}
        </PopoverList>
      )}
    </Popover>
  );
}

function StateRing({ color, pct, state }: { color: string; pct: number; state: ProjectState }) {
  // Canceled: dashed empty circle.
  if (state === "canceled") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="2 2" />
        <path d="M5 5 L11 11 M11 5 L5 11" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  // Completed: filled circle with check.
  if (state === "completed") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
        <circle cx="8" cy="8" r="6" fill={color} />
        <path d="M5.5 8.2 L7.2 9.8 L10.5 6.5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Paused: filled circle with two bars.
  if (state === "paused") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" />
        <rect x="6" y="5.5" width="1.4" height="5" rx="0.4" fill={color} />
        <rect x="8.6" y="5.5" width="1.4" height="5" rx="0.4" fill={color} />
      </svg>
    );
  }
  // Started / Planned: ring with arc proportional to progress.
  const circumference = 2 * Math.PI * 6;
  const offset = circumference * (1 - pct / 100);
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      {pct > 0 && (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
        />
      )}
    </svg>
  );
}

// --- helpers ----------------------------------------------------------------

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${ordinal(d.getDate())}`;
}

