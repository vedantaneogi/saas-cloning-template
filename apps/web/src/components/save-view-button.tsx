"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck, Check, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { createSavedView, patchSavedView, type SavedView } from "@/lib/api";

const VIEW_COLORS = ["#5e6ad2", "#26b5ce", "#4cb782", "#f2c94c", "#eb5757", "#bb87fc", "#95a2b3"];

/**
 * Surfaces three states depending on the URL + (optional) loaded view:
 * - View loaded + filters match saved -> nothing rendered (clean)
 * - View loaded + filters diverge -> "Save changes" + "Reset" controls
 * - No view loaded + custom filters -> "Save view" (creates new)
 */
export function SaveViewButton({
  workspaceSlug,
  teamKey,
  base,
  savedView,
}: {
  workspaceSlug: string;
  teamKey: string | null;
  base: "active" | "backlog" | "all";
  savedView?: SavedView | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // The query that represents *current page filters* — strip `view_id`
  // because that's the page-identity param, not a filter.
  const currentQs = useMemo(() => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.delete("view_id");
    sp.sort();
    return sp.toString();
  }, [params]);

  const savedQs = useMemo(() => {
    if (!savedView) return "";
    const sp = new URLSearchParams(savedView.query || "");
    sp.delete("view_id");
    sp.sort();
    return sp.toString();
  }, [savedView]);

  const diverged = !!savedView && currentQs !== savedQs;

  // No view loaded -> only show "Save" if the user has applied some filter.
  if (!savedView && currentQs.length === 0) return null;
  // View loaded + filters match -> nothing to do.
  if (savedView && !diverged) return null;

  if (savedView) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={async () => {
            try {
              await patchSavedView(workspaceSlug, savedView.id, { query: currentQs });
              router.refresh();
            } catch (e) {
              console.error("save view failed", e);
            }
          }}
          className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-mini font-medium text-accent hover:bg-accent/25"
          title="Save changes to this view"
        >
          <BookmarkCheck size={12} />
          <span>Save changes</span>
        </button>
        <button
          onClick={() => {
            const sp = new URLSearchParams(savedView.query || "");
            sp.set("view_id", savedView.id);
            router.replace(`?${sp.toString()}`, { scroll: false });
          }}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          title="Reset filters to saved"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>
    );
  }

  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Save view"
          title="Save view"
        >
          <Bookmark size={13} />
          <span>Save view</span>
        </button>
      )}
      align="end"
      width={280}
    >
      {({ close }) => (
        <SaveViewForm
          workspaceSlug={workspaceSlug}
          teamKey={teamKey}
          base={base}
          query={currentQs}
          onClose={close}
          onSaved={(viewId) => {
            close();
            router.refresh();
            router.push(`/${workspaceSlug}/view/${viewId}`);
          }}
        />
      )}
    </Popover>
  );
}

function SaveViewForm({
  workspaceSlug,
  teamKey,
  base,
  query,
  onClose,
  onSaved,
}: {
  workspaceSlug: string;
  teamKey: string | null;
  base: "active" | "backlog" | "all";
  query: string;
  onClose: () => void;
  onSaved: (viewId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(VIEW_COLORS[0]);
  const [personal, setPersonal] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const v = await createSavedView(workspaceSlug, {
          name: trimmed,
          description: description.trim() || undefined,
          icon_color: color,
          base,
          query,
          team_key: teamKey,
          personal,
        });
        onSaved(v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save view");
      }
    });
  }

  return (
    <div className="p-3">
      <div className="mb-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
        Save view
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="View name"
        className="w-full rounded-md border border-border-default bg-app px-2 py-1.5 text-small text-text-primary outline-none focus:border-border-strong"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        placeholder="Description (optional)"
        className="mt-2 w-full rounded-md border border-border-default bg-app px-2 py-1.5 text-mini text-text-secondary outline-none focus:border-border-strong"
      />
      <div className="mt-2 flex items-center gap-1.5">
        {VIEW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={clsx(
              "flex h-5 w-5 items-center justify-center rounded-sm",
              color === c && "ring-1 ring-text-secondary ring-offset-1 ring-offset-elevated"
            )}
            style={{ background: c }}
          >
            {color === c && <Check size={11} className="text-white" />}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setPersonal(true)}
          className={clsx(
            "flex-1 rounded-md border px-2 py-1 text-mini",
            personal
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border-subtle text-text-tertiary hover:bg-row-hover",
          )}
        >
          Personal
        </button>
        <button
          type="button"
          onClick={() => setPersonal(false)}
          className={clsx(
            "flex-1 rounded-md border px-2 py-1 text-mini",
            !personal
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border-subtle text-text-tertiary hover:bg-row-hover",
          )}
        >
          Workspace
        </button>
      </div>
      {error && <div className="mt-2 text-mini text-priority-urgent">{error}</div>}
      <div className="mt-3 flex justify-end gap-1.5">
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-accent px-2 py-1 text-mini text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save view"}
        </button>
      </div>
    </div>
  );
}
