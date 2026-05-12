import Link from "next/link";
import { notFound } from "next/navigation";
import { Folders, Calendar, Compass } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar } from "@/components/icons";
import {
  HealthBadge,
  ProjectIconBlock,
  ProjectStateIcon,
  PROJECT_STATE_LABELS,
} from "@/components/project-icons";
import { IssueGroup } from "@/components/issue-group";
import { MilestonesPanel } from "@/components/milestones-panel";
import { ProjectResourcesPanel } from "@/components/project-resources-panel";
import { ProjectTeamsPanel } from "@/components/project-teams-panel";
import { FileText } from "lucide-react";
import {
  getProject,
  getWorkspace,
  listDocuments,
  listProjectIssues,
  NotFoundError,
  type Document,
  type Issue,
  type ProjectDetail,
  type StateGroup,
} from "@/lib/api";

export default async function ProjectDetailPage({ params }: { params: Promise<{ workspace: string; slug: string }> }) {
  const { workspace, slug } = await params;
  let project: ProjectDetail;
  let issues: Issue[];
  try {
    [project, issues] = await Promise.all([getProject(workspace, slug), listProjectIssues(workspace, slug)]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const [docs, ws] = await Promise.all([
    listDocuments(workspace, project.id).catch(() => [] as Document[]),
    getWorkspace(workspace).catch(() => null),
  ]);
  const allTeams = ws?.teams ?? [];

  const byStateName = new Map<string, { name: string; group: StateGroup; position: number; issues: Issue[] }>();
  for (const issue of issues) {
    const key = issue.state.name;
    if (!byStateName.has(key)) {
      byStateName.set(key, { name: issue.state.name, group: issue.state.group, position: issue.state.position, issues: [] });
    }
    byStateName.get(key)!.issues.push(issue);
  }
  const groups = [...byStateName.values()].sort((a, b) => a.position - b.position);

  return (
    <>
      <Topbar
        title={project.name}
        icon={<ProjectIconBlock color={project.icon_color} size={14} />}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[920px]">
            {/* Header */}
            <div className="mb-6 flex items-start gap-3">
              <ProjectIconBlock color={project.icon_color} size={28} />
              <div className="flex-1">
                <h1 className="text-title2 font-semibold text-text-primary">{project.name}</h1>
                {project.description && (
                  <p className="mt-1.5 text-small text-text-secondary">{project.description}</p>
                )}
              </div>
            </div>

            {/* Status row */}
            <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-text-secondary">
              <span className="flex items-center gap-1.5">
                <ProjectStateIcon state={project.state} />
                {PROJECT_STATE_LABELS[project.state]}
              </span>
              {project.lead && (
                <span className="flex items-center gap-1.5">
                  <Avatar initials={project.lead.initials} color={project.lead.color} size={16} />
                  <span>{project.lead.name}</span>
                </span>
              )}
              {project.target_date && (
                <span className="flex items-center gap-1.5 text-text-tertiary">
                  <Calendar size={12} />
                  {new Date(project.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {project.initiative_id && project.initiative_slug_id && (
                <Link
                  href={`/${workspace}/initiative/${project.initiative_slug_id}`}
                  className="flex items-center gap-1.5 text-text-tertiary hover:text-text-secondary"
                >
                  <Compass size={12} />
                  <span>{project.initiative_name}</span>
                </Link>
              )}
              <span className="text-text-tertiary">
                {project.completed_issue_count}/{project.issue_count} issues complete
              </span>
              <ProjectTeamsPanel
                workspaceSlug={workspace}
                projectSlug={project.slug_id}
                initial={project.teams ?? []}
                allTeams={allTeams}
              />
            </div>

            <MilestonesPanel workspaceSlug={workspace} projectSlug={project.slug_id} initial={project.milestones} />

            <ProjectResourcesPanel workspaceSlug={workspace} projectSlug={project.slug_id} initial={project.resources ?? []} />

            {/* Documents */}
            {docs.length > 0 && (
              <section className="mb-8">
                <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
                  <FileText size={12} />
                  <span>Documents</span>
                  <span className="text-text-quaternary">{docs.length}</span>
                </header>
                <ul className="space-y-1.5">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/${workspace}/document/${d.slug_id}`}
                        className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-small hover:bg-row-hover"
                      >
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-default">
                          {d.icon}
                        </span>
                        <span className="flex-1 truncate text-text-primary">{d.title}</span>
                        <span className="text-mini text-text-tertiary">
                          {new Date(d.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Updates */}
            {project.updates.length > 0 && (
              <section className="mb-8">
                <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
                  <span>Updates</span>
                </header>
                <ul className="space-y-3">
                  {project.updates.map((u) => (
                    <li key={u.id} className="rounded-md border border-border-subtle bg-elevated p-3">
                      <header className="mb-1.5 flex items-center gap-2 text-mini">
                        {u.author && <Avatar initials={u.author.initials} color={u.author.color} size={16} />}
                        <span className="text-small font-medium text-text-primary">{u.author?.name ?? "Unknown"}</span>
                        <HealthBadge health={u.health} />
                        <span className="ml-auto text-text-tertiary">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </header>
                      <p className="text-small text-text-secondary">{u.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Issues */}
            <section>
              <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
                <Folders size={12} />
                <span>Issues</span>
                <span className="text-text-quaternary">{issues.length}</span>
              </header>
              {groups.length === 0 ? (
                <div className="rounded-md border border-border-subtle py-10 text-center text-small text-text-tertiary">
                  No issues assigned to this project yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-border-subtle">
                  {groups.map((g) => (
                    <IssueGroup
                      key={g.name}
                      title={g.name}
                      group={g.group}
                      count={g.issues.length}
                      issues={g.issues}
                      workspaceSlug={workspace}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
