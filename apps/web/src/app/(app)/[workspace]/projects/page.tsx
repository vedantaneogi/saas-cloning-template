import { Box } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ProjectsToolbar } from "@/components/projects-toolbar";
import { getWorkspace, listMembers, listProjects, listWorkspaceLabels } from "@/lib/api";
import { NewProjectButton } from "@/components/new-project-button";

export default async function ProjectsListPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, projects, members, labels] = await Promise.all([
    getWorkspace(workspace),
    listProjects(workspace),
    listMembers(workspace).catch(() => []),
    listWorkspaceLabels(workspace).catch(() => []),
  ]);

  return (
    <>
      <Topbar
        title="Projects"
        icon={<Box size={15} />}
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
