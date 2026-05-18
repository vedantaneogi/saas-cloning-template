import Link from "next/link";
import { Layers, Plus, Star } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ViewsDisplayOptions, ViewsTabPill } from "@/components/views-display-options";
import { ViewRow } from "@/components/view-row";
import { getMe, listSavedViews, type SavedView } from "@/lib/api";

export default async function ViewsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ tab?: string; sort?: string; props?: string }>;
}) {
  const { workspace } = await params;
  const sp = await searchParams;
  const tab: "issues" | "projects" = sp.tab === "projects" ? "projects" : "issues";
  const sort = (sp.sort as "name" | "created" | "last_used") ?? "name";
  const props = (sp.props ?? "owner,last_used").split(",").filter(Boolean);

  const [views, me] = await Promise.all([
    listSavedViews(workspace, undefined, tab).catch(() => [] as SavedView[]),
    getMe().catch(() => null),
  ]);

  // owner_id is set for personal views; null for workspace-shared. The
  // signed-in member's id is what we compare against for "my views"
  // vs "shared with me" sectioning. getMe returns the user, so map via
  // workspace.members in a later iteration — for now we treat any view
  // whose owner.user_id matches the current user as theirs.
  const myUserId = me?.user.id ?? null;
  const favorites = views.filter((v) => v.favorite);
  const mine = views.filter((v) => !v.favorite && v.owner_id && (!myUserId || v.owner?.id !== undefined) && isMine(v, myUserId, me?.user.email ?? null));
  const shared = views.filter((v) => !v.favorite && (!v.owner_id || !isMine(v, myUserId, me?.user.email ?? null)));

  function sorted(rows: SavedView[]): SavedView[] {
    const arr = [...rows];
    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "created") arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    else if (sort === "last_used") arr.sort((a, b) => (b.last_used_at ?? "").localeCompare(a.last_used_at ?? ""));
    return arr;
  }

  return (
    <>
      <Topbar
        title="Views"
        icon={<Layers size={15} />}
        trailing={
          <Link
            href={`/${workspace}/views/new?scope=${tab}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            aria-label="New view"
            title="Create new view"
          >
            <Plus size={14} />
          </Link>
        }
      />

      <div className="flex h-[44px] shrink-0 items-center gap-2 px-4 pt-2">
        <ViewsTabPill workspace={workspace} value="issues" active={tab === "issues"}>
          Issues
        </ViewsTabPill>
        <ViewsTabPill workspace={workspace} value="projects" active={tab === "projects"}>
          Projects
        </ViewsTabPill>
        <div className="ml-auto">
          <ViewsDisplayOptions workspace={workspace} tab={tab} sort={sort} props={props} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-2">
          <HeaderRow props={props} sort={sort} />

          {favorites.length > 0 && (
            <Section icon={<Star size={11} className="text-amber-400" fill="currentColor" />} title="Favorites">
              {sorted(favorites).map((v) => (
                <ViewRow key={v.id} view={v} workspace={workspace} props={props} />
              ))}
            </Section>
          )}

          {mine.length > 0 && (
            <Section title="My views" subtitle="Only visible to you">
              {sorted(mine).map((v) => (
                <ViewRow key={v.id} view={v} workspace={workspace} props={props} />
              ))}
            </Section>
          )}

          {shared.length > 0 && (
            <Section title="Workspace views" subtitle="Shared with everyone">
              {sorted(shared).map((v) => (
                <ViewRow key={v.id} view={v} workspace={workspace} props={props} />
              ))}
            </Section>
          )}

          {views.length === 0 && (
            <EmptyState workspace={workspace} tab={tab} />
          )}
        </div>
      </div>
    </>
  );
}

function isMine(v: SavedView, myUserId: string | null, myEmail: string | null): boolean {
  if (!v.owner_id) return false;
  if (!v.owner) return false;
  // We don't have user_id on the member payload yet, so fall back to
  // email (workspace member emails are unique). When that's wired up,
  // compare owner.user.id === myUserId directly.
  if (myEmail && v.owner.email && v.owner.email === myEmail) return true;
  if (myUserId && v.owner_id === myUserId) return true;
  return false;
}

function HeaderRow({ props, sort }: { props: string[]; sort: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 px-2 pb-1 pt-1 text-mini text-text-tertiary">
      <span className="flex items-center gap-1">
        Name
        {sort === "name" && <span className="text-text-quaternary">↓</span>}
      </span>
      {props.includes("created") && (
        <span className="w-[80px] text-right">
          Created {sort === "created" && <span className="text-text-quaternary">↓</span>}
        </span>
      )}
      {props.includes("last_used") && (
        <span className="w-[80px] text-right">
          Last used {sort === "last_used" && <span className="text-text-quaternary">↓</span>}
        </span>
      )}
      {props.includes("owner") && <span className="w-[24px] text-right">Owner</span>}
      <span className="w-[60px]" aria-hidden />
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <header className="flex items-center gap-2 px-2 pb-1 pt-3 text-mini">
        {icon ?? <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-elevated text-[8px] text-text-tertiary">·</span>}
        <span className="font-medium text-text-secondary">{title}</span>
        {subtitle && <span className="text-text-quaternary">· {subtitle}</span>}
      </header>
      <ul>{children}</ul>
    </section>
  );
}

function EmptyState({ workspace, tab }: { workspace: string; tab: "issues" | "projects" }) {
  return (
    <div className="mx-auto mt-12 max-w-[440px] rounded-lg border border-border-subtle bg-elevated/40 p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-elevated text-accent">
        <Layers size={18} strokeWidth={1.75} />
      </div>
      <h2 className="text-default font-semibold text-text-primary">
        No saved {tab === "projects" ? "project" : "issue"} views yet
      </h2>
      <p className="mt-1 text-mini text-text-tertiary">
        Save your filtered list of {tab} as a view to come back to it anytime — yours
        only or shared with the workspace.
      </p>
      <Link
        href={`/${workspace}/views/new?scope=${tab}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-mini font-medium text-white hover:opacity-90"
      >
        <Plus size={12} />
        New view
      </Link>
    </div>
  );
}
