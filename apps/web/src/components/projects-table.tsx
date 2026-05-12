"use client";

import Link from "next/link";
import { Diamond } from "lucide-react";
import { ProjectIconBlock } from "@/components/project-icons";
import { relTime } from "@/lib/time";
import type { Project } from "@/lib/api";

export function ProjectsTable({ projects, workspace }: { projects: Project[]; workspace: string }) {
  if (projects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
        No projects yet.
      </div>
    );
  }
  return (
    <table className="w-full text-small">
      <thead>
        <tr className="text-mini font-medium uppercase tracking-wider text-text-tertiary">
          <th className="px-4 py-2 text-left font-medium">Name</th>
          <th className="px-2 py-2 text-left font-medium">Health</th>
          <th className="px-2 py-2 text-left font-medium">Priority</th>
          <th className="px-2 py-2 text-left font-medium">Lead</th>
          <th className="px-2 py-2 text-left font-medium">Target date</th>
          <th className="px-2 py-2 text-left font-medium">Issues</th>
          <th className="px-4 py-2 text-left font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} workspace={workspace} />
        ))}
      </tbody>
    </table>
  );
}

function ProjectRow({ project: p, workspace }: { project: Project; workspace: string }) {
  const pct = p.issue_count > 0 ? Math.round((p.completed_issue_count / p.issue_count) * 100) : 0;
  return (
    <tr className="border-b border-border-subtle hover:bg-row-hover">
      <td className="px-4 py-2">
        <Link href={`/${workspace}/project/${p.slug_id}`} className="flex items-center gap-2">
          <ProjectIconBlock color={p.icon_color} size={18} />
          <span className="font-medium text-text-primary">{p.name}</span>
          {p.next_milestone && (
            <span className="ml-2 flex items-center gap-1 text-mini text-text-tertiary">
              <Diamond size={9} className="text-priority-medium" fill="currentColor" />
              <span className="text-text-secondary">{p.next_milestone.name}</span>
              {p.next_milestone.target_date && (
                <span>
                  {new Date(p.next_milestone.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </span>
          )}
        </Link>
      </td>
      <td className="px-2 py-2">
        <HealthCell health={p.health ?? null} at={p.health_updated_at ?? null} />
      </td>
      <td className="px-2 py-2 text-text-tertiary">—</td>
      <td className="px-2 py-2">
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
      <td className="px-2 py-2 text-mini text-text-tertiary">
        {p.target_date
          ? new Date(p.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "—"}
      </td>
      <td className="px-2 py-2 text-text-secondary">{p.issue_count}</td>
      <td className="px-4 py-2">
        <StatusPill pct={pct} />
      </td>
    </tr>
  );
}

function HealthCell({ health, at }: { health: string | null; at: string | null }) {
  if (!health) return <span className="text-mini text-text-tertiary">No updates</span>;
  const tone =
    health === "onTrack"
      ? "text-status-done"
      : health === "atRisk"
        ? "text-priority-high"
        : "text-priority-urgent";
  const label = health === "onTrack" ? "On track" : health === "atRisk" ? "At risk" : "Off track";
  return (
    <span className={"inline-flex items-center gap-1 text-mini " + tone}>
      <span className="inline-block h-2 w-2 rounded-pill" style={{ background: "currentColor" }} />
      <span>{label}</span>
      {at && <span className="text-text-tertiary">· {relTime(at)}</span>}
    </span>
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
