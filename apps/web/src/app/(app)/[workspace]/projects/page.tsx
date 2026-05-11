import Link from "next/link";
import { Folders } from "lucide-react";
import { Topbar } from "@/components/topbar";
import {
  ProjectIconBlock,
  ProjectStateIcon,
  PROJECT_STATE_LABELS,
} from "@/components/project-icons";
import { listProjects, type Project, type ProjectState } from "@/lib/api";

const STATE_ORDER: ProjectState[] = ["started", "planned", "paused", "completed", "canceled"];

export default async function ProjectsListPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const projects = await listProjects(workspace);
  const byState = new Map<ProjectState, Project[]>();
  for (const p of projects) {
    if (!byState.has(p.state)) byState.set(p.state, []);
    byState.get(p.state)!.push(p);
  }

  return (
    <>
      <Topbar title="Projects" icon={<Folders size={15} />} />
      <div className="flex-1 overflow-y-auto">
        {STATE_ORDER.filter((s) => byState.get(s)?.length).map((state) => (
          <section key={state} className="border-b border-border-subtle last:border-b-0">
            <header className="flex h-[34px] items-center gap-2 bg-elevated px-3 text-small">
              <ProjectStateIcon state={state} />
              <span className="font-medium text-text-primary">{PROJECT_STATE_LABELS[state]}</span>
              <span className="text-text-tertiary">{byState.get(state)!.length}</span>
            </header>
            <ul>
              {byState.get(state)!.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/${workspace}/project/${p.slug_id}`}
                    className="flex h-[44px] items-center gap-3 border-b border-border-subtle pl-3 pr-6 text-small hover:bg-row-hover"
                  >
                    <ProjectIconBlock color={p.icon_color} size={20} />
                    <span className="flex-1 truncate text-text-primary">{p.name}</span>
                    <span className="text-mini text-text-tertiary">
                      {p.completed_issue_count}/{p.issue_count}
                    </span>
                    <div className="w-24 text-mini text-text-tertiary">
                      {p.target_date
                        ? new Date(p.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </div>
                    <span>
                      {p.lead ? (
                        <span
                          title={p.lead.name}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-pill text-micro font-medium text-white"
                          style={{ background: p.lead.color }}
                        >
                          {p.lead.initials}
                        </span>
                      ) : (
                        <span className="inline-block h-5 w-5 rounded-pill border border-dashed border-border-strong" />
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {projects.length === 0 && (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">No projects yet.</div>
        )}
      </div>
    </>
  );
}
