/**
 * Health glyphs used by the projects table + filter popover + insights
 * panel. Keep these in one place so the color/shape mapping never drifts.
 *
 *   onTrack  → green sparkline going up-right (#1ec27a)
 *   atRisk   → yellow triangle with exclamation (#f5b83d)
 *   offTrack → red sparkline going down (#f2453d)
 *   noUpdate → dashed grey circle (#6b7280)
 */

import clsx from "clsx";

export type HealthValue = "onTrack" | "atRisk" | "offTrack" | "noUpdate";

const COLORS: Record<HealthValue, string> = {
  onTrack: "#1ec27a",
  atRisk: "#f5b83d",
  offTrack: "#f2453d",
  noUpdate: "#6b7280",
};

const LABELS: Record<HealthValue, string> = {
  onTrack: "On track",
  atRisk: "At risk",
  offTrack: "Off track",
  noUpdate: "No update",
};

export function healthLabel(h: HealthValue): string {
  return LABELS[h];
}

export function healthColor(h: HealthValue): string {
  return COLORS[h];
}

export function HealthIconSmall({ health }: { health: HealthValue }) {
  const color = COLORS[health];
  if (health === "onTrack") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 9 L5 6 L7 8 L10 4"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (health === "atRisk") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2 L11 10 L1 10 Z"
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M6 5 L6 7.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="6" cy="9" r="0.6" fill={color} />
      </svg>
    );
  }
  if (health === "offTrack") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 4 L5 7 L7 5 L10 8"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // noUpdate — dashed empty circle
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle
        cx="6"
        cy="6"
        r="4.5"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

export function HealthBadgeInline({
  health,
  at,
  className,
}: {
  health: HealthValue | null;
  at?: string | null;
  className?: string;
}) {
  if (!health) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 text-text-tertiary",
          className,
        )}
      >
        <HealthIconSmall health="noUpdate" />
        No updates
      </span>
    );
  }
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5", className)}
      style={{ color: COLORS[health] }}
    >
      <HealthIconSmall health={health} />
      <span>{LABELS[health]}</span>
      {at && <span className="text-text-tertiary">· {relTimeShort(at)}</span>}
    </span>
  );
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
