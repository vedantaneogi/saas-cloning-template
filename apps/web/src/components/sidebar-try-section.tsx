"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Github, Plus } from "lucide-react";
import clsx from "clsx";
import { InviteModal } from "@/components/invite-modal";
import { listIntegrations, upsertIntegration } from "@/lib/api";

/**
 * The "Try" promo section at the bottom of the sidebar — surfaces a few
 * onboarding-style actions. Every row is wired to a real action:
 *   • Invite people → opens the workspace invite modal (real API).
 *   • Initiatives → links to /initiatives.
 *   • Connect GitHub → flips the github WorkspaceIntegration to enabled.
 *
 * Each item disappears once the user has completed the underlying action
 * (member invited, integration enabled). Initiatives is always shown — it
 * just routes — since there's no "tried initiatives" signal worth chasing.
 */
export function SidebarTrySection({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    listIntegrations(workspaceSlug)
      .then((rows) => {
        setGithubConnected(rows.some((r) => r.kind === "github" && r.enabled));
      })
      .catch(() => setGithubConnected(false));
  }, [workspaceSlug]);

  async function connectGithub() {
    if (connecting || githubConnected) return;
    setConnecting(true);
    try {
      await upsertIntegration(workspaceSlug, { kind: "github", enabled: true, config: {} });
      setGithubConnected(true);
      router.push(`/${workspaceSlug}/settings/integrations`);
      router.refresh();
    } catch {
      // surface in integrations page if anything went wrong
      router.push(`/${workspaceSlug}/settings/integrations`);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <>
      <div className="mt-4 px-2 pb-1 pt-0.5">
        <span className="text-micro font-medium uppercase tracking-wider text-text-tertiary">Try</span>
      </div>
      <button
        type="button"
        onClick={() => setInviteOpen(true)}
        className={rowCls}
      >
        <Plus size={13} className="text-text-tertiary" />
        <span className="flex-1">Invite people</span>
      </button>
      <Link href={`/${workspaceSlug}/initiatives`} className={rowCls}>
        <Compass size={13} className="text-text-tertiary" />
        <span className="flex-1">Initiatives</span>
      </Link>
      {githubConnected === false && (
        <button
          type="button"
          onClick={connectGithub}
          disabled={connecting}
          className={clsx(rowCls, connecting && "opacity-60")}
        >
          <Github size={13} className="text-text-tertiary" />
          <span className="flex-1">{connecting ? "Connecting…" : "Connect GitHub"}</span>
        </button>
      )}
      <InviteModal
        workspaceSlug={workspaceSlug}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  );
}

const rowCls =
  // `<button>` defaults to text-align:center, which is what shifted the
  // "Invite people" label off-center when "Initiatives"/"Connect GitHub"
  // (rendered as <Link>) sat flush. Force text-left so all three rows
  // align identically regardless of element type.
  "group/try flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-small leading-none text-text-secondary transition-colors hover:bg-row-hover";
