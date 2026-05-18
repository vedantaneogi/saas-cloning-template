"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Copy, Edit3, Layers, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { Avatar } from "@/components/icons";
import { Popover } from "@/components/popover";
import {
  deleteSavedView,
  duplicateSavedView,
  patchSavedView,
  type SavedView,
} from "@/lib/api";

/**
 * One row in the /views list. Click anywhere except the right-side actions
 * navigates to the view. The favorite star toggles inline; the 3-dot menu
 * exposes Edit / Duplicate / Copy link / Delete. Per Linear's pattern, the
 * actions only appear on row hover.
 */
export function ViewRow({
  view,
  workspace,
  props,
}: {
  view: SavedView;
  workspace: string;
  props: string[];
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(view.favorite);
  const [busy, setBusy] = useState(false);

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !favorite;
    setFavorite(next);
    try {
      await patchSavedView(workspace, view.id, { favorite: next });
      router.refresh();
    } catch {
      setFavorite(!next);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete view "${view.name}"? This can't be undone.`)) return;
    try {
      await deleteSavedView(workspace, view.id);
      router.refresh();
    } catch (e) {
      console.error("delete view failed", e);
    }
  }

  async function onDuplicate() {
    try {
      const copy = await duplicateSavedView(workspace, view.id, view.name);
      router.push(`/${workspace}/view/${copy.id}`);
    } catch (e) {
      console.error("duplicate view failed", e);
    }
  }

  function copyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${workspace}/view/${view.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  return (
    <li className="group">
      <Link
        href={`/${workspace}/view/${view.id}`}
        className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 rounded-md px-2 py-1.5 text-small hover:bg-row-hover"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span style={{ color: view.icon_color }}>
            <Layers size={14} strokeWidth={1.75} />
          </span>
          <span className="truncate font-medium text-text-primary">{view.name}</span>
          {view.description && (
            <span className="truncate text-mini text-text-tertiary">{view.description}</span>
          )}
        </span>

        {props.includes("created") && (
          <span className="w-[80px] text-right text-mini text-text-tertiary">{fmt(view.created_at)}</span>
        )}
        {props.includes("last_used") && (
          <span className="w-[80px] text-right text-mini text-text-tertiary">{fmt(view.last_used_at)}</span>
        )}
        {props.includes("owner") && (
          <span className="flex w-[24px] items-center justify-end">
            {view.owner ? (
              <Avatar initials={view.owner.initials} color={view.owner.color} size={18} />
            ) : (
              <span className="text-mini text-text-tertiary">—</span>
            )}
          </span>
        )}

        <span className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={favorite ? "Unfavorite" : "Favorite"}
            className={clsx(
              "rounded-md p-1 transition-colors",
              favorite
                ? "text-amber-400"
                : "text-text-tertiary opacity-0 hover:bg-elevated-hover hover:text-text-secondary group-hover:opacity-100",
            )}
          >
            <Star size={13} strokeWidth={1.75} fill={favorite ? "currentColor" : "none"} />
          </button>
          <Popover
            align="end"
            width={180}
            surface="glass"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle();
                }}
                aria-label="View actions"
                className={clsx(
                  "rounded-md p-1 text-text-tertiary transition-opacity",
                  open ? "bg-elevated-hover text-text-secondary opacity-100" : "opacity-0 hover:bg-elevated-hover hover:text-text-secondary group-hover:opacity-100",
                )}
              >
                <MoreHorizontal size={13} />
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <MenuItem
                  icon={<Edit3 size={12} />}
                  label="Edit…"
                  onClick={() => {
                    close();
                    router.push(`/${workspace}/view/${view.id}`);
                  }}
                />
                <MenuItem
                  icon={<Copy size={12} />}
                  label="Duplicate"
                  onClick={() => {
                    close();
                    onDuplicate();
                  }}
                />
                <MenuItem
                  icon={<Copy size={12} />}
                  label="Copy link"
                  onClick={() => {
                    close();
                    copyLink();
                  }}
                />
                <div className="my-1 border-t border-border-subtle" />
                <MenuItem
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  danger
                  onClick={() => {
                    close();
                    onDelete();
                  }}
                />
              </div>
            )}
          </Popover>
        </span>
      </Link>
    </li>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small hover:bg-white/5",
        danger ? "text-priority-urgent" : "text-text-secondary",
      )}
    >
      <span className="text-text-tertiary">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
