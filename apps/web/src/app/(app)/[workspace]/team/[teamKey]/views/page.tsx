import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, Layers, Star } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { getWorkspace, listSavedViews, NotFoundError } from "@/lib/api";

export default async function TeamViewsPage({ params }: { params: Promise<{ workspace: string; teamKey: string }> }) {
  const { workspace, teamKey } = await params;
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
  const views = all.filter((v) => v.team_key === teamKey);

  return (
    <>
      <Topbar title={`${team.name} · Views`} icon={<Layers size={15} />} />
      <div className="flex-1 overflow-y-auto">
        {views.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-text-tertiary">
            <Bookmark size={24} className="text-text-quaternary" />
            <p className="text-small">No saved views for {team.name}.</p>
            <p className="text-mini">Apply filters in the team's issue list and click <kbd className="rounded-sm border border-border-subtle bg-pill px-1 text-micro">Save view</kbd>.</p>
          </div>
        ) : (
          <ul className="mx-auto max-w-[760px] divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle my-6">
            {views.map((v) => (
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
        )}
      </div>
    </>
  );
}
