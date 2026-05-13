import { BarChart3 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { CustomChartBuilder } from "@/components/custom-chart-builder";
import { getWorkspace } from "@/lib/api";

export default async function CustomChartsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const ws = await getWorkspace(workspace);

  return (
    <>
      <Topbar title="Custom charts" icon={<BarChart3 size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[860px]">
          <h1 className="text-title3 font-semibold text-text-primary">Custom charts</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Build a quick chart from any team's active, backlog, or all-issues view. Pick a
            grouping dimension to see how the work is distributed.
          </p>
          <CustomChartBuilder workspaceSlug={workspace} teams={ws.teams} />
        </div>
      </div>
    </>
  );
}
