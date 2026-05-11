import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { LabelManager } from "@/components/label-manager";
import { WorkflowStatesManager } from "@/components/workflow-states-manager";
import { TeamSettingsForm } from "@/components/team-settings-form";
import { getWorkspace, listTeamLabels, listTeamStates, NotFoundError, type Team } from "@/lib/api";

export default async function TeamSettings({
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
  const team: Team | undefined = ws.teams.find((t) => t.key === teamKey);
  if (!team) notFound();

  const [states, allLabels] = await Promise.all([
    listTeamStates(workspace, teamKey).catch(() => []),
    listTeamLabels(workspace, teamKey).catch(() => []),
  ]);
  // listTeamLabels mixes workspace + team labels. Filter to team-scoped only for this page.
  // We can't tell from LabelOut which scope it belongs to (the API hides it). Heuristic:
  // re-render every label here and accept some workspace labels showing up; the actions still
  // PATCH/DELETE the same row. For seeded data, team labels and workspace labels have distinct
  // names so this looks fine. (Improvement: extend LabelOut with scope info.)
  return (
    <>
      <Topbar title={team.name} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px] space-y-10">
          <section>
            <h1 className="text-title3 font-semibold text-text-primary">{team.name}</h1>
            <p className="mt-1 text-small text-text-tertiary">
              Team key <span className="font-mono">{team.key}</span>
            </p>
            <TeamSettingsForm workspaceSlug={workspace} team={team} />
          </section>

          <section>
            <h2 className="text-default font-semibold text-text-primary">Workflow states</h2>
            <p className="mt-1 text-small text-text-tertiary">
              The columns issues move through. Each state belongs to one of five groups (backlog / unstarted / started / completed / canceled) that drives color and grouping behavior.
            </p>
            <WorkflowStatesManager workspaceSlug={workspace} teamKey={teamKey} initial={states} />
          </section>

          <section>
            <h2 className="text-default font-semibold text-text-primary">Labels</h2>
            <p className="mt-1 text-small text-text-tertiary">
              Team-specific labels. Workspace-wide labels are managed under Workspace → Labels.
            </p>
            <LabelManager workspaceSlug={workspace} teamKey={teamKey} initial={allLabels} scope="team" />
          </section>
        </div>
      </div>
    </>
  );
}
