"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  Edit3,
  Folders,
  Layers,
  Lock,
  MoreHorizontal,
  PanelRight,
  Star,
  Trash2,
  UserCircle2,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Avatar, StatusIcon } from "@/components/icons";
import { IssueRow } from "@/components/issue-row";
import { Popover } from "@/components/popover";
import {
  deleteSavedView,
  duplicateSavedView,
  patchSavedView,
  type Issue,
  type Label,
  type Member,
  type SavedView,
  type StateGroup,
} from "@/lib/api";

type Tab = "assignees" | "labels" | "projects" | "teams";

interface Group {
  name: string;
  group: StateGroup;
  position: number;
  issues: Issue[];
}

/**
 * Inline view detail. Renders the saved view as a real page so the right
 * info panel (Visibility / Owner / Assignees / Labels / Projects / Teams)
 * can toggle without leaving the URL. Header actions match real Linear:
 * favorite star, kebab menu, and a panel-toggle icon on the far right.
 */
export function ViewDetailBody({
  workspace,
  view,
  initialIssues,
  members,
  labels,
}: {
  workspace: string;
  view: SavedView;
  initialIssues: Issue[];
  members: Member[];
  labels: Label[];
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(view.favorite);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("assignees");

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      await patchSavedView(workspace, view.id, { favorite: next });
      router.refresh();
    } catch {
      setFavorite(!next);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete view "${view.name}"? This can't be undone.`)) return;
    try {
      await deleteSavedView(workspace, view.id);
      router.push(`/${workspace}/views`);
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

  const groups = useMemo(() => groupByState(initialIssues), [initialIssues]);
  const totalIssues = initialIssues.length;

  const breakdown = useMemo(
    () => computeBreakdown(initialIssues, members, labels),
    [initialIssues, members, labels],
  );

  const visibility = view.owner_id ? "Personal" : "Workspace";
  const visibilityIcon = view.owner_id ? (
    <Lock size={12} className="text-text-tertiary" />
  ) : (
    <Users size={12} className="text-text-tertiary" />
  );

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <span style={{ color: view.icon_color }}>
          <Layers size={15} strokeWidth={1.75} />
        </span>
        <h1 className="text-small font-semibold text-text-primary">{view.name}</h1>
        <button
          type="button"
          onClick={toggleFavorite}
          aria-label={favorite ? "Unfavorite" : "Favorite"}
          className={clsx(
            "rounded-md p-1 transition-colors",
            favorite ? "text-amber-400" : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
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
              onClick={toggle}
              aria-label="View actions"
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
              <MenuItem
                icon={<Edit3 size={12} />}
                label="Edit…"
                onClick={() => {
                  close();
                  router.push(`/${workspace}/views/new?scope=${view.scope ?? "issues"}`);
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

        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-label="Toggle info panel"
            aria-pressed={panelOpen}
            className={clsx(
              "rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
              panelOpen && "bg-row-hover text-text-secondary",
            )}
          >
            <PanelRight size={13} />
          </button>
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-12 pt-4">
            <div className="mb-2 px-2 text-mini text-text-tertiary">{totalIssues} {totalIssues === 1 ? "issue" : "issues"}</div>
            {groups.map((g) => (
              <section key={g.name} className="mb-1">
                <header className="flex h-[36px] items-center gap-2 px-2 text-mini">
                  <ChevronDown size={11} className="text-text-tertiary" />
                  <StatusIcon group={g.group} />
                  <span className="font-medium text-text-primary">{g.name}</span>
                  <span className="text-text-tertiary">{g.issues.length}</span>
                </header>
                <ul>
                  {g.issues.map((i) => (
                    <IssueRow key={i.id} issue={i} workspaceSlug={workspace} />
                  ))}
                </ul>
              </section>
            ))}
            {groups.length === 0 && (
              <div className="px-4 py-12 text-center text-mini text-text-tertiary">
                No issues match this view.
              </div>
            )}
          </div>
        </div>

        {panelOpen && (
          <aside className="flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border-subtle p-4">
            <header className="flex items-center gap-2">
              <span style={{ color: view.icon_color }}>
                <Layers size={14} strokeWidth={1.75} />
              </span>
              <span className="flex-1 truncate text-small font-semibold text-text-primary">{view.name}</span>
              <button
                type="button"
                onClick={toggleFavorite}
                className={clsx("rounded-md p-1", favorite ? "text-amber-400" : "text-text-tertiary hover:text-text-secondary")}
                aria-label={favorite ? "Unfavorite" : "Favorite"}
              >
                <Star size={12} fill={favorite ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                aria-label="More"
                className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
              >
                <MoreHorizontal size={12} />
              </button>
            </header>
            {view.description && (
              <p className="text-mini text-text-tertiary">{view.description}</p>
            )}
            <div className="space-y-1.5 rounded-md text-mini">
              <PanelRow label="Visibility" value={
                <span className="flex items-center gap-1.5 text-text-primary">
                  {visibilityIcon}
                  {visibility}
                </span>
              } />
              <PanelRow label="Owner" value={
                view.owner ? (
                  <span className="flex items-center gap-1.5 text-text-primary">
                    <Avatar initials={view.owner.initials} color={view.owner.color} size={14} />
                    {view.owner.name}
                  </span>
                ) : (
                  <span className="text-text-tertiary">Shared</span>
                )
              } />
            </div>

            <div className="mt-2 flex items-center gap-1 border-b border-border-subtle">
              <TabPill active={tab === "assignees"} onClick={() => setTab("assignees")} label="Assignees" />
              <TabPill active={tab === "labels"} onClick={() => setTab("labels")} label="Labels" />
              <TabPill active={tab === "projects"} onClick={() => setTab("projects")} label="Projects" />
              <TabPill active={tab === "teams"} onClick={() => setTab("teams")} label="Teams" />
            </div>

            <ul className="space-y-0.5 text-small">
              {breakdown[tab].map((entry) => (
                <li key={entry.key} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-row-hover">
                  <span className="flex min-w-0 items-center gap-2">
                    {entry.icon}
                    <span className="truncate text-text-primary">{entry.label}</span>
                  </span>
                  <span className="shrink-0 text-mini text-text-tertiary">{entry.count}</span>
                </li>
              ))}
              {breakdown[tab].length === 0 && (
                <li className="px-2 py-3 text-center text-mini text-text-tertiary">No {tab} in this view</li>
              )}
            </ul>
          </aside>
        )}
      </div>
    </>
  );
}

function PanelRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-tertiary">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TabPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative -mb-px border-b-2 px-2 py-1.5 text-mini transition-colors",
        active
          ? "border-text-primary text-text-primary"
          : "border-transparent text-text-tertiary hover:text-text-secondary",
      )}
    >
      {label}
    </button>
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

function groupByState(issues: Issue[]): Group[] {
  const map = new Map<string, Group>();
  for (const i of issues) {
    const key = i.state.name;
    if (!map.has(key)) {
      map.set(key, { name: i.state.name, group: i.state.group, position: i.state.position, issues: [] });
    }
    map.get(key)!.issues.push(i);
  }
  return [...map.values()].sort((a, b) => a.position - b.position);
}

interface BreakdownEntry {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
}

function computeBreakdown(
  issues: Issue[],
  _members: Member[],
  _labels: Label[],
): Record<Tab, BreakdownEntry[]> {
  const byAssignee = new Map<string, BreakdownEntry>();
  const byLabel = new Map<string, BreakdownEntry>();
  const byProject = new Map<string, BreakdownEntry>();
  const byTeam = new Map<string, BreakdownEntry>();

  for (const issue of issues) {
    // Assignees
    if (issue.assignee) {
      const k = issue.assignee.id;
      if (!byAssignee.has(k)) {
        byAssignee.set(k, {
          key: k,
          label: issue.assignee.name,
          count: 0,
          icon: <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={14} />,
        });
      }
      byAssignee.get(k)!.count += 1;
    } else {
      const k = "_unassigned";
      if (!byAssignee.has(k)) {
        byAssignee.set(k, {
          key: k,
          label: "No assignee",
          count: 0,
          icon: <UserCircle2 size={12} className="text-text-tertiary" />,
        });
      }
      byAssignee.get(k)!.count += 1;
    }

    // Labels
    if (issue.labels.length === 0) {
      const k = "_nolabel";
      if (!byLabel.has(k)) {
        byLabel.set(k, { key: k, label: "No labels", count: 0, icon: <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-border-strong" /> });
      }
      byLabel.get(k)!.count += 1;
    } else {
      for (const l of issue.labels) {
        if (!byLabel.has(l.id)) {
          byLabel.set(l.id, {
            key: l.id,
            label: l.name,
            count: 0,
            icon: <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />,
          });
        }
        byLabel.get(l.id)!.count += 1;
      }
    }

    // Projects
    if (issue.project_id) {
      const k = issue.project_id;
      if (!byProject.has(k)) {
        byProject.set(k, {
          key: k,
          label: issue.project_name ?? "Project",
          count: 0,
          icon: <Folders size={12} className="text-text-tertiary" />,
        });
      }
      byProject.get(k)!.count += 1;
    } else {
      const k = "_noproject";
      if (!byProject.has(k)) {
        byProject.set(k, {
          key: k,
          label: "No project",
          count: 0,
          icon: <Folders size={12} className="text-text-tertiary" />,
        });
      }
      byProject.get(k)!.count += 1;
    }

    // Teams
    const tk = issue.team.key;
    if (!byTeam.has(tk)) {
      byTeam.set(tk, {
        key: tk,
        label: issue.team.name,
        count: 0,
        icon: <span className="inline-block h-3 w-3 rounded-sm" style={{ background: issue.team.icon_color }} />,
      });
    }
    byTeam.get(tk)!.count += 1;
  }

  function sorted(m: Map<string, BreakdownEntry>): BreakdownEntry[] {
    return [...m.values()].sort((a, b) => b.count - a.count);
  }

  return {
    assignees: sorted(byAssignee),
    labels: sorted(byLabel),
    projects: sorted(byProject),
    teams: sorted(byTeam),
  };
}
