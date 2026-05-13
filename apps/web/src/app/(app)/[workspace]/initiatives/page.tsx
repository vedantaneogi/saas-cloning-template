import Link from "next/link";
import { Compass } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar } from "@/components/icons";
import { listInitiatives, type Initiative } from "@/lib/api";

export default async function InitiativesPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const initiatives = await listInitiatives(workspace).catch(() => [] as Initiative[]);

  const buckets: { title: string; rows: Initiative[] }[] = [
    { title: "Active", rows: initiatives.filter((i) => i.status === "active") },
    { title: "Planned", rows: initiatives.filter((i) => i.status === "planned") },
    { title: "Completed", rows: initiatives.filter((i) => i.status === "completed") },
    { title: "Canceled", rows: initiatives.filter((i) => i.status === "canceled") },
  ];

  return (
    <>
      <Topbar title="Initiatives" icon={<Compass size={15} />} />
      <div className="flex-1 overflow-y-auto">
        {initiatives.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
            No initiatives yet.
          </div>
        ) : (
          buckets
            .filter((b) => b.rows.length > 0)
            .map((b) => (
              <section key={b.title}>
                <header className="flex h-[36px] items-center gap-2 bg-elevated px-5 text-small">
                  <span className="font-medium text-text-primary">{b.title}</span>
                  <span className="text-text-tertiary">{b.rows.length}</span>
                </header>
                {b.rows.map((i) => (
                  <InitiativeRow key={i.id} initiative={i} workspaceSlug={workspace} />
                ))}
              </section>
            ))
        )}
      </div>
    </>
  );
}

function InitiativeRow({ initiative, workspaceSlug }: { initiative: Initiative; workspaceSlug: string }) {
  const pct = initiative.project_count > 0 ? Math.round((initiative.completed_project_count / initiative.project_count) * 100) : 0;
  return (
    <Link
      href={`/${workspaceSlug}/initiative/${initiative.slug_id}`}
      className="group flex h-[48px] items-center gap-3 border-b border-border-subtle px-5 text-small hover:bg-row-hover"
    >
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
        style={{ background: initiative.icon_color }}
      >
        <Compass size={11} className="text-white/80" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">{initiative.name}</span>
        {initiative.description && (
          <span className="block truncate text-mini text-text-tertiary">{initiative.description}</span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-mini text-text-tertiary">
          {initiative.completed_project_count}/{initiative.project_count} projects
        </span>
        <span className="h-1.5 w-24 overflow-hidden rounded-pill bg-pill">
          <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
        <span className={statusClass(initiative.status)}>{label(initiative.status)}</span>
        {initiative.owner ? (
          <Avatar initials={initiative.owner.initials} color={initiative.owner.color} size={20} />
        ) : (
          <span className="inline-block h-5 w-5 rounded-pill border border-dashed border-border-strong" />
        )}
      </span>
    </Link>
  );
}

function statusClass(s: string) {
  const base = "rounded-sm bg-pill px-1.5 py-0.5 text-micro font-medium";
  if (s === "active") return `${base} text-accent`;
  if (s === "planned") return `${base} text-text-secondary`;
  if (s === "completed") return `${base} text-text-tertiary`;
  return `${base} text-text-tertiary`;
}

function label(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
