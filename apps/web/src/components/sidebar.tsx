"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Inbox,
  Search,
  PencilLine,
  Folders,
  Layers,
  Settings,
  Target,
  HelpCircle,
  CircleUser,
  Compass,
  Plus,
  Star,
  AlertOctagon,
  FileText,
  Map as MapIcon,
  Users,
  BarChart3,
  Check,
  LogOut,
  Repeat2,
  Moon,
  Sun,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import { TeamMenu } from "@/components/team-menu";
import { SidebarTrySection } from "@/components/sidebar-try-section";
import { SidebarWorkspaceNav } from "@/components/sidebar-workspace-nav";
import { useTeamFavorites } from "@/lib/team-prefs";
import { getActiveCycle, getTriageCount, getUnreadCount, listSavedViews, patchSavedView, logout, type Cycle, type Me, type SavedView, type Workspace, type Team } from "@/lib/api";

type Sections = "favorites" | "workspace" | "teams";

export function Sidebar({ workspace, me }: { workspace: Workspace; me: Me }) {
  const pathname = usePathname();
  const wsSlug = workspace.slug;
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switchSubOpen, setSwitchSubOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("lc-theme")) as "dark" | "light" | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("lc-theme", next);
    } catch {}
  }

  const [sectionOpen, setSectionOpen] = useState<Record<Sections, boolean>>({
    favorites: true,
    workspace: true,
    teams: true,
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
  const favTeamKeys = useTeamFavorites(wsSlug);
  const favoriteTeams = workspace.teams.filter((t) => favTeamKeys.has(t.key));
  const hasFavorites = favorites.length > 0 || favoriteTeams.length > 0;

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
      <div className="relative flex h-[48px] items-center gap-1 px-3">
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 truncate rounded-md px-1.5 py-1 text-default font-semibold text-text-primary hover:bg-row-hover"
        >
          <Avatar initials={initialsFor(workspace.name)} color={workspace.icon_color} size={22} />
          <span className="truncate">{workspace.name}</span>
          <ChevronRight size={12} className="ml-auto rotate-90 text-text-tertiary" />
        </button>
        {switcherOpen && (
          <div
            className="absolute left-2.5 top-[44px] z-30 w-[240px] rounded-md bg-elevated py-1 shadow-popover"
            onMouseLeave={() => { setSwitcherOpen(false); setSwitchSubOpen(false); }}
          >
            <Link
              href={`/${wsSlug}/settings`}
              onClick={() => setSwitcherOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-small text-text-secondary hover:bg-row-hover"
            >
              <Settings size={13} className="text-text-tertiary" />
              <span className="flex-1">Settings</span>
            </Link>
            <Link
              href={`/${wsSlug}/settings/members`}
              onClick={() => setSwitcherOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-small text-text-secondary hover:bg-row-hover"
            >
              <Users size={13} className="text-text-tertiary" />
              <span className="flex-1">Invite and manage members</span>
            </Link>

            <hr className="my-1 border-border-subtle" />

            <div
              className="relative"
              onMouseEnter={() => setSwitchSubOpen(true)}
              onMouseLeave={() => setSwitchSubOpen(false)}
            >
              <button
                type="button"
                onClick={() => setSwitchSubOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
              >
                <Repeat2 size={13} className="text-text-tertiary" />
                <span className="flex-1">Switch workspace</span>
                <ChevronRight size={11} className="text-text-tertiary" />
              </button>
              {switchSubOpen && (
                <div className="absolute left-full top-0 ml-1 w-[240px] rounded-md bg-elevated py-1 shadow-popover">
                  <div className="px-2.5 py-1 text-micro font-medium uppercase tracking-wider text-text-tertiary">Workspaces</div>
                  {me.workspaces.map((w) => (
                    <Link
                      key={w.id}
                      href={`/${w.slug}/inbox`}
                      onClick={() => { setSwitcherOpen(false); setSwitchSubOpen(false); }}
                      className={clsx(
                        "flex items-center gap-2 px-2.5 py-1.5 text-small",
                        w.slug === wsSlug ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover"
                      )}
                    >
                      <Avatar initials={initialsFor(w.name)} color={w.icon_color} size={18} />
                      <span className="flex-1 truncate">{w.name}</span>
                      {w.slug === wsSlug && <Check size={12} className="text-text-tertiary" />}
                    </Link>
                  ))}
                  <hr className="my-1 border-border-subtle" />
                  <Link
                    href="/new-workspace"
                    onClick={() => { setSwitcherOpen(false); setSwitchSubOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-small text-text-secondary hover:bg-row-hover"
                  >
                    <Plus size={13} className="text-text-tertiary" />
                    <span>Create or join a workspace…</span>
                  </Link>
                </div>
              )}
            </div>

            <hr className="my-1 border-border-subtle" />

            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              {theme === "dark" ? (
                <Sun size={13} className="text-text-tertiary" />
              ) : (
                <Moon size={13} className="text-text-tertiary" />
              )}
              <span className="flex-1">Switch to {theme === "dark" ? "light" : "dark"} theme</span>
            </button>

            <hr className="my-1 border-border-subtle" />

            <button
              onClick={async () => {
                setSwitcherOpen(false);
                await logout();
                router.push("/login");
                router.refresh();
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              <LogOut size={13} className="text-text-tertiary" />
              <span>Log out</span>
            </button>
          </div>
        )}
        {/*
          Clicking the magnifier now navigates to the dedicated /search
          page (Linear's pattern) instead of toggling the command-palette
          modal. The palette is still bindable via ⌘K — `command-palette:open`
          fires from keybindings — but this affordance is for finding
          things across the workspace with tabs, filters, and recents.
        */}
        <Link
          href={`/${wsSlug}/search`}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Search"
          title="Search (⌘K)"
        >
          <Search size={15} />
        </Link>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("create-issue:open"))}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="New issue"
          title="New issue (C)"
        >
          <PencilLine size={15} />
        </button>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-3 pt-0.5">
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

        <SectionHeader
          title="Workspace"
          open={sectionOpen.workspace}
          onToggle={() => setSectionOpen((s) => ({ ...s, workspace: !s.workspace }))}
        />
        {sectionOpen.workspace && (
          <SidebarWorkspaceNav workspaceSlug={wsSlug} pathname={pathname} />
        )}

        {hasFavorites && (
          <>
            <SectionHeader
              title="Favorites"
              open={sectionOpen.favorites}
              onToggle={() => setSectionOpen((s) => ({ ...s, favorites: !s.favorites }))}
            />
            {sectionOpen.favorites && (
              <div>
                {favoriteTeams.map((t) => (
                  <FavoriteTeamRow
                    key={t.key}
                    team={t}
                    workspaceSlug={wsSlug}
                    pathname={pathname}
                  />
                ))}
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
          title="Your teams"
          open={sectionOpen.teams}
          onToggle={() => setSectionOpen((s) => ({ ...s, teams: !s.teams }))}
          trailing={
            <Link
              href={`/${wsSlug}/settings/new-team`}
              aria-label="Create new team"
              title="Create new team"
              className="rounded-sm p-0.5 text-text-tertiary opacity-0 transition-opacity hover:bg-row-hover hover:text-text-secondary group-hover/section:opacity-100"
            >
              <Plus size={11} />
            </Link>
          }
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

        <SidebarTrySection workspaceSlug={wsSlug} />

      </nav>

      <div className="flex items-center gap-1 border-t border-border-subtle px-3 py-2 text-micro text-text-tertiary">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("shortcuts:open"))}
          className="rounded-md p-1 hover:bg-row-hover hover:text-text-secondary"
          aria-label="Help"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle size={14} />
        </button>
        <span className="ml-auto">
          <Avatar initials={me.user.initials} color={me.user.color} size={20} />
        </span>
      </div>
    </aside>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  muted,
  trailing,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  muted?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="group/section mt-4 flex items-center gap-1 px-2 pb-1 pt-0.5">
      <button
        onClick={onToggle}
        className={clsx(
          "flex flex-1 items-center gap-1 rounded-md text-micro font-medium uppercase tracking-wider transition-colors",
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
      {trailing}
    </div>
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
        "group flex h-[30px] items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
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
      <div className="group/team flex items-center rounded-md pr-1 hover:bg-row-hover">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-1.5 px-1.5 py-1 text-left"
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
        <TeamMenu team={team} workspaceSlug={workspaceSlug} />
      </div>
      {open && (
        <div className="ml-6">
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
          <NavItem href={`${base}/insights`} icon={<BarChart3 size={13} />} label="Insights" active={pathname === `${base}/insights`} />
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
        "group flex h-[30px] items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
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

function FavoriteTeamRow({
  team,
  workspaceSlug,
  pathname,
}: {
  team: Team;
  workspaceSlug: string;
  pathname: string;
}) {
  const href = `/${workspaceSlug}/team/${team.key}/active`;
  const active = pathname.startsWith(`/${workspaceSlug}/team/${team.key}`);
  return (
    <Link
      href={href}
      className={clsx(
        "group/team flex h-[30px] items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
        active ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover",
      )}
    >
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-sm"
        style={{ background: team.icon_color }}
      />
      <span className="flex-1 truncate font-medium text-text-primary">{team.name}</span>
      <ChevronRight size={10} className="text-text-tertiary opacity-0 transition-opacity group-hover/team:opacity-100" />
    </Link>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
