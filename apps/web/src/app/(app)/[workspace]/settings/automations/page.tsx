import { Topbar } from "@/components/topbar";
import { Zap } from "lucide-react";
import { AutomationsManager } from "@/components/automations-manager";
import { getWorkspace, listAutomations, listMembers } from "@/lib/api";

export default async function AutomationsSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, rules, members] = await Promise.all([
    getWorkspace(workspace).catch(() => null),
    listAutomations(workspace).catch(() => []),
    listMembers(workspace).catch(() => []),
  ]);
  return (
    <>
      <Topbar title="Automations" icon={<Zap size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[860px]">
          <h1 className="text-title3 font-semibold text-text-primary">Workflow rules</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Rules fire when triggers match (issue created, status changed, etc.) or on demand via
            "Run scheduled rules" for stale-in-state cleanups.
          </p>
          <AutomationsManager
            workspaceSlug={workspace}
            initial={rules}
            teams={ws?.teams ?? []}
            members={members}
          />
        </div>
      </div>
    </>
  );
}
