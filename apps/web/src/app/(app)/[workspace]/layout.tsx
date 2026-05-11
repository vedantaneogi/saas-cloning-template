import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateIssueModal } from "@/components/create-issue-modal";
import { ShortcutCheatsheet } from "@/components/shortcut-cheatsheet";
import { CommandPalette } from "@/components/command-palette";
import { getWorkspace, NotFoundError } from "@/lib/api";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  let ws;
  try {
    ws = await getWorkspace(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app">
      <Sidebar workspace={ws} />
      <main className="flex h-full min-w-0 flex-1 flex-col">{children}</main>
      <CreateIssueModal workspaceSlug={ws.slug} teams={ws.teams} />
      <ShortcutCheatsheet />
      <CommandPalette workspaceSlug={ws.slug} />
    </div>
  );
}
