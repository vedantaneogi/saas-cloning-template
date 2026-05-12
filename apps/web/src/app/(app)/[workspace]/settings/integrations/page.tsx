import { Topbar } from "@/components/topbar";
import { Plug } from "lucide-react";
import { IntegrationsManager } from "@/components/integrations-manager";
import { getWorkspace, listIntegrations } from "@/lib/api";
import { headers } from "next/headers";

export default async function IntegrationsSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, integrations] = await Promise.all([
    getWorkspace(workspace).catch(() => null),
    listIntegrations(workspace).catch(() => []),
  ]);
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "linear.techbrig.co";
  const proto = h.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;
  return (
    <>
      <Topbar title="Integrations" icon={<Plug size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[820px]">
          <h1 className="text-title3 font-semibold text-text-primary">Integrations</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Webhook-based receivers. Generate a secret here, paste it into the source app's webhook
            config, and point the source at this workspace's URL.
          </p>
          <IntegrationsManager workspaceSlug={workspace} initial={integrations} teams={ws?.teams ?? []} baseUrl={base} />
        </div>
      </div>
    </>
  );
}
