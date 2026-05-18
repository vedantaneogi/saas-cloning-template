"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Bookmark, Copy, Layers, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Popover } from "@/components/popover";
import {
  deleteSavedView,
  duplicateSavedView,
  listSavedViews,
  patchSavedView,
  type SavedView,
} from "@/lib/api";

/**
 * Inline saved-view bar for /team/[teamKey]/[view]. Drops between the
 * All/Active/Backlog pill row and the right-hand chip cluster. Lists
 * every issue-scoped saved view bound to this team; the trailing
 * "Create new view" icon button opens /views/new with the team
 * pre-bound via ?team=<teamKey>.
 */
export function TeamIssueViewsBar({
  workspaceSlug,
  teamKey,
  activeViewId,
}: {
  workspaceSlug: string;
  teamKey: string;
  activeViewId: string | null;
}) {
  const router = useRouter();
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    let cancelled = false;
    function load() {
      listSavedViews(workspaceSlug, teamKey, "issues")
        .then((rows) => {
          if (!cancelled) setViews(rows);
        })
        .catch(() => {});
    }
    load();
    function onChange() {
      load();
    }
    window.addEventListener("projects-views:changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("projects-views:changed", onChange);
    };
  }, [workspaceSlug, teamKey]);

  async function toggleFavorite(v: SavedView) {
    try {
      await patchSavedView(workspaceSlug, v.id, { favorite: !v.favorite });
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
    } catch (e) {
      console.error(e);
    }
  }
  async function remove(v: SavedView) {
    if (!confirm(`Delete view "${v.name}"? This can't be undone.`)) return;
    try {
      await deleteSavedView(workspaceSlug, v.id);
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
    } catch (e) {
      console.error(e);
    }
  }
  async function duplicate(v: SavedView) {
    try {
      await duplicateSavedView(workspaceSlug, v.id, v.name);
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
    } catch (e) {
      console.error(e);
    }
  }
  function copyLink(v: SavedView) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${workspaceSlug}/view/${v.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  return (
    <>
      {views.map((v) => (
        <span key={v.id} className="group inline-flex items-center">
          <Link
            href={`/${workspaceSlug}/view/${v.id}`}
            className={clsx(
              "flex h-7 items-center gap-1.5 rounded-full border px-3 text-mini transition-colors",
              activeViewId === v.id
                ? "border-border-strong bg-row-selected text-text-primary"
                : "border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
            title={v.description ?? undefined}
          >
            <Bookmark size={11} style={{ color: v.icon_color }} />
            <span>{v.name}</span>
          </Link>
          <Popover
            align="start"
            width={180}
            surface="glass"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={`Actions for view ${v.name}`}
                className={clsx(
                  "ml-0.5 rounded-md p-1 text-text-quaternary opacity-0 transition-opacity hover:bg-row-hover hover:text-text-secondary group-hover:opacity-100",
                  open && "opacity-100 text-text-secondary",
                )}
              >
                <MoreHorizontal size={11} />
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <MenuItem
                  icon={<Copy size={12} />}
                  label="Copy link"
                  onClick={() => {
                    copyLink(v);
                    close();
                  }}
                />
                <MenuItem
                  icon={
                    <Star
                      size={12}
                      className={clsx(v.favorite && "fill-current text-priority-medium")}
                    />
                  }
                  label={v.favorite ? "Unfavorite" : "Favorite"}
                  onClick={() => {
                    toggleFavorite(v);
                    close();
                  }}
                />
                <MenuItem
                  icon={<Pencil size={12} />}
                  label="Edit…"
                  onClick={() => {
                    close();
                    router.push(`/${workspaceSlug}/view/${v.id}`);
                  }}
                />
                <MenuItem
                  icon={<Layers size={12} />}
                  label="Duplicate"
                  onClick={() => {
                    duplicate(v);
                    close();
                  }}
                />
                <MenuItem
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  danger
                  onClick={() => {
                    remove(v);
                    close();
                  }}
                />
              </div>
            )}
          </Popover>
        </span>
      ))}

      <Link
        href={`/${workspaceSlug}/views/new?scope=issues&team=${encodeURIComponent(teamKey)}`}
        aria-label="Create new view"
        title="Create new view"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
      >
        <Layers size={12} strokeWidth={1.75} />
      </Link>
    </>
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
      onClick={onClick}
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
