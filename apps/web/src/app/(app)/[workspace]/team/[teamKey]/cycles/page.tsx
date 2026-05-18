import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { CycleBurndown } from "@/components/cycle-burndown";
import { TeamCyclesHeader } from "@/components/team-cycles-header";
import {
  getWorkspace,
  listCycles,
  NotFoundError,
  type Cycle,
} from "@/lib/api";

/**
 * Cycles overview for a team. Two-column layout: a sticky-left date
 * rail aligned with each cycle's start date + a stacked list of
 * cycles ordered newest-first. The active cycle expands inline with
 * the burndown chart.
 */
export default async function TeamCyclesPage({
  params,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
}) {
  const { workspace, teamKey } = await params;

  let ws;
  try {
    ws = await getWorkspace(workspace);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const team = ws.teams.find((t) => t.key === teamKey);
  if (!team) notFound();

  const cycles = await listCycles(workspace, teamKey).catch(() => [] as Cycle[]);

  // Newest first. We order by start date descending so the rail's top
  // entry is the furthest-out upcoming cycle.
  const sorted = [...cycles].sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );

  // Among upcoming cycles, the soonest-starting one is "Upcoming";
  // everything further out is "Planned" (Linear's distinction).
  const upcoming = sorted.filter((c) => c.status === "upcoming");
  const nextUpcoming = upcoming.reduce<Cycle | null>((acc, c) => {
    if (!acc) return c;
    return new Date(c.starts_at).getTime() < new Date(acc.starts_at).getTime() ? c : acc;
  }, null);

  return (
    <>
      <TeamCyclesHeader workspace={workspace} team={team} />
      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-small text-text-tertiary">
          No cycles yet.
        </div>
      ) : (
        <div className="flex flex-1 overflow-y-auto">
          <DateRail cycles={sorted} />
          <div className="min-w-0 flex-1">
            <ul>
              {sorted.map((cycle) => (
                <li key={cycle.id}>
                  <CycleRow
                    cycle={cycle}
                    workspace={workspace}
                    label={cycleStatusLabel(cycle, nextUpcoming)}
                  />
                  {cycle.status === "active" && (
                    <CycleBurndown cycle={cycle} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function cycleStatusLabel(cycle: Cycle, nextUpcoming: Cycle | null): StatusLabel {
  if (cycle.status === "active") return "current";
  if (cycle.status === "completed") return "completed";
  return nextUpcoming?.id === cycle.id ? "upcoming" : "planned";
}

type StatusLabel = "planned" | "upcoming" | "current" | "completed";

function CycleRow({
  cycle,
  workspace,
  label,
}: {
  cycle: Cycle;
  workspace: string;
  label: StatusLabel;
}) {
  const capacityPct = 0; // capacity model not surfaced yet — Linear shows 0% when no estimates land
  return (
    <Link
      href={`/${workspace}/cycle/${cycle.id}`}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-row-hover"
    >
      <PlayCircle
        size={16}
        strokeWidth={1.75}
        className={label === "current" ? "text-accent" : "text-text-tertiary"}
      />
      <span className="text-small font-semibold text-text-primary">{cycle.name}</span>
      <span className="ml-auto flex items-center gap-4">
        <StatusPill label={label} />
        <CapacityChip pct={capacityPct} />
        <span className="text-mini">
          <span className="font-semibold text-text-primary">{cycle.issue_count}</span>
          <span className="ml-1 text-text-tertiary">scope</span>
        </span>
      </span>
    </Link>
  );
}

function StatusPill({ label }: { label: StatusLabel }) {
  const labels: Record<StatusLabel, string> = {
    planned: "Planned",
    upcoming: "Upcoming",
    current: "Current",
    completed: "Completed",
  };
  const classes: Record<StatusLabel, string> = {
    planned: "bg-pill text-text-tertiary",
    upcoming: "bg-pill text-text-secondary",
    current: "bg-pill text-text-primary",
    completed: "bg-pill text-text-tertiary",
  };
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-mini font-medium ${classes[label]}`}>
      {labels[label]}
    </span>
  );
}

function CapacityChip({ pct }: { pct: number }) {
  // Small radial-style capacity indicator with the percentage to its right.
  const dashLength = Math.max(0, Math.min(100, pct));
  const circumference = 2 * Math.PI * 5;
  const dash = (dashLength / 100) * circumference;
  return (
    <span className="inline-flex items-center gap-1.5 text-mini">
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="5" fill="none" stroke="var(--bg-pill)" strokeWidth="2" />
        <circle
          cx="7"
          cy="7"
          r="5"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth="2"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 7 7)"
        />
      </svg>
      <span className="font-semibold text-text-primary">{pct}%</span>
      <span className="text-text-tertiary">of capacity</span>
    </span>
  );
}

function DateRail({ cycles }: { cycles: Cycle[] }) {
  // Compute the y-position of each marker. Each cycle row is ~52px tall
  // when collapsed; the active one is taller (~52 + 220) because of the
  // burndown. We sample row heights and stack markers accordingly.
  const offsets: number[] = [];
  let y = 16; // header padding
  for (const c of cycles) {
    offsets.push(y);
    y += c.status === "active" ? 240 : 52;
  }
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="relative w-[92px] shrink-0 pt-4">
      {/* Vertical line connecting markers */}
      <span
        className="absolute left-[60px] top-4 w-px bg-border-subtle"
        style={{ height: `${offsets[offsets.length - 1] - offsets[0] + 10}px` }}
      />
      {cycles.map((c, i) => {
        const dateLabel = fmt(c.starts_at).replace(" ", "\n");
        const [month, day] = dateLabel.split("\n");
        const isActive = c.status === "active";
        return (
          <div
            key={c.id}
            className="absolute flex items-center gap-2"
            style={{ top: offsets[i] }}
          >
            <span className="flex w-[44px] flex-col items-end text-mini text-text-tertiary">
              <span>{month}</span>
              <span>{day}</span>
            </span>
            <span
              className={
                isActive
                  ? "ml-1 inline-block h-2.5 w-2.5 rounded-pill bg-accent"
                  : "ml-1 inline-block h-2.5 w-2.5 rounded-pill border border-border-strong"
              }
            />
          </div>
        );
      })}
    </div>
  );
}
