import { notFound } from "next/navigation";
import { CycleHeader } from "@/components/cycle-header";
import { CycleDetailBody } from "@/components/cycle-detail-body";
import {
  getCycle,
  getWorkspace,
  listCycleIssues,
  NotFoundError,
  type Issue,
  type Team,
} from "@/lib/api";

/**
 * /cycle/[cycleId] — detail page for a single cycle. The layout
 * mirrors Linear's: breadcrumb (Team › Cycles › Cycle N) header with
 * favorite + 3-dot menu, a chrome row with status pill + date range +
 * the 3-chip controls (Filter / Display / Panel), and the body that
 * shows either the filtered issue list/board or the play-circle empty
 * state when no issues are in scope.
 */
export default async function CyclePage({
  params,
}: {
  params: Promise<{ workspace: string; cycleId: string }>;
}) {
  const { workspace, cycleId } = await params;
  let cycle, issues: Issue[], team: Team | undefined;
  try {
    [cycle, issues] = await Promise.all([
      getCycle(workspace, cycleId),
      listCycleIssues(workspace, cycleId),
    ]);
    const ws = await getWorkspace(workspace).catch(() => null);
    team = ws?.teams.find((t) => t.key === cycle.team_key);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  if (!team) notFound();

  return (
    <>
      <CycleHeader workspaceSlug={workspace} team={team} cycle={cycle} />
      <CycleDetailBody
        workspaceSlug={workspace}
        team={team}
        cycle={cycle}
        issues={issues}
      />
    </>
  );
}
