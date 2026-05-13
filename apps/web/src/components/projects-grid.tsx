"use client";

import Link from "next/link";
import { Box, Calendar, Diamond } from "lucide-react";
import { relTime } from "@/lib/time";
import type { Project } from "@/lib/api";

export function ProjectsGrid({ projects, workspace }: { projects: Project[]; workspace: string }) {
  if (projects.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} workspace={workspace} />
      ))}
    </div>
  );
}

function ProjectCard({ project: p, workspace }: { project: Project; workspace: string }) {
  const pct = p.issue_count > 0 ? Math.round((p.completed_issue_count / p.issue_count) * 100) : 0;
  return (
    <Link
      href={`/${workspace}/project/${p.slug_id}`}
      className="flex flex-col gap-3 rounded-md bg-elevated p-4 hover:bg-elevated-hover"
    >
      <header className="flex items-start gap-2">
        <span
          className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm"
          style={{ color: p.icon_color }}
        >
          <Box size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-text-primary">{p.name}</div>
          {p.description && (
            <div className="mt-0.5 line-clamp-2 text-mini text-text-tertiary">{p.description}</div>
          )}
        </div>
      </header>

      <div className="flex items-center gap-3 text-mini text-text-tertiary">
        <HealthDot health={p.health ?? null} />
        {p.target_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} /> {fmtDate(p.target_date)}
          </span>
        )}
        {p.next_milestone && (
          <span className="inline-flex items-center gap-1">
            <Diamond size={9} className="text-priority-medium" fill="currentColor" />
            <span className="text-text-secondary">{p.next_milestone.name}</span>
          </span>
        )}
      </div>

      <footer className="flex items-center gap-3 text-mini">
        <ProgressBar pct={pct} />
        <span className="shrink-0 text-text-secondary">{pct}%</span>
        <span className="shrink-0 text-text-tertiary">{p.completed_issue_count}/{p.issue_count}</span>
        <span className="ml-auto">
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
        </span>
      </footer>
    </Link>
  );
}

function HealthDot({ health }: { health: string | null }) {
  const tone =
    health === "onTrack"
      ? { color: "#22c55e", label: "On track" }
      : health === "atRisk"
        ? { color: "#d9b34c", label: "At risk" }
        : health === "offTrack"
          ? { color: "#f2453d", label: "Off track" }
          : { color: "transparent", label: "No update" };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-pill"
        style={{
          background: tone.color,
          border: tone.color === "transparent" ? "1px dashed var(--border-strong)" : undefined,
        }}
      />
      <span style={{ color: tone.color !== "transparent" ? tone.color : undefined }}>{tone.label}</span>
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <span className="inline-flex h-1 flex-1 overflow-hidden rounded-pill bg-pill">
      <span
        className="h-full rounded-pill bg-accent"
        style={{ width: `${pct}%` }}
      />
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

// Avoid unused-import warning for relTime — keep available for future use.
void relTime;
