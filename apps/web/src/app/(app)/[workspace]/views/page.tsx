import Link from "next/link";
import { Bookmark, Layers, Library, Plus, SlidersHorizontal, Star } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { getWorkspace, listSavedViews, type SavedView, type Team } from "@/lib/api";

const KBD = "rounded-sm border border-border-subtle bg-pill px-1 py-0.5 font-mono text-micro text-text-tertiary";

export default async function ViewsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { workspace } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "projects" ? "projects" : "issues";

  const [views, ws] = await Promise.all([
    listSavedViews(workspace),
    getWorkspace(workspace).catch(() => null),
  ]);
  const teams: Team[] = ws?.teams ?? [];
  const teamByKey = new Map(teams.map((t) => [t.key, t]));

  // Today every SavedView is an issue-view; project-views are a future kind.
  const visible = tab === "issues" ? views : [];
  const grouped = new Map<string, SavedView[]>();
  for (const v of visible) {
    const k = v.team_key || "_workspace";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(v);
  }

  return (
    <>
      <Topbar
        title="Views"
        icon={<Layers size={15} />}
        trailing={
          <Link
            href={`/${workspace}/views/new`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            aria-label="New view"
            title="New view"
          >
            <Plus size={14} />
          </Link>
        }
      />

      <div className="flex h-[40px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <TabLink workspace={workspace} value="issues" active={tab === "issues"}>
          Issues
        </TabLink>
        <TabLink workspace={workspace} value="projects" active={tab === "projects"}>
          Projects
        </TabLink>
        <button
          type="button"
          className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Filter"
          title="Filter"
        >
          <SlidersHorizontal size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <EmptyState tab={tab} workspace={workspace} />
        ) : (
          <div className="mx-auto max-w-[920px] p-6">
            {[...grouped.entries()].map(([key, list]) => (
              <section key={key} className="mb-8">
                <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
                  {key === "_workspace" ? (
                    <span>Workspace views</span>
                  ) : (
                    <>
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: teamByKey.get(key)?.icon_color ?? "#5e6ad2" }}
                      />
                      <span>{teamByKey.get(key)?.name ?? key}</span>
                      <span className="text-text-quaternary">{list.length}</span>
                    </>
                  )}
                </header>
                <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
                  {list.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/${workspace}/view/${v.id}`}
                        className="flex h-[44px] items-center gap-3 px-3 text-small hover:bg-row-hover"
                      >
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-sm"
                          style={{ background: v.icon_color }}
                        >
                          <Bookmark size={11} className="text-white/90" />
                        </span>
                        <span className="flex-1 truncate text-text-primary">{v.name}</span>
                        <span className="text-mini text-text-tertiary capitalize">{v.base}</span>
                        {v.favorite && <Star size={12} className="text-priority-medium" fill="currentColor" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TabLink({
  workspace,
  value,
  active,
  children,
}: {
  workspace: string;
  value: "issues" | "projects";
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/${workspace}/views?tab=${value}`}
      className={
        "rounded-md px-2 py-1 text-small " +
        (active
          ? "bg-row-selected text-text-primary"
          : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary")
      }
      scroll={false}
    >
      {children}
    </Link>
  );
}

function EmptyState({ tab, workspace }: { tab: "issues" | "projects"; workspace: string }) {
  const isProjects = tab === "projects";
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="max-w-[440px] text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-elevated text-text-tertiary">
          <Library size={34} />
        </div>
        <h2 className="text-default font-semibold text-text-primary">Views</h2>
        <p className="mt-2 text-mini text-text-tertiary">
          {isProjects
            ? "Save filters across your projects. Open the projects index, set your filters, and save the configuration to revisit it later."
            : "Create custom views using filters to show only the issues you want to see. You can save, share, and favorite these views for easy access and faster team collaboration."}
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-mini text-text-tertiary">
          You can also save any existing view by clicking the
          <Bookmark size={11} className="text-text-tertiary" />
          icon or by pressing
          <kbd className={KBD}>⌥</kbd>
          <kbd className={KBD}>V</kbd>
          .
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            href={`/${workspace}/views/new`}
            className="rounded-md bg-accent px-3 py-1.5 text-small font-medium text-white shadow-button hover:opacity-90"
          >
            Create new view
          </Link>
          <a
            href="https://linear.app/docs/views"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border-subtle bg-elevated px-3 py-1.5 text-small text-text-secondary hover:bg-elevated-hover"
          >
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
