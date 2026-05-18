"use client";

import { useEffect, useState } from "react";
import { Copy, Layers, MoreHorizontal, Pencil, Star, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  patchSavedView,
  type SavedView,
} from "@/lib/api";
import { useProjectsPrefs, type ProjectsPrefs } from "@/lib/projects-prefs";

/**
 * The pill row next to "All projects". Renders:
 *   - "All projects" base pill
 *   - one pill per saved project view (icon + name + hover-only 3-dot menu)
 *   - one icon-only "Create new view" button (the small layered glyph)
 * Saving a view dispatches a toast event the page picks up to show "Your
 * view was successfully created. Open view".
 */
export function ProjectsViewsBar({
  workspaceSlug,
  teamKey,
  onEnterCreate,
  onEnterEdit,
  isCreating,
  activeViewId,
  onSelectView,
}: {
  workspaceSlug: string;
  /**
   * When set, only views bound to this team (or scoped here) are
   * surfaced; the bar also creates views with `team_key` pre-set.
   * Workspace projects page leaves this undefined to list every
   * project view.
   */
  teamKey?: string;
  onEnterCreate: () => void;
  onEnterEdit?: (v: SavedView) => void;
  isCreating: boolean;
  activeViewId: string | null;
  onSelectView: (v: SavedView | null) => void;
}) {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    let cancelled = false;
    listSavedViews(workspaceSlug, teamKey, "projects")
      .then((rows) => {
        if (!cancelled) setViews(rows);
      })
      .catch(() => {});
    function onChange() {
      listSavedViews(workspaceSlug, teamKey, "projects").then(setViews).catch(() => {});
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
    try {
      await deleteSavedView(workspaceSlug, v.id);
      if (activeViewId === v.id) onSelectView(null);
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
    } catch (e) {
      console.error(e);
    }
  }
  async function duplicate(v: SavedView) {
    try {
      await createSavedView(workspaceSlug, {
        name: `${v.name} copy`,
        description: v.description ?? undefined,
        scope: "projects",
        query: v.query,
        icon_color: v.icon_color,
        team_key: teamKey ?? v.team_key ?? null,
      });
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
    } catch (e) {
      console.error(e);
    }
  }
  function copyLink(v: SavedView) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${workspaceSlug}/projects?view_id=${v.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onSelectView(null)}
        className={clsx(
          "rounded-pill px-2.5 py-1 text-mini",
          activeViewId === null
            ? "bg-row-selected text-text-primary"
            : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
        )}
      >
        All projects
      </button>

      {views.map((v) => (
        <span key={v.id} className="group inline-flex items-center">
          <button
            type="button"
            onClick={() => onSelectView(v)}
            title={v.description ?? undefined}
            className={clsx(
              "rounded-pill px-2.5 py-1 text-mini",
              activeViewId === v.id
                ? "bg-row-selected text-text-primary"
                : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Layers size={11} style={{ color: v.icon_color }} />
              <span>{v.name}</span>
            </span>
          </button>
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
                <ViewMenuItem
                  icon={<Copy size={12} className="text-text-tertiary" />}
                  label="Copy link"
                  onClick={() => {
                    copyLink(v);
                    close();
                  }}
                />
                <ViewMenuItem
                  icon={
                    <Star
                      size={12}
                      className={clsx(
                        "text-text-tertiary",
                        v.favorite && "fill-current text-priority-medium",
                      )}
                    />
                  }
                  label={v.favorite ? "Unfavorite" : "Favorite"}
                  onClick={() => {
                    toggleFavorite(v);
                    close();
                  }}
                />
                <ViewMenuItem
                  icon={<Pencil size={12} className="text-text-tertiary" />}
                  label="Edit…"
                  onClick={() => {
                    close();
                    onEnterEdit?.(v);
                  }}
                />
                <ViewMenuItem
                  icon={<Layers size={12} className="text-text-tertiary" />}
                  label="Duplicate…"
                  onClick={() => {
                    duplicate(v);
                    close();
                  }}
                />
                <ViewMenuItem
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

      <button
        type="button"
        onClick={onEnterCreate}
        disabled={isCreating}
        title="Create new view"
        aria-label="Create new view"
        className={clsx(
          "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors",
          isCreating
            ? "bg-row-selected text-text-primary"
            : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
        )}
      >
        <Layers size={13} />
      </button>
    </>
  );
}

function ViewMenuItem({
  icon,
  label,
  onClick,
  danger = false,
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
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * Inline name+description editor that mounts under the toolbar when
 * the user enters create-view mode. Save serializes the current
 * ProjectsPrefs (minus per-view-irrelevant flags like insights_open)
 * to the SavedView.query field as JSON. Also handles edit mode for
 * an existing view via `editing`.
 */
export function ProjectsViewEditor({
  workspaceSlug,
  teamKey,
  prefs,
  editing,
  onClose,
}: {
  workspaceSlug: string;
  teamKey?: string;
  prefs: ProjectsPrefs;
  editing?: SavedView | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const cleanPrefs = { ...prefs };
      cleanPrefs.insights_open = false;
      const body = {
        name: name.trim() || "Untitled view",
        description: description.trim() || undefined,
        scope: "projects" as const,
        query: JSON.stringify(cleanPrefs),
        icon_color:
          prefs.view === "board"
            ? "#26b5ce"
            : prefs.view === "timeline"
              ? "#bc7cf0"
              : "#5e6ad2",
        team_key: teamKey ?? editing?.team_key ?? null,
      };
      const saved = editing
        ? await patchSavedView(workspaceSlug, editing.id, body)
        : await createSavedView(workspaceSlug, body);
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
      window.dispatchEvent(
        new CustomEvent("projects-views:toast", {
          detail: {
            view: saved,
            kind: editing ? "updated" : "created",
          },
        }),
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-border-subtle bg-elevated/40 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
          <Layers size={14} />
        </span>
        <div className="flex-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) save();
              if (e.key === "Escape") onClose();
            }}
            placeholder="All projects"
            className="w-full bg-transparent text-small font-medium text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="mt-1 w-full bg-transparent text-mini text-text-secondary placeholder:text-text-quaternary focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-accent px-2.5 py-1 text-mini font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating success toast shown after a view is created/updated. The
 * editor dispatches `projects-views:toast` and we render a self-dismissing
 * pill in the bottom-left of the viewport (matches Linear's reference).
 */
export function ProjectsViewToast({ workspaceSlug }: { workspaceSlug: string }) {
  const [toast, setToast] = useState<{ view: SavedView; kind: "created" | "updated" } | null>(null);

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<{ view: SavedView; kind: "created" | "updated" }>;
      setToast(ce.detail);
      // Auto-dismiss after 5s.
      window.setTimeout(() => setToast(null), 5000);
    }
    window.addEventListener("projects-views:toast", onToast);
    return () => window.removeEventListener("projects-views:toast", onToast);
  }, []);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[1300]">
      <div className="pointer-events-auto flex items-start gap-3 rounded-lg border border-white/[0.08] bg-elevated/95 px-3 py-2.5 shadow-popover backdrop-blur-xl">
        <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckGlyph />
        </span>
        <div className="flex-1">
          <p className="text-small text-text-primary">
            Your view was successfully {toast.kind === "updated" ? "updated" : "created"}.
          </p>
          <a
            href={`/${workspaceSlug}/projects?view_id=${toast.view.id}`}
            className="text-mini text-accent hover:underline"
          >
            Open view
          </a>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Dismiss"
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3">
      <path
        d="M4 8.5 L7 11 L12 5.5"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// useProjectsPrefs import kept here in case the editor switches to
// reading prefs directly from the hook; ignore the no-op reference.
void useProjectsPrefs;
