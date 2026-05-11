"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Inbox,
  Search,
  PencilLine,
  Folders,
  Layers,
  MoreHorizontal,
  Target,
  Github,
  HelpCircle,
  CircleUser,
  Compass,
  PlusCircle,
  Star,
  AlertOctagon,
  FileText,
  Map as MapIcon,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import { getActiveCycle, getTriageCount, getUnreadCount, listSavedViews, patchSavedView, type Cycle, type SavedView, type Workspace, type Team } from "@/lib/api";

const VIEWER = { initials: "NM", color: "#5e6ad2" };

type Sections = "favorites" | "workspace" | "teams" | "try";

export function Sidebar({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname();
  const wsSlug = workspace.slug;

  const [sectionOpen, setSectionOpen] = useState<Record<Sections, boolean>>({
    favorites: true,
    workspace: true,
    teams: true,
    try: true,
  });
  const [teamOpen, setTeamOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(workspace.teams.map((t) => [t.key, true]))
  );

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const refreshViews = () => listSavedViews(wsSlug).then(setSavedViews).catch(() => {});
  useEffect(() => {
    refreshViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSlug, pathname]);

  const [activeCyclesByTeam, setActiveCyclesByTeam] = useState<Record<string, Cycle | null>>({});
  useEffect(() => {
    Promise.all(
      workspace.teams
        .filter((t) => t.cycles_enabled)
        .map((t) => getActiveCycle(wsSlug, t.key).then((c) => [t.key, c] as const).catch(() => [t.key, null] as const))
    ).then((entries) => setActiveCyclesByTeam(Object.fromEntries(entries)));
  }, [wsSlug, workspace.teams]);

  const [unread, setUnread] = useState<number>(0);
  useEffect(() => {
    getUnreadCount(wsSlug).then((r) => setUnread(r.unread)).catch(() => {});
  }, [wsSlug, pathname]);

  const [triageByTeam, setTriageByTeam] = useState<Record<string, number>>({});
  useEffect(() => {
    Promise.all(
      workspace.teams.map((t) =>
        getTriageCount(wsSlug, t.key).then((r) => [t.key, r.count] as const).catch(() => [t.key, 0] as const)
      )
    ).then((entries) => setTriageByTeam(Object.fromEntries(entries)));
  }, [wsSlug, workspace.teams, pathname]);
  const viewsByTeam = new Map<string, SavedView[]>();
  for (const v of savedViews) {
    if (!v.team_key) continue;
    const list = viewsByTeam.get(v.team_key) || [];
    list.push(v);
    viewsByTeam.set(v.team_key, list);
  }
  const favorites = savedViews.filter((v) => v.favorite);

  async function toggleFavorite(v: SavedView) {
    setSavedViews((prev) => prev.map((x) => (x.id === v.id ? { ...x, favorite: !x.favorite } : x)));
    try {
      await patchSavedView(wsSlug, v.id, { favorite: !v.favorite });
    } catch {
      // revert
      setSavedViews((prev) => prev.map((x) => (x.id === v.id ? { ...x, favorite: v.favorite } : x)));
    }
  }

  return (
    <aside className="flex h-screen w-sidebar shrink-0 select-none flex-col bg-sidebar text-small text-text-secondary">
      <div className="flex h-[44px] items-center gap-1 px-2.5">
        <button className="flex flex-1 items-center gap-2 truncate rounded-md px-1.5 py-1 text-default font-semibold text-text-primary hover:bg-row-hover">
          <Avatar initials={initialsFor(workspace.name)} color={workspace.icon_color} size={20} />
          <span className="truncate">{workspace.name.split(" ")[0]}</span>
          <ChevronRight size={12} className="ml-auto rotate-90 text-text-tertiary" />
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("command-palette:open"))}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Search"
        >
          <Search size={15} />
        </button>
        <button className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" aria-label="New issue">
          <PencilLine size={15} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-0.5">
        <NavItem
          href={`/${wsSlug}/inbox`}
          icon={<Inbox size={14} />}
          label="Inbox"
          active={pathname.endsWith("/inbox")}
          trailing={
            unread > 0 ? (
              <span className="rounded-sm bg-pill px-1 py-px text-micro text-text-tertiary">{unread}</span>
            ) : null
          }
        />
        <NavItem
          href={`/${wsSlug}/my/assigned`}
          icon={<CircleUser size={14} />}
          label="My issues"
          active={pathname.includes("/my/")}
        />

        {favorites.length > 0 && (
          <>
            <SectionHeader
              title="Favorites"
              open={sectionOpen.favorites}
              onToggle={() => setSectionOpen((s) => ({ ...s, favorites: !s.favorites }))}
            />
            {sectionOpen.favorites && (
              <div>
                {favorites.map((v) => (
                  <SavedViewRow
                    key={v.id}
                    view={v}
                    workspaceSlug={wsSlug}
                    pathname={pathname}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <SectionHeader
          title="Workspace"
          open={sectionOpen.workspace}
          onToggle={() => setSectionOpen((s) => ({ ...s, workspace: !s.workspace }))}
        />
        {sectionOpen.workspace && (
          <div>
            <NavItem href={`/${wsSlug}/views`} icon={<Layers size={14} />} label="Views" />
            <NavItem
              href={`/${wsSlug}/initiatives`}
              icon={<Compass size={14} />}
              label="Initiatives"
              active={pathname.endsWith("/initiatives") || pathname.includes("/initiative/")}
            />
            <NavItem
              href={`/${wsSlug}/roadmap`}
              icon={<MapIcon size={14} />}
              label="Roadmap"
              active={pathname.endsWith("/roadmap")}
            />
            <NavItem href={`/${wsSlug}/projects`} icon={<Folders size={14} />} label="Projects" />
            <NavItem
              href={`/${wsSlug}/documents`}
              icon={<FileText size={14} />}
              label="Documents"
              active={pathname.endsWith("/documents") || pathname.includes("/document/")}
            />
            <NavItem
              href={`/${wsSlug}/customer-requests`}
              icon={<Users size={14} />}
              label="Customer requests"
              active={pathname.endsWith("/customer-requests")}
            />
            <NavItem href={`/${wsSlug}/more`} icon={<MoreHorizontal size={14} />} label="More" />
          </div>
        )}

        <SectionHeader
          title="Your teams"
          open={sectionOpen.teams}
          onToggle={() => setSectionOpen((s) => ({ ...s, teams: !s.teams }))}
        />
        {sectionOpen.teams && (
          <div>
            {[...workspace.teams]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
                <TeamGroup
                  key={team.key}
                  team={team}
                  workspaceSlug={wsSlug}
                  pathname={pathname}
                  open={teamOpen[team.key] ?? true}
                  onToggle={() => setTeamOpen((m) => ({ ...m, [team.key]: !(m[team.key] ?? true) }))}
                  savedViews={viewsByTeam.get(team.key) || []}
                  onToggleFavorite={toggleFavorite}
                  activeCycle={activeCyclesByTeam[team.key] ?? null}
                  triageCount={triageByTeam[team.key] ?? 0}
                />
              ))}
          </div>
        )}

        <SectionHeader
          title="Try"
          open={sectionOpen.try}
          onToggle={() => setSectionOpen((s) => ({ ...s, try: !s.try }))}
          muted
        />
        {sectionOpen.try && (
          <div>
            <NavItem href="#" icon={<Layers size={14} />} label="Import issues" />
            <NavItem href="#" icon={<PlusCircle size={14} />} label="Invite people" />
            <NavItem href="#" icon={<Github size={14} />} label="Connect GitHub" />
          </div>
        )}
      </nav>

      <div className="flex items-center justify-between gap-2 px-3 py-2 text-micro text-text-tertiary">
        <button className="rounded-md p-1 hover:bg-row-hover" aria-label="Help">
          <HelpCircle size={14} />
        </button>
        <Link
          href={`/${wsSlug}/settings`}
          className={clsx(
            "ml-auto rounded-md p-1",
            pathname.includes("/settings") ? "bg-row-selected text-text-primary" : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          )}
          aria-label="Settings"
          title="Settings"
        >
          <MoreHorizontal size={14} />
        </Link>
        <Avatar initials={VIEWER.initials} color={VIEWER.color} size={20} />
      </div>
    </aside>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  muted,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "mt-4 flex w-full items-center gap-1 rounded-md px-2 pb-1 pt-0.5 text-micro font-medium uppercase tracking-wider transition-colors",
        muted ? "text-text-quaternary" : "text-text-tertiary",
        "hover:text-text-secondary"
      )}
    >
      <span>{title}</span>
      <ChevronRight
        size={10}
        className={clsx("transition-transform", open && "rotate-90")}
      />
    </button>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  trailing,
  nested,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  trailing?: React.ReactNode;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group flex h-[26px] items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
        active
          ? "bg-row-selected text-text-primary"
          : "text-text-secondary hover:bg-row-hover",
        nested && "ml-3"
      )}
    >
      <span className="shrink-0 text-text-tertiary">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </Link>
  );
}

