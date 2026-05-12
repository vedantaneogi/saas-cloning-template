"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { completeCycle } from "@/lib/api";

export function CompleteCycleButton({
  workspaceSlug,
  cycleId,
  remaining,
}: {
  workspaceSlug: string;
  cycleId: string;
  remaining: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    const msg = remaining > 0
      ? `Complete this cycle? ${remaining} unfinished issue${remaining === 1 ? "" : "s"} will roll over to the next cycle.`
      : "Complete this cycle?";
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      await completeCycle(workspaceSlug, cycleId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini text-white shadow-button hover:opacity-90 disabled:opacity-50"
    >
      <CircleCheck size={12} />
      Complete cycle
    </button>
  );
}
