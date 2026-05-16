import { Inbox as InboxIcon } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { InboxBody } from "@/components/inbox-body";
import { InboxTopbarControls } from "@/components/inbox-filters";
import { listNotifications } from "@/lib/api";

export default async function InboxPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  // The list-notifications endpoint hides snoozed rows by default. Pull
  // them in here so the client-side "Show snoozed" toggle has data to
  // work with — it filters them back out when off.
  const notes = await listNotifications(workspace, { includeSnoozed: true }).catch(() => []);

  return (
    <div className="flex h-full">
      <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-border-subtle">
        <Topbar
          title="Inbox"
          icon={<InboxIcon size={15} />}
          trailing={<InboxTopbarControls workspaceSlug={workspace} />}
        />
        <InboxBody workspaceSlug={workspace} initial={notes} />
      </aside>
      <main className="flex flex-1 items-center justify-center bg-app">
        <div className="flex flex-col items-center text-center text-text-tertiary">
          <InboxArtwork />
          <p className="mt-4 text-small">
            {notes.length === 0
              ? "All caught up"
              : `${notes.filter((n) => !n.read_at).length} unread notification${notes.filter((n) => !n.read_at).length === 1 ? "" : "s"}`}
          </p>
        </div>
      </main>
    </div>
  );
}

function InboxArtwork() {
  return (
    <svg width="116" height="116" viewBox="0 0 116 116" fill="none">
      <rect x="14" y="36" width="88" height="58" rx="10" stroke="var(--text-quaternary)" strokeWidth="1.5" />
      <path d="M14 64h26l4 8h32l4-8h26" stroke="var(--text-quaternary)" strokeWidth="1.5" />
      <rect x="30" y="22" width="56" height="28" rx="4" stroke="var(--text-quaternary)" strokeWidth="1.5" />
      <path d="M40 32h36M40 40h24" stroke="var(--text-quaternary)" strokeWidth="1.5" />
    </svg>
  );
}
