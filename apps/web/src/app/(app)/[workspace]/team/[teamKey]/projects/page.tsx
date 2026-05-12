import Link from "next/link";
import { notFound } from "next/navigation";
import { Folders } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ProjectIconBlock, ProjectStateIcon, PROJECT_STATE_LABELS } from "@/components/project-icons";
import { getWorkspace, listProjects, NotFoundError, type ProjectDetail, type Project, type ProjectState } from "@/lib/api";

const STATE_ORDER: ProjectState[] = ["started", "planned", "paused", "completed", "canceled"];

export default async function TeamProjectsPage({ params }: { params: Promise<{ workspace: string; teamKey: string }> }) {
  const { workspace, teamKey } = await params;
  let team;
  try {
    const ws = await getWorkspace(workspace);
    team = ws.teams.find((t) => t.key === teamKey);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  if (!team) notFound();

  const all = await listProjects(workspace);
  // Project teams aren't on the ProjectOut list view yet; for now show all projects
  // (project detail enforces team association). When `teams` lands on ProjectOut we
  // filter here.
  const filtered = all;
  const byState = new Map<ProjectState, Project[]>();
  for (const p of filtered) {
    if (!byState.has(p.state)) byState.set(p.state, []);
    byState.get(p.state)!.push(p);
  }

  return (
    <>
      <Topbar title={`${team.name} · Projects`} icon={<Folders size={15} />} />
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
                    <span className="text-mini text-text-tertiary">{p.completed_issue_count}/{p.issue_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">No projects yet.</div>
        )}
      </div>
    </>
  );
}
