import Link from "next/link";
import { Map as MapIcon, Compass, Folders } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ProjectIconBlock } from "@/components/project-icons";
import { listInitiatives, listProjects, type Initiative, type Project } from "@/lib/api";

export default async function RoadmapPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [initiatives, projects] = await Promise.all([
    listInitiatives(workspace).catch(() => [] as Initiative[]),
    listProjects(workspace).catch(() => [] as Project[]),
  ]);

  // Build initiative buckets (plus an "Unassigned" bucket for projects without one)
  const projectsByInitiative = new Map<string | null, Project[]>();
  for (const p of projects) {
    const key = p.initiative_id ?? null;
    if (!projectsByInitiative.has(key)) projectsByInitiative.set(key, []);
    projectsByInitiative.get(key)!.push(p);
  }

  // Compute month range: from earliest start to latest target (with 1 month padding)
  const dates: number[] = [];
  for (const p of projects) {
    if (p.start_date) dates.push(new Date(p.start_date).getTime());
    if (p.target_date) dates.push(new Date(p.target_date).getTime());
  }
  if (dates.length === 0) {
    return (
      <>
        <Topbar title="Roadmap" icon={<MapIcon size={15} />} />
        <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
          No projects with dates yet.
        </div>
      </>
    );
  }
  const minTs = Math.min(...dates);
  const maxTs = Math.max(...dates);
  const startMonth = startOfMonth(new Date(minTs));
  const endMonth = endOfMonth(new Date(maxTs));
  const months = monthRange(startMonth, endMonth);
  const totalMs = endMonth.getTime() - startMonth.getTime();

  const todayMs = Date.now();
  const todayPct = clamp01((todayMs - startMonth.getTime()) / totalMs) * 100;

  function position(start: string | null, target: string | null) {
    const s = start ? new Date(start).getTime() : (target ? new Date(target).getTime() - 60 * 24 * 60 * 60 * 1000 : startMonth.getTime());
    const t = target ? new Date(target).getTime() : s + 30 * 24 * 60 * 60 * 1000;
    const left = ((s - startMonth.getTime()) / totalMs) * 100;
    const width = Math.max(1.5, ((t - s) / totalMs) * 100);
    return { left, width };
  }

  // Order: known initiatives first (by created order), then unassigned
  const orderedInitiatives: (Initiative | null)[] = [
    ...initiatives.filter((i) => projectsByInitiative.has(i.id)),
    ...(projectsByInitiative.has(null) ? [null] : []),
  ];

  return (
    <>
      <Topbar title="Roadmap" icon={<MapIcon size={15} />} />
      <div className="flex-1 overflow-auto">
        {/* Month header (sticky) */}
        <div className="sticky top-0 z-10 grid border-b border-border-subtle bg-app" style={gridStyle(months.length)}>
          <div className="border-r border-border-subtle px-3 py-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
            Initiative / Project
          </div>
          {months.map((m) => (
            <div
              key={m.toISOString()}
              className="border-r border-border-subtle px-2 py-2 text-mini font-medium uppercase tracking-wider text-text-tertiary last:border-r-0"
            >
              {m.toLocaleDateString("en-US", { month: "short" })}
              <span className="ml-1 text-text-quaternary">{String(m.getFullYear()).slice(2)}</span>
            </div>
          ))}
        </div>

        {orderedInitiatives.map((ini) => {
          const projs = projectsByInitiative.get(ini?.id ?? null) || [];
          return (
            <section key={ini?.id ?? "_none"} className="border-b border-border-subtle">
              <header className="grid items-center bg-elevated/60" style={gridStyle(months.length)}>
                <div className="flex items-center gap-2 border-r border-border-subtle px-3 py-2 text-small">
                  {ini ? (
                    <>
                      <span
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                        style={{ background: ini.icon_color }}
                      >
                        <Compass size={9} className="text-white/80" />
                      </span>
                      <Link href={`/${workspace}/initiative/${ini.slug_id}`} className="font-medium text-text-primary hover:underline">
                        {ini.name}
                      </Link>
                      <span className="text-text-tertiary">{projs.length}</span>
                    </>
                  ) : (
                    <>
                      <Folders size={13} className="text-text-tertiary" />
                      <span className="font-medium text-text-secondary">No initiative</span>
                      <span className="text-text-tertiary">{projs.length}</span>
                    </>
                  )}
                </div>
                <div className="col-span-full -col-end-1 relative h-1" />
              </header>
              <div className="relative">
                {projs.map((p) => {
                  const { left, width } = position(p.start_date, p.target_date);
                  const pct = p.issue_count > 0 ? Math.round((p.completed_issue_count / p.issue_count) * 100) : 0;
                  return (
                    <div
                      key={p.id}
                      className="grid h-[44px] items-center border-t border-border-subtle hover:bg-row-hover"
                      style={gridStyle(months.length)}
                    >
                      <Link
                        href={`/${workspace}/project/${p.slug_id}`}
                        className="flex h-full items-center gap-2 border-r border-border-subtle px-3 text-small"
                      >
                        <ProjectIconBlock color={p.icon_color} size={12} />
                        <span className="truncate text-text-primary">{p.name}</span>
                      </Link>
                      <div className="relative col-start-2 col-end-[-1] h-full">
                        {/* today line — only on first row to act as a column guide */}
                        {todayPct >= 0 && todayPct <= 100 && (
                          <div
                            className="pointer-events-none absolute top-0 bottom-0 w-px bg-priority-urgent/70"
                            style={{ left: `${todayPct}%` }}
                          />
                        )}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-md border"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: hexWithAlpha(p.icon_color, 0.22),
                            borderColor: hexWithAlpha(p.icon_color, 0.55),
                            height: 22,
                          }}
                          title={`${p.name} · ${fmtRange(p.start_date, p.target_date)}`}
                        >
                          {/* completion fill */}
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, background: hexWithAlpha(p.icon_color, 0.7) }}
                          />
                          <div className="absolute inset-0 flex items-center gap-1.5 px-1.5 text-mini text-text-primary">
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="ml-auto shrink-0 text-text-tertiary">
                              {p.completed_issue_count}/{p.issue_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function gridStyle(monthCount: number) {
  return { gridTemplateColumns: `260px repeat(${monthCount}, minmax(80px, 1fr))` };
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
function monthRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur < end) {
    out.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function fmtRange(s: string | null, t: string | null) {
  const f = (x: string | null) =>
    x ? new Date(x).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";
  return `${f(s)} → ${f(t)}`;
}
function hexWithAlpha(hex: string, alpha: number) {
  // Supports #rrggbb and short #rgb; falls back to the color if unparseable.
  if (!hex || hex[0] !== "#") return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
