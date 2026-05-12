import { notFound } from "next/navigation";
import { Target } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { IssueListBody } from "@/components/issue-list-body";
import { CompleteCycleButton } from "@/components/complete-cycle-button";
import { getCycle, getCycleBurndown, getCycleInsights, listCycleIssues, NotFoundError, type Issue, type StateGroup } from "@/lib/api";
import { BurndownChart, MetricCard } from "@/components/charts";

export default async function CyclePage({
  params,
}: {
  params: Promise<{ workspace: string; cycleId: string }>;
}) {
  const { workspace, cycleId } = await params;
  let cycle, issues: Issue[];
  try {
    [cycle, issues] = await Promise.all([
      getCycle(workspace, cycleId),
      listCycleIssues(workspace, cycleId),
    ]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const [burndown, insights] = await Promise.all([
    getCycleBurndown(workspace, cycle.team_key, cycle.number).catch(() => null),
    getCycleInsights(workspace, cycle.team_key, cycle.number).catch(() => null),
  ]);

  const groups = groupByStateName(issues);
  const pct = cycle.issue_count > 0 ? Math.round((cycle.completed_issue_count / cycle.issue_count) * 100) : 0;

  return (
    <>
      <Topbar
        title={cycle.name}
        icon={<Target size={15} />}
        trailing={
          cycle.status === "active" ? (
            <CompleteCycleButton
              workspaceSlug={workspace}
              cycleId={cycle.id}
              remaining={cycle.issue_count - cycle.completed_issue_count}
            />
          ) : null
        }
      />
      <div className="flex shrink-0 items-center gap-4 border-b border-border-subtle px-5 py-3 text-mini text-text-tertiary">
        <span>{formatRange(cycle.starts_at, cycle.ends_at)}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-32 overflow-hidden rounded-pill bg-pill">
            <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
          </span>
          {cycle.completed_issue_count}/{cycle.issue_count} ({pct}%)
        </span>
        <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro font-medium text-text-secondary">
          {cycle.status === "active" ? "Active" : cycle.status === "upcoming" ? "Upcoming" : "Completed"}
        </span>
        <span className="ml-auto">Team {cycle.team_key}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {(burndown || insights) && (
          <div className="border-b border-border-subtle px-5 py-4">
            {insights && (
              <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <MetricCard label="Velocity" value={insights.velocity} hint="points completed" />
                <MetricCard label="Completion" value={`${Math.round(insights.completion_rate * 100)}%`} hint={`${insights.issues_completed}/${insights.issues_total} issues`} />
                <MetricCard label="Scope" value={insights.scope_estimate} hint="points planned" />
                <MetricCard label="Scope changes" value={insights.scope_changes} hint="added mid-cycle" />
              </div>
            )}
            {burndown && <BurndownChart points={burndown.points} ideal={burndown.ideal} />}
          </div>
        )}
        <IssueListBody groups={groups} workspaceSlug={workspace} teamKey={cycle.team_key} />
      </div>
    </>
  );
}

function groupByStateName(issues: Issue[]): { name: string; group: StateGroup; issues: Issue[] }[] {
  const map = new Map<string, { name: string; group: StateGroup; position: number; issues: Issue[] }>();
  for (const issue of issues) {
    const key = issue.state.name;
    if (!map.has(key)) {
      map.set(key, { name: issue.state.name, group: issue.state.group, position: issue.state.position, issues: [] });
    }
    map.get(key)!.issues.push(issue);
  }
  return [...map.values()].sort((a, b) => a.position - b.position);
}

function formatRange(a: string, b: string) {
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(a)} – ${fmt(b)}`;
}
