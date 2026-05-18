"use client";

import { useMemo } from "react";
import type { Cycle } from "@/lib/api";

const DAY_MS = 86_400_000;

/**
 * Compact cycle burndown that mounts under the active cycle row. Linear
 * shows three things here: the chart strip (with weekend bars hatched),
 * an x-axis with start/mid/end date labels, and a right-side legend
 * with Scope / Started / Completed counts.
 *
 * With no issues to plot, the lines collapse to zero — the strip still
 * renders so the row has the right vertical rhythm and the cycle's
 * date span is visible.
 */
export function CycleBurndown({ cycle }: { cycle: Cycle }) {
  const data = useMemo(() => computeChart(cycle), [cycle]);

  const startedPct = cycle.issue_count > 0
    ? Math.round((cycle.completed_issue_count / cycle.issue_count) * 100)
    : 0;

  return (
    <div className="grid grid-cols-[1fr_240px] gap-8 px-4 pb-6 pt-2">
      <Chart data={data} />
      <ul className="space-y-1.5 self-start pt-4 text-mini">
        <Legend swatchClass="bg-text-quaternary" label="Scope" value={cycle.issue_count.toString()} />
        <Legend swatchClass="bg-amber-400" label="Started" value={`${cycle.issue_count - cycle.completed_issue_count}`} pct={cycle.issue_count > 0 ? `${100 - startedPct}%` : "0%"} />
        <Legend swatchClass="bg-accent" label="Completed" value={cycle.completed_issue_count.toString()} pct={`${startedPct}%`} />
      </ul>
    </div>
  );
}

interface ChartShape {
  days: number;
  weekendRanges: Array<{ start: number; end: number }>;
  labels: Array<{ pct: number; label: string }>;
  // Scope line: flat at 100% of issue_count for the whole range (the
  // expected ideal would be a falling line, but Linear shows the actual
  // count line too).
  scopePct: number;
  // Burndown line: percentage of scope completed at each day.
  todayPct: number;
}

function computeChart(cycle: Cycle): ChartShape {
  const start = new Date(cycle.starts_at).getTime();
  const end = new Date(cycle.ends_at).getTime();
  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
  const now = Date.now();
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((now - start) / DAY_MS)));

  // Weekend bars: hatched verticals over Saturday/Sunday spans.
  const weekendRanges: ChartShape["weekendRanges"] = [];
  for (let d = 0; d < totalDays; d++) {
    const day = new Date(start + d * DAY_MS).getDay();
    if (day === 6 || day === 0) {
      // Merge consecutive weekend days into one span.
      const last = weekendRanges[weekendRanges.length - 1];
      if (last && last.end === d) {
        last.end = d + 1;
      } else {
        weekendRanges.push({ start: d, end: d + 1 });
      }
    }
  }

  // Three labels: start, mid, end.
  const midTime = start + (end - start) / 2;
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const labels = [
    { pct: 0, label: fmt(start) },
    { pct: 50, label: fmt(midTime) },
    { pct: 100, label: fmt(end) },
  ];

  return {
    days: totalDays,
    weekendRanges,
    labels,
    scopePct: cycle.issue_count > 0 ? 100 : 0,
    todayPct: (elapsedDays / totalDays) * 100,
  };
}

function Chart({ data }: { data: ChartShape }) {
  const pctW = (range: { start: number; end: number }) =>
    ((range.end - range.start) / data.days) * 100;
  const pctL = (start: number) => (start / data.days) * 100;

  return (
    <div>
      <div className="relative h-[140px] w-full">
        {/* Hatched weekend ranges */}
        {data.weekendRanges.map((r, i) => (
          <div
            key={i}
            className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,_rgba(255,255,255,0.04)_0,_rgba(255,255,255,0.04)_3px,_transparent_3px,_transparent_8px)]"
            style={{ left: `${pctL(r.start)}%`, width: `${pctW(r.end - r.start === 0 ? { start: 0, end: 1 } : r)}%` }}
          />
        ))}
        {/* Today marker — accent dot at the bottom rail */}
        {data.todayPct > 0 && data.todayPct < 100 && (
          <span
            className="absolute bottom-[-4px] z-10 h-[8px] w-[8px] -translate-x-1/2 rounded-pill bg-accent"
            style={{ left: `${data.todayPct}%` }}
          />
        )}
        {/* Baseline */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-strong" />
        {/* Scope line — top edge, dashed when scope is zero */}
        <div
          className={
            data.scopePct > 0
              ? "absolute inset-x-0 top-0 h-px bg-text-quaternary"
              : "absolute inset-x-0 top-0 h-px bg-text-quaternary opacity-30"
          }
        />
      </div>
      <div className="mt-1 flex justify-between text-mini text-text-tertiary">
        {data.labels.map((l) => (
          <span key={l.label}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}

function Legend({
  swatchClass,
  label,
  value,
  pct,
}: {
  swatchClass: string;
  label: string;
  value: string;
  pct?: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${swatchClass}`} />
      <span className="flex-1 text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
      {pct && <span className="text-text-tertiary">·</span>}
      {pct && <span className="text-text-tertiary">{pct}</span>}
    </li>
  );
}
