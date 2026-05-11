import Link from "next/link";
import { notFound } from "next/navigation";
import { Target } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { listCycles, NotFoundError, type Cycle } from "@/lib/api";

export default async function TeamCyclesPage({
  params,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
}) {
  const { workspace, teamKey } = await params;
  let cycles: Cycle[];
  try {
    cycles = await listCycles(workspace, teamKey);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const buckets: { title: string; rows: Cycle[] }[] = [
    { title: "Active", rows: cycles.filter((c) => c.status === "active") },
    { title: "Upcoming", rows: cycles.filter((c) => c.status === "upcoming") },
    { title: "Completed", rows: cycles.filter((c) => c.status === "completed") },
  ];

  return (
    <>
      <Topbar title="Cycles" icon={<Target size={15} />} />
      <div className="flex-1 overflow-y-auto">
        {cycles.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
            No cycles yet.
          </div>
        ) : (
          buckets
            .filter((b) => b.rows.length > 0)
            .map((b) => (
              <section key={b.title}>
                <header className="flex h-[34px] items-center gap-2 bg-elevated px-5 text-small">
                  <span className="font-medium text-text-primary">{b.title}</span>
                  <span className="text-text-tertiary">{b.rows.length}</span>
                </header>
                {b.rows.map((c) => (
                  <CycleRow key={c.id} cycle={c} workspaceSlug={workspace} />
                ))}
              </section>
            ))
        )}
      </div>
    </>
  );
}

function CycleRow({ cycle, workspaceSlug }: { cycle: Cycle; workspaceSlug: string }) {
  const pct = cycle.issue_count > 0 ? Math.round((cycle.completed_issue_count / cycle.issue_count) * 100) : 0;
  return (
    <Link
      href={`/${workspaceSlug}/cycle/${cycle.id}`}
      className="group flex h-[44px] items-center gap-3 border-b border-border-subtle px-5 text-small hover:bg-row-hover"
    >
      <Target size={14} className="text-text-tertiary" />
      <span className="font-medium text-text-primary">{cycle.name}</span>
      <span className="text-text-tertiary">
        {formatRange(cycle.starts_at, cycle.ends_at)}
      </span>
      <span className="ml-auto flex items-center gap-2">
        <span className="text-mini text-text-tertiary">
          {cycle.completed_issue_count}/{cycle.issue_count}
        </span>
        <span className="h-1.5 w-24 overflow-hidden rounded-pill bg-pill">
          <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
        <span className={statusClass(cycle.status)}>{statusLabel(cycle.status)}</span>
      </span>
    </Link>
  );
}

function formatRange(a: string, b: string) {
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(a)} – ${fmt(b)}`;
}

function statusClass(s: string) {
  const base = "rounded-sm bg-pill px-1.5 py-0.5 text-micro font-medium";
  if (s === "active") return `${base} text-accent`;
  if (s === "upcoming") return `${base} text-text-secondary`;
  return `${base} text-text-tertiary`;
}

function statusLabel(s: string) {
  if (s === "active") return "Active";
  if (s === "upcoming") return "Upcoming";
  return "Completed";
}
