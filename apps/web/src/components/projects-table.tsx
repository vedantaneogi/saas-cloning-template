"use client";

import Link from "next/link";
import { Box, Calendar, Diamond } from "lucide-react";
import type { Project } from "@/lib/api";

export type ProjectGroup = {
  key: string;
  label: string;
  projects: Project[];
};

export function ProjectsTable({
  groups,
  workspace,
  showGroupHeaders,
}: {
  groups: ProjectGroup[];
  workspace: string;
  showGroupHeaders: boolean;
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
}: {
  group: ProjectGroup;
  workspace: string;
  showHeader: boolean;
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
        <ProjectRow key={p.id} project={p} workspace={workspace} />
      ))}
    </>
  );
}

function ProjectRow({ project: p, workspace }: { project: Project; workspace: string }) {
  const pct = p.issue_count > 0 ? Math.round((p.completed_issue_count / p.issue_count) * 100) : 0;
  return (
    <tr className="hover:bg-row-hover">
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
      <td className="px-3 py-3">
        <HealthCell health={p.health ?? null} at={p.health_updated_at ?? null} />
      </td>
      <td className="px-3 py-3 text-text-tertiary">—</td>
      <td className="px-3 py-3">
        {p.lead ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-pill text-micro font-medium text-white"
            style={{ background: p.lead.color }}
            title={p.lead.name}
          >
            {p.lead.initials}
          </span>
        ) : (
          <span className="inline-block h-5 w-5 rounded-pill border border-dashed border-border-strong" />
        )}
      </td>
      <td className="px-3 py-3 text-mini text-text-tertiary">
        {p.target_date ? (
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} className="text-text-tertiary" />
            {fmtDate(p.target_date)}
          </span>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-dashed border-border-strong">
            <Calendar size={10} />
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-text-secondary">{p.issue_count}</td>
      <td className="px-4 py-3">
        <StatusPill pct={pct} />
      </td>
    </tr>
  );
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

function HealthCell({ health, at }: { health: string | null; at: string | null }) {
  if (!health) {
    return (
      <span className="inline-flex items-center gap-1.5 text-mini text-text-tertiary">
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
    <span className={"inline-flex items-center gap-1.5 text-mini " + tone}>
      <HealthGlyph health={health} />
      <span>{label}</span>
      {at && <span className="text-text-tertiary">· {relTimeShort(at)}</span>}
    </span>
  );
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

function StatusPill({ pct }: { pct: number }) {
  const isDone = pct >= 100;
  const color = isDone ? "#22c55e" : "#5e6ad2";
  const circumference = 2 * Math.PI * 6;
  const offset = circumference * (1 - pct / 100);
  return (
    <span className="inline-flex items-center gap-1 text-mini text-text-secondary">
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
      {pct}%
    </span>
  );
}

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
