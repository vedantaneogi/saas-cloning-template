"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, Check } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { createSavedView } from "@/lib/api";

const VIEW_COLORS = ["#5e6ad2", "#26b5ce", "#4cb782", "#f2c94c", "#eb5757", "#bb87fc", "#95a2b3"];

export function SaveViewButton({
  workspaceSlug,
  teamKey,
  base,
}: {
  workspaceSlug: string;
  teamKey: string;
  base: "active" | "backlog" | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const qs = params.toString();
  const hasCustomization = qs.length > 0;

  if (!hasCustomization) return null;

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
          <span>Save</span>
        </button>
      )}
      align="end"
      width={260}
    >
      {({ close }) => (
        <SaveViewForm
          workspaceSlug={workspaceSlug}
          teamKey={teamKey}
          base={base}
          query={qs}
          onClose={close}
          onSaved={(viewId) => {
            close();
            router.refresh();
            router.push(`/${workspaceSlug}/team/${teamKey}/view/${viewId}`);
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
  teamKey: string;
  base: "active" | "backlog" | "all";
  query: string;
  onClose: () => void;
  onSaved: (viewId: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(VIEW_COLORS[0]);
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
          icon_color: color,
          base,
          query,
          team_key: teamKey,
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
