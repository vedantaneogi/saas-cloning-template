"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { subscribeIssue, unsubscribeIssue } from "@/lib/api";

export function SubscribeButton({
  workspaceSlug,
  identifier,
  initialSubscribed,
}: {
  workspaceSlug: string;
  identifier: string;
  initialSubscribed: boolean;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !subscribed;
    setSubscribed(next);
    try {
      if (next) await subscribeIssue(workspaceSlug, identifier);
      else await unsubscribeIssue(workspaceSlug, identifier);
      router.refresh();
    } catch {
      setSubscribed(!next);
    } finally {
      setPending(false);
    }
  }

  const Icon = subscribed ? Bell : BellOff;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-1 hover:text-text-secondary disabled:opacity-60"
      title={subscribed ? "Unsubscribe from this issue" : "Subscribe to this issue"}
    >
      <Icon size={12} />
      {subscribed ? "Unsubscribe" : "Subscribe"}
    </button>
  );
}
