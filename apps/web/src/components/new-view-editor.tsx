"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronDown, Layers, Lock, Users } from "lucide-react";
import { Popover } from "@/components/popover";
import { createSavedView, type Team } from "@/lib/api";

type Scope = "issues" | "projects";

type SaveDestination =
  | { kind: "personal"; label: "Personal" }
  | { kind: "workspace"; label: "Workspace" }
  | { kind: "team"; team: Team };

/**
 * Inline editor for /views/new. Shows a name + description input plus a
 * "Save to" picker (Personal / Workspace / per-team) that controls where
 * the SavedView lands. Save POSTs a SavedView with empty filters — the
 * user can then open the view from /views and apply filters through the
 * normal funnel / display-options popovers.
 */
export function NewViewEditor({
  workspace,
  scope,
  teams,
  workspaceName,
}: {
  workspace: string;
  scope: Scope;
  teams: Team[];
  workspaceName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(scope === "projects" ? "All projects" : "All issues");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState<SaveDestination>({ kind: "personal", label: "Personal" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await createSavedView(workspace, {
        name: name.trim() || (scope === "projects" ? "All projects" : "All issues"),
        description: description.trim() || undefined,
        scope,
        // Empty query means "no extra filters" — the view shows the base list.
        query: "{}",
        icon_color: destination.kind === "team" ? destination.team.icon_color : "#5e6ad2",
        // For team-scoped views, attach team_key. Personal + Workspace both
        // sit at the workspace level (no team_key). Until the backend grows
        // an `owner_id` column, "Personal" and "Workspace" are visually
        // distinct but stored identically — the picker still controls the
        // view's eventual visibility once that lands.
        team_key: destination.kind === "team" ? destination.team.key : null,
      });
      window.dispatchEvent(new CustomEvent("projects-views:changed"));
      router.push(`/${workspace}/views?tab=${scope}`);
    } catch (e) {
      console.error("save view failed", e);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    router.push(`/${workspace}/views?tab=${scope}`);
  }

  return (
    <div className="border-b border-border-subtle px-6 py-4">
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
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="w-full bg-transparent text-default font-semibold text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="mt-1 w-full bg-transparent text-small text-text-secondary placeholder:text-text-quaternary focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 text-mini">
          <span className="text-text-tertiary">Save to</span>
          <Popover
            align="end"
            width={240}
            surface="glass"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.03] px-2 py-1 text-text-secondary hover:bg-white/[0.06]",
                  open && "bg-white/[0.06] text-text-primary",
                )}
              >
                <DestinationIcon dest={destination} />
                <span>{destinationLabel(destination)}</span>
                <ChevronDown size={10} />
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <DestRow
                  active={destination.kind === "personal"}
                  onClick={() => {
                    setDestination({ kind: "personal", label: "Personal" });
                    close();
                  }}
                  icon={<Lock size={12} className="text-text-tertiary" />}
                  label="Personal"
                />
                <DestRow
                  active={destination.kind === "workspace"}
                  onClick={() => {
                    setDestination({ kind: "workspace", label: "Workspace" });
                    close();
                  }}
                  icon={<Users size={12} className="text-text-tertiary" />}
                  label="Workspace"
                />
                {teams.length > 0 && (
                  <>
                    <div className="my-1 border-t border-border-subtle" />
                    {teams.map((t) => (
                      <DestRow
                        key={t.key}
                        active={destination.kind === "team" && destination.team.key === t.key}
                        onClick={() => {
                          setDestination({ kind: "team", team: t });
                          close();
                        }}
                        icon={
                          <span
                            className="inline-block h-3 w-3 rounded-sm"
                            style={{ background: t.icon_color }}
                          />
                        }
                        label={t.name}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </Popover>
          <button
            type="button"
            onClick={cancel}
            className="rounded-md px-2 py-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-accent px-2.5 py-1 font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <p className="mt-3 pl-10 text-mini text-text-tertiary">
        Filters are empty by default. After saving, open the view from{" "}
        <span className="text-text-secondary">Views › {name}</span> and apply
        filters with the funnel and display options to refine the list.
        {/* Avoid an unused-prop warning until we wire workspaceName into the dest-row label. */}
        <span className="hidden">{workspaceName}</span>
      </p>
    </div>
  );
}

function DestRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5",
        active && "text-text-primary",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {active && <Check size={12} className="text-text-secondary" />}
    </button>
  );
}

function DestinationIcon({ dest }: { dest: SaveDestination }) {
  if (dest.kind === "personal") return <Lock size={11} className="text-text-tertiary" />;
  if (dest.kind === "workspace") return <Users size={11} className="text-text-tertiary" />;
  return <span className="inline-block h-3 w-3 rounded-sm" style={{ background: dest.team.icon_color }} />;
}

function destinationLabel(dest: SaveDestination): string {
  if (dest.kind === "team") return dest.team.name;
  return dest.label;
}
