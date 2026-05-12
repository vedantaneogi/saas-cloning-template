"use client";

import type { BurndownPoint, BurndownIdealPoint, ProjectCompletion } from "@/lib/api";

// Minimal SVG charts. No external libs — just enough to surface velocity,
// burndown, and completion-over-time on the existing detail pages.

const W = 480;
const H = 160;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scaleY(v: number, max: number) {
  if (max <= 0) return H - PAD_B;
  return PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
}

function scaleX(i: number, n: number) {
  if (n <= 1) return PAD_L;
  return PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
}

export function BurndownChart({ points, ideal }: { points: BurndownPoint[]; ideal: BurndownIdealPoint[] }) {
  if (points.length === 0) {
    return <div className="rounded-md border border-border-subtle p-6 text-mini text-text-tertiary">No data yet — burndown will populate as the cycle progresses.</div>;
  }
  const max = Math.max(1, ...points.map((p) => p.scope), ...ideal.map((p) => p.remaining));
  const remainingPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i, points.length)},${scaleY(p.remaining, max)}`).join(" ");
  const idealPath = ideal.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i, ideal.length)},${scaleY(p.remaining, max)}`).join(" ");
  return (
    <div className="rounded-md border border-border-subtle bg-elevated p-3">
      <div className="mb-2 flex items-center gap-3 text-mini text-text-tertiary">
        <Legend swatch="#5e6ad2" label="Remaining" />
        <Legend swatch="#9ca3af" label="Ideal" dashed />
        <span className="ml-auto">max scope {max}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full">
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.2" />
        <path d={idealPath} fill="none" stroke="#9ca3af" strokeDasharray="4 3" strokeWidth="1.5" />
        <path d={remainingPath} fill="none" stroke="#5e6ad2" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={p.date} cx={scaleX(i, points.length)} cy={scaleY(p.remaining, max)} r="2.2" fill="#5e6ad2" />
        ))}
        <text x={PAD_L} y={H - 4} fontSize="10" fill="currentColor" fillOpacity="0.6">{fmtDate(points[0].date)}</text>
        <text x={W - PAD_R} y={H - 4} fontSize="10" fill="currentColor" fillOpacity="0.6" textAnchor="end">{fmtDate(points[points.length - 1].date)}</text>
      </svg>
    </div>
  );
}

export function CompletionChart({ data }: { data: ProjectCompletion }) {
  if (data.points.length === 0) {
    return <div className="rounded-md border border-border-subtle p-6 text-mini text-text-tertiary">No issues in this project yet.</div>;
  }
  const max = Math.max(1, ...data.points.map((p) => p.total));
  const totalPath = data.points.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i, data.points.length)},${scaleY(p.total, max)}`).join(" ");
  const donePath = data.points.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i, data.points.length)},${scaleY(p.done, max)}`).join(" ");
  return (
    <div className="rounded-md border border-border-subtle bg-elevated p-3">
      <div className="mb-2 flex items-center gap-3 text-mini text-text-tertiary">
        <Legend swatch="#5e6ad2" label="Total scope" />
        <Legend swatch="#10b981" label="Completed" />
        <span className="ml-auto">
          {data.done}/{data.total} done · <span className="capitalize">{data.health}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full">
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.2" />
        <path d={totalPath} fill="none" stroke="#5e6ad2" strokeWidth="2" />
        <path d={donePath} fill="none" stroke="#10b981" strokeWidth="2" />
        <text x={PAD_L} y={H - 4} fontSize="10" fill="currentColor" fillOpacity="0.6">{fmtDate(data.points[0].date)}</text>
        <text x={W - PAD_R} y={H - 4} fontSize="10" fill="currentColor" fillOpacity="0.6" textAnchor="end">{fmtDate(data.points[data.points.length - 1].date)}</text>
      </svg>
    </div>
  );
}

export function VelocityBars({ data }: { data: { cycle_number: number; name: string | null; velocity: number }[] }) {
  if (data.length === 0) return <div className="rounded-md border border-border-subtle p-6 text-mini text-text-tertiary">No cycle history yet.</div>;
  const max = Math.max(1, ...data.map((d) => d.velocity));
  const barW = (W - PAD_L - PAD_R) / data.length - 8;
  return (
    <div className="rounded-md border border-border-subtle bg-elevated p-3">
      <div className="mb-2 flex items-center gap-3 text-mini text-text-tertiary">
        <Legend swatch="#5e6ad2" label="Velocity per cycle (points)" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full">
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.2" />
        {data.map((d, i) => {
          const x = scaleX(i, data.length) - barW / 2;
          const y = scaleY(d.velocity, max);
          const h = H - PAD_B - y;
          return (
            <g key={d.cycle_number}>
              <rect x={x} y={y} width={barW} height={h} fill="#5e6ad2" rx="2" />
              <text x={x + barW / 2} y={y - 3} fontSize="10" fill="currentColor" fillOpacity="0.8" textAnchor="middle">{d.velocity}</text>
              <text x={x + barW / 2} y={H - 8} fontSize="10" fill="currentColor" fillOpacity="0.6" textAnchor="middle">#{d.cycle_number}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-elevated p-3">
      <div className="text-micro uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className="mt-1 text-title3 font-semibold text-text-primary">{value}</div>
      {hint && <div className="mt-0.5 text-mini text-text-tertiary">{hint}</div>}
    </div>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-3"
        style={{ background: dashed ? `repeating-linear-gradient(90deg, ${swatch} 0 4px, transparent 4px 7px)` : swatch }}
      />
      {label}
    </span>
  );
}
