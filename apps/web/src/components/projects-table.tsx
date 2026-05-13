"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Box, Calendar, Check, Diamond, X } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverList, PopoverItem } from "@/components/popover";
import { createProjectUpdate, patchProject } from "@/lib/api";
import type { Member, Project, ProjectState, UpdateHealth } from "@/lib/api";

export type ProjectGroup = {
  key: string;
  label: string;
  projects: Project[];
};

const STATE_OPTIONS: { value: ProjectState; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "started", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const HEALTH_OPTIONS: { value: UpdateHealth; label: string }[] = [
  { value: "onTrack", label: "On track" },
  { value: "atRisk", label: "At risk" },
  { value: "offTrack", label: "Off track" },
];

export function ProjectsTable({
  groups,
  workspace,
  showGroupHeaders,
  members,
}: {
  groups: ProjectGroup[];
  workspace: string;
  showGroupHeaders: boolean;
  members: Member[];
}) {
  const hasAny = groups.some((g) => g.projects.length > 0);
  if (!hasAny) return null;
  return (
    <table className="w-full text-small">
      <thead>
        <tr className="text-mini font-normal text-text-tertiary">
          <th className="px-4 py-2.5 text-left font-normal">Name</th>
          <th className="w-[150px] px-3 py-2.5 text-left font-normal">Health</th>
          <th className="w-[80px] px-3 py-2.5 text-left font-normal">Priority</th>
          <th className="w-[80px] px-3 py-2.5 text-left font-normal">Lead</th>
          <th className="w-[120px] px-3 py-2.5 text-left font-normal">Target date</th>
          <th className="w-[70px] px-3 py-2.5 text-left font-normal">Issues</th>
          <th className="w-[100px] px-4 py-2.5 text-left font-normal">Status</th>
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
}: {
  group: ProjectGroup;
  workspace: string;
  showHeader: boolean;
  members: Member[];
}) {
  return (
    <>
      {showHeader && (
        <tr className="bg-elevated">
          <td colSpan={7} className="px-4 py-2 text-mini text-text-tertiary">
            <span className="font-medium text-text-secondary">{group.label || "—"}</span>{" "}
            <span>{group.projects.length}</span>
          </td>
        </tr>
      )}
      {group.projects.map((p) => (
        <ProjectRow key={p.id} project={p} workspace={workspace} members={members} />
      ))}
    </>
  );
}

function ProjectRow({
  project: p,
  workspace,
  members,
}: {
  project: Project;
  workspace: string;
  members: Member[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pct = p.issue_count > 0 ? Math.round((p.completed_issue_count / p.issue_count) * 100) : 0;

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
          {p.next_milestone && (
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

      <CellTd className="text-text-tertiary">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-text-quaternary">—</span>
      </CellTd>

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

      <CellTd>
        <DatePicker
          value={p.target_date}
          onSet={(iso) => mutate(() => patchProject(workspace, p.slug_id, { target_date: iso }))}
          onClear={() => mutate(() => patchProject(workspace, p.slug_id, { clear_target_date: true }))}
        />
      </CellTd>

      <CellTd className="text-text-secondary">{p.issue_count}</CellTd>

      <CellTd>
        <StatePicker
          state={p.state}
          pct={pct}
          onChange={(s) => mutate(() => patchProject(workspace, p.slug_id, { state: s }))}
        />
      </CellTd>
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
  if (!health) {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
        <span className="inline-block h-2 w-2 rounded-pill border border-dashed border-border-strong" />
        No updates
      </span>
    );
  }
  const tone =
    health === "onTrack"
      ? "text-status-done"
      : health === "atRisk"
        ? "text-priority-high"
        : "text-priority-urgent";
  const label = health === "onTrack" ? "On track" : health === "atRisk" ? "At risk" : "Off track";
  return (
    <span className={"inline-flex items-center gap-1.5 " + tone}>
      <HealthGlyph health={health} />
      <span>{label}</span>
      {at && <span className="text-text-tertiary">· {relTimeShort(at)}</span>}
    </span>
  );
}

function HealthDot({ health }: { health: UpdateHealth }) {
  const color =
    health === "onTrack" ? "#22c55e" : health === "atRisk" ? "#d9b34c" : "#f2453d";
  return <span className="inline-block h-2 w-2 rounded-pill" style={{ background: color }} />;
}

function HealthGlyph({ health }: { health: string }) {
  if (health === "onTrack") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M2 9 L5 6 L7 8 L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (health === "atRisk") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M6 2 L11 10 L1 10 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6 5 L6 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="6" cy="9" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 4 L5 7 L7 5 L10 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
            defaultValue={value ?? ""}
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
  pct,
  onChange,
}: {
  state: ProjectState;
  pct: number;
  onChange: (s: ProjectState) => void;
}) {
  const color = state === "completed" ? "#22c55e" : state === "canceled" ? "#6b6f76" : "#5e6ad2";
  return (
    <Popover
      align="end"
      width={180}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="-mx-1.5 -my-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-mini text-text-secondary hover:bg-elevated-hover"
        >
          <StateRing color={color} pct={pct} />
          <span>{pct}%</span>
        </button>
      )}
    >
      {({ close }) => (
        <PopoverList>
          {STATE_OPTIONS.map((s) => (
            <PopoverItem
              key={s.value}
              active={state === s.value}
              onClick={() => {
                onChange(s.value);
                close();
              }}
            >
              <StateRing
                color={
                  s.value === "completed" ? "#22c55e" : s.value === "canceled" ? "#6b6f76" : "#5e6ad2"
                }
                pct={s.value === "completed" ? 100 : s.value === "canceled" ? 0 : 50}
              />
              <span>{s.label}</span>
            </PopoverItem>
          ))}
        </PopoverList>
      )}
    </Popover>
  );
}

function StateRing({ color, pct }: { color: string; pct: number }) {
  const circumference = 2 * Math.PI * 6;
  const offset = circumference * (1 - pct / 100);
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
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

function relTimeShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return d + "d";
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return h + "h";
  const m = Math.max(1, Math.floor(diff / 60000));
  return m + "m";
}
