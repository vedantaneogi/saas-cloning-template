"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createDocument } from "@/lib/api";

export function NewDocButton({ workspaceSlug, projectId }: { workspaceSlug: string; projectId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const d = await createDocument(workspaceSlug, {
          title: "Untitled",
          body: "",
          icon: "📄",
          ...(projectId ? { project_id: projectId } : {}),
        });
        router.push(`/${workspaceSlug}/document/${d.slug_id}`);
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary disabled:opacity-50"
    >
      <Plus size={12} />
      New document
    </button>
  );
}
