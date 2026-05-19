import { notFound } from "next/navigation";
import { InitiativeDetailBody } from "@/components/initiative-detail-body";
import { NewProjectButton } from "@/components/new-project-button";
import {
  getInitiative,
  getWorkspace,
  listMembers,
  listProjects,
  NotFoundError,
} from "@/lib/api";

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; initiativeId: string }>;
}) {
  const { workspace, initiativeId } = await params;
  let ini;
  try {
    ini = await getInitiative(workspace, initiativeId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const [ws, members, allProjects] = await Promise.all([
    getWorkspace(workspace),
    listMembers(workspace).catch(() => []),
    listProjects(workspace).catch(() => []),
  ]);

  return (
    <>
      <InitiativeDetailBody
        workspaceSlug={workspace}
        initial={ini}
        members={members}
        allProjects={allProjects}
      />
      {/* Mount the global project-create modal listener so the +-menu
          dispatch of "new-project:open" actually opens a form. */}
      <span className="hidden">
        <NewProjectButton
          workspaceSlug={workspace}
          workspaceName={ws.name}
          workspaceColor={ws.icon_color}
          members={members}
        />
      </span>
    </>
  );
}
