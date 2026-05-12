import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { MetricCard, VelocityBars } from "@/components/charts";
import { getTeamInsights, NotFoundError } from "@/lib/api";

export default async function TeamInsightsPage({
  params,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
}) {
  const { workspace, teamKey } = await params;
  let insights;
  try {
    insights = await getTeamInsights(workspace, teamKey, 30);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <>
      <Topbar title={`${teamKey} insights`} icon={<BarChart3 size={15} />} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[920px] space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label={`Throughput · ${insights.window_days}d`} value={insights.throughput} hint="issues completed" />
            <MetricCard label={`Velocity · ${insights.window_days}d`} value={insights.velocity_points} hint="estimate points" />
            <MetricCard label="Avg lead time" value={`${insights.avg_lead_time_days}d`} hint="created → closed" />
            <MetricCard label="Open issues" value={insights.open_issues} hint="not closed / archived" />
          </div>
          <section>
            <header className="mb-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
              Velocity per cycle
            </header>
            <VelocityBars data={insights.per_cycle_velocity} />
          </section>
          <p className="text-mini text-text-tertiary">
            Throughput/velocity counts issues whose state moved to a completed or canceled group inside the window.
            Lead time is the elapsed time from <code className="text-text-secondary">created_at</code> to the last
            update of those issues — exact for clean state transitions and an approximation otherwise.
          </p>
        </div>
      </div>
    </>
  );
}
