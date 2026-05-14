"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Plus } from "lucide-react";
import {
  createDocument,
  listTemplates,
  type DocumentTemplateBody,
  type Template,
} from "@/lib/api";

export function NewDocButton({ workspaceSlug, projectId }: { workspaceSlug: string; projectId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listTemplates(workspaceSlug, { kind: "document" })
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [open, workspaceSlug]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function create(template: Template | null) {
    setOpen(false);
    startTransition(async () => {
      try {
        const body = template ? (template.body as DocumentTemplateBody) : null;
        const d = await createDocument(workspaceSlug, {
          title: body?.title || (template ? template.name : "Untitled"),
          body: body?.body ?? "",
          icon: body?.icon || "📄",
          ...(projectId ? { project_id: projectId } : {}),
        });
        router.push(`/${workspaceSlug}/document/${d.slug_id}`);
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary disabled:opacity-50"
      >
        <Plus size={12} />
        New document
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-[220px] overflow-hidden rounded-md bg-elevated text-small shadow-popover">
          <ul className="py-1">
            <li>
              <button
                type="button"
                onClick={() => create(null)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-text-secondary hover:bg-row-hover"
              >
                <FileText size={12} className="text-text-tertiary" />
                Blank document
              </button>
            </li>
            {templates.length > 0 && (
              <>
                <li className="px-2.5 pb-1 pt-2 text-micro font-medium uppercase tracking-wider text-text-tertiary">
                  Templates
                </li>
                {templates.map((t) => {
                  const body = t.body as DocumentTemplateBody;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => create(t)}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-text-secondary hover:bg-row-hover"
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center">
                          {body.icon || "📄"}
                        </span>
                        <span className="flex-1 truncate">{t.name}</span>
                      </button>
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
