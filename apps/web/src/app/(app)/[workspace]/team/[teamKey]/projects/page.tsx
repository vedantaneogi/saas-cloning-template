import { notFound } from "next/navigation";
import { NewProjectButton } from "@/components/new-project-button";
import { ProjectsToolbar } from "@/components/projects-toolbar";
import { TeamProjectsHeader } from "@/components/team-projects-header";
import {
  getWorkspace,
  listMembers,
  listProjects,
  listWorkspaceLabels,
  NotFoundError,
} from "@/lib/api";

export default async function TeamProjectsPage({
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

  const [allProjects, members, labels] = await Promise.all([
    listProjects(workspace),
    listMembers(workspace).catch(() => []),
    listWorkspaceLabels(workspace).catch(() => []),
  ]);
  const projects = allProjects.filter((p) => (p.team_keys ?? []).includes(teamKey));

  return (
    <>
      <TeamProjectsHeader
        workspace={workspace}
        team={team}
        trailing={
          <NewProjectButton
            workspaceSlug={workspace}
            workspaceName={ws.name}
            workspaceColor={ws.icon_color}
            members={members}
          />
        }
      />
      <ProjectsToolbar
        projects={projects}
        workspace={workspace}
        members={members}
        teams={ws.teams}
        labels={labels}
      />
    </>
  );
}
