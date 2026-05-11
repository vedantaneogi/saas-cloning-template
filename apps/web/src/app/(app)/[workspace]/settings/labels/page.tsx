import { Topbar } from "@/components/topbar";
import { Tag } from "lucide-react";
import { LabelManager } from "@/components/label-manager";
import { listWorkspaceLabels } from "@/lib/api";

export default async function WorkspaceLabelsSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const labels = await listWorkspaceLabels(workspace).catch(() => []);
  return (
    <>
      <Topbar title="Workspace labels" icon={<Tag size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px]">
          <h1 className="text-title3 font-semibold text-text-primary">Workspace labels</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Labels available across every team. Team-specific labels are managed under each team.
          </p>
          <LabelManager workspaceSlug={workspace} initial={labels} scope="workspace" />
        </div>
      </div>
    </>
  );
}
