import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { CreateIssueModal } from "@/components/create-issue-modal";
import { ShortcutCheatsheet } from "@/components/shortcut-cheatsheet";
import { CommandPalette } from "@/components/command-palette";
import { getMe, getWorkspace, NotFoundError, UnauthorizedError } from "@/lib/api";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  let me;
  try {
    me = await getMe();
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    throw e;
  }
  if (!me.workspaces.find((w) => w.slug === slug)) {
    // user isn't a member of this workspace
    const first = me.workspaces[0];
    redirect(first ? `/${first.slug}/inbox` : "/new-workspace");
  }

  let ws;
  try {
    ws = await getWorkspace(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app">
      <Sidebar workspace={ws} me={me} />
      <main className="flex h-full min-w-0 flex-1 flex-col">{children}</main>
      <CreateIssueModal workspaceSlug={ws.slug} teams={ws.teams} />
      <ShortcutCheatsheet />
      <CommandPalette workspaceSlug={ws.slug} />
    </div>
  );
}
