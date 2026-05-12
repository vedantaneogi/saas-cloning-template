import Link from "next/link";
import { Bookmark, Layers, Star } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { getWorkspace, listSavedViews, type SavedView, type Team } from "@/lib/api";

export default async function ViewsIndexPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [views, ws] = await Promise.all([
    listSavedViews(workspace),
    getWorkspace(workspace).catch(() => null),
  ]);
  const teams: Team[] = ws?.teams ?? [];
  const teamByKey = new Map(teams.map((t) => [t.key, t]));
  const grouped = new Map<string, SavedView[]>();
  for (const v of views) {
    const k = v.team_key || "_workspace";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(v);
  }

  return (
    <>
      <Topbar title="Views" icon={<Layers size={15} />} />
      <div className="flex-1 overflow-y-auto">
        {views.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-text-tertiary">
            <Bookmark size={24} className="text-text-quaternary" />
            <p className="text-small">No saved views yet.</p>
            <p className="text-mini">Open any team's issue list and hit <kbd className="rounded-sm border border-border-subtle bg-pill px-1 text-micro">Save view</kbd> in the topbar.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-[920px] p-6">
            {[...grouped.entries()].map(([key, list]) => (
              <section key={key} className="mb-8">
                <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
                  {key === "_workspace" ? (
                    <span>Workspace views</span>
                  ) : (
                    <>
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: teamByKey.get(key)?.icon_color ?? "#5e6ad2" }} />
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
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm" style={{ background: v.icon_color }}>
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
