import type { ProjectState, UpdateHealth } from "@/lib/api";
import type { SVGProps } from "react";

const STATE_COLORS: Record<ProjectState, string> = {
  planned: "#95a2b3",
  started: "#f2c94c",
  paused: "#9b9b9b",
  completed: "#5e6ad2",
  canceled: "#95a2b3",
};

const STATE_LABEL: Record<ProjectState, string> = {
  planned: "Planned",
  started: "In Progress",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
};

const HEALTH_COLORS: Record<UpdateHealth, string> = {
  onTrack: "#22c55e",
  atRisk: "#f59e0b",
  offTrack: "#ef4444",
};

const HEALTH_LABEL: Record<UpdateHealth, string> = {
  onTrack: "On track",
  atRisk: "At risk",
  offTrack: "Off track",
};

export function ProjectStateIcon({ state, ...rest }: { state: ProjectState } & SVGProps<SVGSVGElement>) {
  const color = STATE_COLORS[state];
  if (state === "completed") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" {...rest}>
        <circle cx="7" cy="7" r="6" fill={color} />
        <path d="M4.3 7.2L6.1 9l3.6-4" stroke="#0f0f11" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (state === "started") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
        <path d="M7 2.5a4.5 4.5 0 010 9z" fill={color} />
      </svg>
    );
  }
  if (state === "canceled") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" {...rest}>
        <circle cx="7" cy="7" r="6" fill={color} />
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#0f0f11" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === "paused") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
        <rect x="5.2" y="4.5" width="1.3" height="5" fill={color} />
        <rect x="7.5" y="4.5" width="1.3" height="5" fill={color} />
      </svg>
    );
  }
  // planned
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" strokeDasharray="2.2 2.2" />
    </svg>
  );
}

export function ProjectStateLabel({ state }: { state: ProjectState }) {
  return <span>{STATE_LABEL[state]}</span>;
}

export function HealthBadge({ health }: { health: UpdateHealth }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-pill px-2 py-0.5 text-mini text-text-secondary">
      <span className="h-1.5 w-1.5 rounded-pill" style={{ background: HEALTH_COLORS[health] }} />
      {HEALTH_LABEL[health]}
    </span>
  );
}

export function ProjectIconBlock({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-sm"
      style={{ width: size, height: size, background: color }}
    />
  );
}

export { STATE_LABEL as PROJECT_STATE_LABELS, STATE_COLORS as PROJECT_STATE_COLORS };
