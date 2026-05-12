import { Topbar } from "@/components/topbar";
import { FileText } from "lucide-react";
import { TemplatesManager } from "@/components/templates-manager";
import { getWorkspace, listTemplates } from "@/lib/api";

export default async function TemplatesSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, templates] = await Promise.all([
    getWorkspace(workspace).catch(() => null),
    listTemplates(workspace).catch(() => []),
  ]);
  return (
    <>
      <Topbar title="Templates" icon={<FileText size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[820px]">
          <h1 className="text-title3 font-semibold text-text-primary">Templates</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Reusable scaffolds for issues, projects, and documents. Issue templates can be team-scoped; project and document templates are workspace-wide.
          </p>
          <TemplatesManager workspaceSlug={workspace} initial={templates} teams={ws?.teams ?? []} />
        </div>
      </div>
    </>
  );
}
