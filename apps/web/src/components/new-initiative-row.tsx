"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Compass, User as UserIcon } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { Avatar } from "@/components/icons";
import { createInitiative, type Initiative, type Member } from "@/lib/api";

/**
 * Inline create-initiative row mounted at the top of /initiatives when
 * the "+" trailing button is pressed. Matches image #22 exactly:
 * name input + summary input on the left, Target date + Owner pickers
 * underneath, with Cancel / Create on the right.
 */
export function NewInitiativeRow({
  workspaceSlug,
  members,
  defaultStatus,
  onCancel,
  onCreated,
}: {
  workspaceSlug: string;
  members: Member[];
  defaultStatus: "active" | "planned" | "completed";
  onCancel: () => void;
  onCreated: (next: Initiative) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [owner, setOwner] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const next = await createInitiative(workspaceSlug, {
        name: name.trim(),
        description: summary.trim() || undefined,
        status: defaultStatus,
        owner_id: owner?.id,
        target_date: target ? new Date(target).toISOString() : undefined,
      });
      onCreated(next);
      router.refresh();
    } catch (e) {
      console.error("create initiative failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3 border-b border-border-subtle bg-row-hover px-5 py-3">
      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-accent">
        <Compass size={11} className="text-white/90" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && !e.shiftKey && name.trim()) create();
          }}
          placeholder="New initiative"
          className="w-full bg-transparent text-small font-medium text-text-primary placeholder:text-text-quaternary focus:outline-none"
        />
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && !e.shiftKey && name.trim()) create();
          }}
          placeholder="Add a short summary..."
          className="w-full bg-transparent text-mini text-text-tertiary placeholder:text-text-quaternary focus:outline-none"
        />
        <div className="flex items-center gap-2 pt-1">
          <TargetDatePicker value={target} onChange={setTarget} />
          <OwnerPicker members={members} value={owner} onChange={setOwner} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || busy}
          className="rounded-md bg-accent px-2.5 py-1 text-mini font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}

function TargetDatePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Popover
      align="start"
      width={220}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-pill border border-border-subtle px-2.5 py-1 text-mini transition-colors hover:bg-row-hover",
            value ? "text-text-primary" : "text-text-tertiary",
            open && "border-border-strong",
          )}
        >
          <Calendar size={11} className="text-text-tertiary" />
          <span>{value ? formatShort(value) : "Target date"}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="px-2 py-2">
          <input
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full rounded-md bg-input px-2 py-1.5 text-mini text-text-primary focus:outline-none"
          />
          <div className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={() => { onChange(null); close(); }}
              className="rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md bg-accent px-2 py-1 text-mini font-medium text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function OwnerPicker({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: Member | null;
  onChange: (m: Member | null) => void;
}) {
  return (
    <Popover
      align="start"
      width={240}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-pill border border-border-subtle px-2.5 py-1 text-mini transition-colors hover:bg-row-hover",
            value ? "text-text-primary" : "text-text-tertiary",
            open && "border-border-strong",
          )}
        >
          {value ? (
            <Avatar initials={value.initials} color={value.color} size={14} />
          ) : (
            <UserIcon size={11} className="text-text-tertiary" />
          )}
          <span>{value ? value.name : "Owner"}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <button
            type="button"
            onClick={() => { onChange(null); close(); }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
          >
            <span className="inline-block h-4 w-4 rounded-pill border border-dashed border-border-strong" />
            <span className="flex-1">No owner</span>
            {value === null && <Check size={11} className="text-accent" />}
          </button>
          {members.map((m) => {
            const active = value?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m); close(); }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
              >
                <Avatar initials={m.initials} color={m.color} size={16} />
                <span className="flex-1 truncate">{m.name}</span>
                {active && <Check size={11} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
