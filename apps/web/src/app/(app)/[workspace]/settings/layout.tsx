import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings-nav";
import { getWorkspace } from "@/lib/api";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ws = await getWorkspace(slug);
  return (
    <div className="flex h-full overflow-hidden">
      <SettingsNav workspaceSlug={slug} teams={ws.teams} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
