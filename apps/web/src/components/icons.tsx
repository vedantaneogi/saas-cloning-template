// Icon set matching Linear's visual language. Most are SVG primitives sized
// 14–18px to align with their default --editor-block-menu-size (20px).
// We use lucide-react for generic icons and hand-roll the workflow/priority
// icons which need very specific shapes.

import type { SVGProps } from "react";

export function StatusIcon({ group, ...rest }: { group: string } & SVGProps<SVGSVGElement>) {
  const color =
    group === "completed" || group === "in-review"
      ? "var(--status-done)"
      : group === "started"
        ? "var(--status-in-progress)"
        : group === "canceled"
          ? "var(--status-canceled)"
          : group === "unstarted"
            ? "var(--status-todo)"
            : "var(--status-backlog)";

  if (group === "completed") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <circle cx="7" cy="7" r="6" fill={color} />
        <path d="M4.3 7.2L6.1 9l3.6-4" stroke="#0f0f11" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (group === "started") {
    // Half-filled circle (Linear's "in progress" glyph)
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" fill="none" />
        <path d="M7 2.5a4.5 4.5 0 010 9z" fill={color} />
      </svg>
    );
  }
  if (group === "canceled") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <circle cx="7" cy="7" r="6" fill={color} />
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#0f0f11" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (group === "backlog") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" fill="none" strokeDasharray="2.2 2.2" />
      </svg>
    );
  }
  // unstarted (Todo) — open circle
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function PriorityIcon({ value, ...rest }: { value: 0 | 1 | 2 | 3 | 4 } & SVGProps<SVGSVGElement>) {
  // 0 No / 1 Urgent / 2 High / 3 Medium / 4 Low
  if (value === 1) {
    // Red rounded square with "!" — Linear's urgent flag
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" {...rest}>
        <rect x="0.5" y="0.5" width="13" height="13" rx="3" fill="var(--priority-urgent)" />
        <rect x="6.3" y="3" width="1.4" height="5" rx="0.5" fill="white" />
        <rect x="6.3" y="9.6" width="1.4" height="1.6" rx="0.5" fill="white" />
      </svg>
    );
  }
  if (value === 0) {
    // Three small horizontal dashes — Linear's "no priority" glyph
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
        <rect x="2" y="6.3" width="2.5" height="1.4" rx="0.5" fill="var(--priority-none)" />
        <rect x="5.75" y="6.3" width="2.5" height="1.4" rx="0.5" fill="var(--priority-none)" />
        <rect x="9.5" y="6.3" width="2.5" height="1.4" rx="0.5" fill="var(--priority-none)" />
      </svg>
    );
  }
  // 3 ascending bars — Linear pattern:
  //   High   = all three colored
  //   Medium = first two colored, third dim
  //   Low    = first colored, two dim
  const fillStates = value === 2 ? [1, 1, 1] : value === 3 ? [1, 1, 0] : [1, 0, 0];
  const heights = [4, 7, 10];
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...rest}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4}
          y={12 - heights[i]}
          width="2.5"
          height={heights[i]}
          rx="0.6"
          fill="var(--text-secondary)"
          opacity={fillStates[i] === 1 ? 1 : 0.28}
        />
      ))}
    </svg>
  );
}

export function SubIssueProgress({ done, total }: { done: number; total: number }) {
  const angle = total ? (done / total) * 360 : 0;
  const r = 5;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="text-text-tertiary">
      <circle cx="7" cy="7" r={r} stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      {done > 0 && (
        <path
          d={describeArc(7, 7, r, 0, angle)}
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="butt"
        />
      )}
    </svg>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArc, 0, end.x, end.y].join(" ");
}
function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function Avatar({ name, initials, color, size = 18 }: { name?: string; initials: string; color: string; size?: number }) {
  return (
    <span
      title={name}
      className="inline-flex items-center justify-center rounded-pill font-medium text-white"
      style={{ width: size, height: size, background: color, fontSize: Math.max(8, Math.floor(size * 0.45)) }}
    >
      {initials}
    </span>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-pill"
      style={{ width: size, height: size, background: color }}
    />
  );
}
