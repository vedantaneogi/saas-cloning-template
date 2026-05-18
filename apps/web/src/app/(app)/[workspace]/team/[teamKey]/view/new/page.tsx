import { notFound } from "next/navigation";
import { NewViewEditor } from "@/components/new-view-editor";
import { TeamIssuesHeader } from "@/components/team-issues-header";
import { getWorkspace, NotFoundError } from "@/lib/api";

/**
 * Team-scoped Create-new-view page. Mounts the team issues header so
 * the breadcrumb + favorite + bell stay in context, then renders the
 * standard NewViewEditor below with initialTeamKey set — that locks
 * the preview list to this team's issues only (matching real Linear's
 * /team/<key>/view/new behavior, where the editor never leaks
 * cross-team issues into the preview).
 */
export default async function TeamNewViewPage({
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
  const team = (ws.teams ?? []).find((t) => t.key === teamKey);
  if (!team) notFound();

  return (
    <>
      <TeamIssuesHeader
        workspace={workspace}
        team={team}
        view="all"
        savedView={null}
        creating
      />
      <div className="flex-1 overflow-y-auto">
        <NewViewEditor
          workspace={workspace}
          scope="issues"
          teams={ws.teams ?? []}
          workspaceName={ws.name}
          initialTeamKey={teamKey}
        />
      </div>
    </>
  );
}