function TeamGroup({
  team,
  workspaceSlug,
  pathname,
  open,
  onToggle,
  savedViews,
  onToggleFavorite,
  activeCycle,
  triageCount,
}: {
  team: Team;
  workspaceSlug: string;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  savedViews: SavedView[];
  onToggleFavorite: (v: SavedView) => void;
  activeCycle: Cycle | null;
  triageCount: number;
}) {
  const base = `/${workspaceSlug}/team/${team.key}`;
  return (
    <div className="mt-0.5">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-row-hover"
      >
        <ChevronRight
          size={10}
          className={clsx("text-text-tertiary transition-transform", open && "rotate-90")}
        />
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-sm"
          style={{ background: team.icon_color }}
        />
        <span className="truncate text-small font-medium text-text-primary">{team.name}</span>
      </button>
      {open && (
        <div className="ml-3.5">
          <NavItem
            href={`${base}/active`}
            icon={<Layers size={13} />}
            label="Issues"
            active={
              pathname.startsWith(`${base}/active`) ||
              pathname.startsWith(`${base}/backlog`) ||
              pathname.startsWith(`${base}/all`)
            }
          />
          {triageCount > 0 && (
            <NavItem
              href={`${base}/triage`}
              icon={<AlertOctagon size={13} />}
              label="Triage"
              active={pathname === `${base}/triage`}
              trailing={
                <span className="rounded-sm bg-pill px-1 py-px text-micro text-text-tertiary">{triageCount}</span>
              }
            />
          )}
          {team.cycles_enabled && (
            <>
              <NavItem
                href={`${base}/cycles`}
                icon={<Target size={13} />}
                label="Cycles"
                active={pathname === `${base}/cycles`}
              />
              {activeCycle && (
                <NavItem
                  href={`/${workspaceSlug}/cycle/${activeCycle.id}`}
                  icon={<Target size={13} />}
                  label={`Cycle ${activeCycle.number} (active)`}
                  active={pathname === `/${workspaceSlug}/cycle/${activeCycle.id}`}
                />
              )}
            </>
          )}
          <NavItem href={`${base}/projects`} icon={<Folders size={13} />} label="Projects" />
          <NavItem href={`${base}/views`} icon={<Compass size={13} />} label="Views" />
          {savedViews.map((v) => (
            <SavedViewRow
              key={v.id}
              view={v}
              workspaceSlug={workspaceSlug}
              pathname={pathname}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedViewRow({
  view,
  workspaceSlug,
  pathname,
  onToggleFavorite,
}: {
  view: SavedView;
  workspaceSlug: string;
  pathname: string;
  onToggleFavorite: (v: SavedView) => void;
}) {
  const href = `/${workspaceSlug}/view/${view.id}`;
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={clsx(
        "group flex h-[26px] items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
        active ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover"
      )}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ background: view.icon_color }}
      />
      <span className="flex-1 truncate">{view.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite(view);
        }}
        aria-label={view.favorite ? "Unfavorite" : "Favorite"}
        className={clsx(
          "rounded-sm p-0.5 transition-opacity",
          view.favorite ? "opacity-100 text-priority-medium" : "opacity-0 text-text-tertiary group-hover:opacity-100 hover:text-text-secondary"
        )}
      >
        <Star size={12} fill={view.favorite ? "currentColor" : "none"} />
      </button>
    </Link>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
