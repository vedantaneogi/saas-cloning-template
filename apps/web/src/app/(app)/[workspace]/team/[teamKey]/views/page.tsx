import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, Layers, Library, Plus, SlidersHorizontal, Star } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { getWorkspace, listSavedViews, NotFoundError } from "@/lib/api";

const KBD = "rounded-sm border border-border-subtle bg-pill px-1 py-0.5 font-mono text-micro text-text-tertiary";

export default async function TeamViewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { workspace, teamKey } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "projects" ? "projects" : "issues";

  let team;
  try {
    const ws = await getWorkspace(workspace);
    team = ws.teams.find((t) => t.key === teamKey);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  if (!team) notFound();
  const all = await listSavedViews(workspace, teamKey);
  const views = tab === "issues" ? all.filter((v) => v.team_key === teamKey) : [];

  return (
    <>
      <Topbar
        title="Views"
        icon={<Layers size={15} />}
        trailing={
          <Link
            href={`/${workspace}/team/${team.key}/views/new`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            aria-label="New view"
            title="New view"
          >
            <Plus size={14} />
          </Link>
        }
      />

      <div className="flex h-[40px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <TabLink href={`/${workspace}/team/${team.key}/views?tab=issues`} active={tab === "issues"}>
          Issues
        </TabLink>
        <TabLink href={`/${workspace}/team/${team.key}/views?tab=projects`} active={tab === "projects"}>
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
        {views.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-12">
            <div className="max-w-[440px] text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-elevated text-text-tertiary">
                <Library size={34} />
              </div>
              <h2 className="text-default font-semibold text-text-primary">Views</h2>
              <p className="mt-2 text-mini text-text-tertiary">
                {tab === "projects"
                  ? `Save filters across ${team.name}'s projects. Open Projects, set your filters, and save the configuration to revisit it later.`
                  : `Create custom views for ${team.name}'s issues. Apply filters, save them, and pin the ones you use most.`}
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
                  href={`/${workspace}/team/${team.key}/active`}
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
        ) : (
          <ul className="mx-auto my-6 max-w-[760px] divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
            {views.map((v) => (
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
        )}
      </div>
    </>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={
        "rounded-md px-2 py-1 text-small " +
        (active
          ? "bg-row-selected text-text-primary"
          : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary")
      }
    >
      {children}
    </Link>
  );
}
