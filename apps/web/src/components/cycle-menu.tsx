"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Bell,
  CalendarPlus,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  MoreHorizontal,
  Star,
} from "lucide-react";
import { Popover } from "@/components/popover";
import { patchCycle, type Cycle } from "@/lib/api";
import { downloadCycleICS, useCyclePrefs, type SubscribeMode } from "@/lib/cycle-prefs";

/**
 * 3-dot menu next to the cycle breadcrumb. Every row is wired:
 *   - Edit cycle name and description… → inline modal calling
 *     patchCycle({ name, description }).
 *   - Change cycle dates → submenu with start/end date inputs;
 *     patchCycle({ starts_at, ends_at }).
 *   - Subscribe to cycle notifications → submenu (none / all
 *     activity / important). Stored per-user in localStorage
 *     (cycle-prefs.ts).
 *   - Favorite → localStorage toggle, bound to Alt+F.
 *   - Copy link → writes the cycle URL to clipboard.
 *   - Subscribe to cycle calendar → submenu with "Download .ics"
 *     (generates a one-shot calendar file from the cycle's dates).
 */
export function CycleMenu({
  workspaceSlug,
  cycle,
  onCycleChange,
}: {
  workspaceSlug: string;
  cycle: Cycle;
  onCycleChange?: (next: Cycle) => void;
}) {
  const router = useRouter();
  const { prefs, update: updatePrefs } = useCyclePrefs(workspaceSlug, cycle.id);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cycle.name);
  const [editDescription, setEditDescription] = useState(cycle.description ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  // Keyboard shortcut: Alt+F toggles favorite.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        updatePrefs({ favorite: !prefs.favorite });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.favorite, updatePrefs]);

  async function saveEdit() {
    setSavingEdit(true);
    try {
      const updated = await patchCycle(workspaceSlug, cycle.id, {
        name: editName.trim() || cycle.name,
        description: editDescription,
      });
      onCycleChange?.(updated);
      setEditing(false);
      router.refresh();
    } catch (e) {
      console.error("cycle edit failed", e);
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveDates(startISO: string, endISO: string) {
    try {
      const updated = await patchCycle(workspaceSlug, cycle.id, {
        starts_at: new Date(startISO).toISOString(),
        ends_at: new Date(endISO).toISOString(),
      });
      onCycleChange?.(updated);
      router.refresh();
    } catch (e) {
      console.error("cycle dates failed", e);
    }
  }

  function copyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${workspaceSlug}/cycle/${cycle.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  return (
    <>
      <Popover
        align="end"
        width={260}
        surface="glass"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Cycle actions"
            className={clsx(
              "rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
              open && "bg-row-hover text-text-secondary",
            )}
          >
            <MoreHorizontal size={13} />
          </button>
        )}
      >
        {({ close }) => (
          <div className="py-1">
            <Row
              icon={<Edit3 size={12} />}
              label="Edit cycle name and description…"
              onClick={() => {
                close();
                setEditing(true);
              }}
            />
            <DatesSubmenu
              cycle={cycle}
              onSave={(s, e) => saveDates(s, e)}
            />
            <div className="my-1 border-t border-border-subtle" />
            <SubscribeSubmenu
              value={prefs.subscribe}
              onChange={(v) => updatePrefs({ subscribe: v })}
            />
            <Row
              icon={
                <Star
                  size={12}
                  className={prefs.favorite ? "fill-current text-amber-400" : ""}
                />
              }
              label={prefs.favorite ? "Unfavorite" : "Favorite"}
              trailing={<kbd className="rounded-sm border border-border-subtle bg-pill px-1 text-micro text-text-tertiary">Alt F</kbd>}
              onClick={() => {
                updatePrefs({ favorite: !prefs.favorite });
                close();
              }}
            />
            <Row
              icon={<Copy size={12} />}
              label="Copy link"
              onClick={() => {
                copyLink();
                close();
              }}
            />
            <CalendarSubmenu cycle={cycle} prefs={prefs} onUpdate={updatePrefs} />
          </div>
        )}
      </Popover>

      {editing && (
        <EditModal
          name={editName}
          description={editDescription}
          saving={savingEdit}
          onName={setEditName}
          onDescription={setEditDescription}
          onCancel={() => {
            setEditing(false);
            setEditName(cycle.name);
            setEditDescription(cycle.description ?? "");
          }}
          onSave={saveEdit}
        />
      )}
    </>
  );
}

function Row({
  icon,
  label,
  trailing,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
    >
      <span className="text-text-tertiary">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

function DatesSubmenu({
  cycle,
  onSave,
}: {
  cycle: Cycle;
  onSave: (startISO: string, endISO: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(cycle.starts_at.slice(0, 10));
  const [end, setEnd] = useState(cycle.ends_at.slice(0, 10));

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
      >
        <CalendarPlus size={12} className="text-text-tertiary" />
        <span className="flex-1">Change cycle dates</span>
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && (
        <div
          className="absolute left-full top-0 ml-1 w-[260px] rounded-md bg-elevated p-3 shadow-popover"
          onMouseEnter={() => setOpen(true)}
        >
          <label className="flex items-center justify-between gap-2 py-1 text-mini text-text-secondary">
            <span>Start</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-sm bg-input px-1.5 py-0.5 text-mini text-text-primary"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-1 text-mini text-text-secondary">
            <span>End</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-sm bg-input px-1.5 py-0.5 text-mini text-text-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onSave(start, end);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md bg-accent px-2 py-1 text-mini font-medium text-white hover:opacity-90"
          >
            Save dates
          </button>
        </div>
      )}
    </div>
  );
}

function SubscribeSubmenu({
  value,
  onChange,
}: {
  value: SubscribeMode;
  onChange: (v: SubscribeMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const OPTIONS: { v: SubscribeMode; label: string; hint: string }[] = [
    { v: "none", label: "None", hint: "No notifications" },
    { v: "important", label: "Important", hint: "Only at start / end / completion" },
    { v: "all", label: "All activity", hint: "Every issue change in the cycle" },
  ];

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
      >
        <Bell size={12} className="text-text-tertiary" />
        <span className="flex-1">Subscribe to cycle notifications</span>
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && (
        <div
          className="absolute left-full top-0 ml-1 w-[240px] rounded-md bg-elevated py-1 shadow-popover"
          onMouseEnter={() => setOpen(true)}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => {
                onChange(o.v);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              <span className="mt-0.5 inline-flex h-3.5 w-3.5 items-center justify-center">
                {value === o.v ? <Check size={11} className="text-accent" /> : null}
              </span>
              <span>
                <span className="block text-text-primary">{o.label}</span>
                <span className="block text-mini text-text-tertiary">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarSubmenu({
  cycle,
  prefs,
  onUpdate,
}: {
  cycle: Cycle;
  prefs: ReturnType<typeof useCyclePrefs>["prefs"];
  onUpdate: (patch: Partial<ReturnType<typeof useCyclePrefs>["prefs"]>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
      >
        <Bell size={12} className="text-text-tertiary" />
        <span className="flex-1">Subscribe to cycle calendar</span>
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && (
        <div
          className="absolute left-full top-0 ml-1 w-[240px] rounded-md bg-elevated py-1 shadow-popover"
          onMouseEnter={() => setOpen(true)}
        >
          <button
            type="button"
            onClick={() => {
              downloadCycleICS({
                cycleName: cycle.name,
                description: cycle.description,
                startsAt: cycle.starts_at,
                endsAt: cycle.ends_at,
              });
              onUpdate({ calendar_subscribed: true });
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
          >
            <CalendarPlus size={12} className="text-text-tertiary" />
            <span>Download .ics</span>
          </button>
          {prefs.calendar_subscribed && (
            <div className="px-2.5 py-1.5 text-mini text-text-tertiary">
              Already added to your calendar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditModal({
  name,
  description,
  saving,
  onName,
  onDescription,
  onCancel,
  onSave,
}: {
  name: string;
  description: string;
  saving: boolean;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-[460px] rounded-lg border border-border-subtle bg-elevated p-4 shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-default font-semibold text-text-primary">Edit cycle</h2>
        <label className="mt-3 block text-mini text-text-tertiary">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && !e.shiftKey) onSave();
          }}
          className="mt-1 w-full rounded-md border border-border-default bg-app px-2 py-1.5 text-small text-text-primary outline-none focus:border-border-strong"
        />
        <label className="mt-3 block text-mini text-text-tertiary">Description</label>
        <textarea
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-md border border-border-default bg-app px-2 py-1.5 text-small text-text-primary outline-none focus:border-border-strong"
          placeholder="Optional — what's this cycle focused on?"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1 text-mini text-text-secondary hover:bg-row-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1 text-mini font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
