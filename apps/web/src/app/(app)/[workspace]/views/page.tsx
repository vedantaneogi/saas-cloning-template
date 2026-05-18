import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ViewsDisplayOptions, ViewsTabPill } from "@/components/views-display-options";
import { getMe, listSavedViews, type SavedView } from "@/lib/api";

interface SavedViewWithMeta extends SavedView {
  owner_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

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
  const sort = (sp.sort as "name" | "created" | "updated") ?? "name";
  const props = (sp.props ?? "owner").split(",").filter(Boolean);

  // Workspace-scoped views for the active tab.
  const [views, me] = await Promise.all([
    listSavedViews(workspace, undefined, tab).catch(() => [] as SavedView[]),
    getMe().catch(() => null),
  ]);

  // Owner data isn't surfaced by the list endpoint yet, so we treat every
  // view as personal-to-me. When the backend grows owner_id this section
  // splitter will partition correctly without further UI changes.
  const myId = me?.user.id ?? null;
  const withMeta = views as SavedViewWithMeta[];
  const personal = withMeta.filter((v) => !v.owner_id || v.owner_id === myId);
  const shared = withMeta.filter((v) => v.owner_id && v.owner_id !== myId);

  function sorted(rows: SavedViewWithMeta[]): SavedViewWithMeta[] {
    const arr = [...rows];
    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "created") arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    else if (sort === "updated") arr.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
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
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 px-2 py-2 text-mini text-text-tertiary">
            <span className="flex items-center gap-1">
              Name
              <span className="text-text-quaternary">↓</span>
            </span>
            {props.includes("created") && <span>Created</span>}
            {props.includes("updated") && <span>Updated</span>}
            {props.includes("owner") && <span className="text-right">Owner</span>}
          </div>

          <Section title="Personal views" subtitle="Only visible to you">
            {sorted(personal).map((v) => (
              <ViewRow key={v.id} v={v} workspace={workspace} props={props} ownerName={me?.user.name ?? null} />
            ))}
          </Section>

          {shared.length > 0 && (
            <Section title="Workspace views">
              {sorted(shared).map((v) => (
                <ViewRow key={v.id} v={v} workspace={workspace} props={props} ownerName={null} />
              ))}
            </Section>
          )}

          {personal.length === 0 && shared.length === 0 && (
            <div className="px-4 py-12 text-center text-mini text-text-tertiary">
              {tab === "projects" ? "No saved project views yet." : "No saved issue views yet."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <header className="flex items-center gap-2 px-2 py-2 text-mini text-text-tertiary">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-elevated text-[8px] text-text-tertiary">
          ⋯
        </span>
        <span className="font-medium text-text-secondary">{title}</span>
        {subtitle && <span className="text-text-quaternary">• {subtitle}</span>}
      </header>
      <ul>{children}</ul>
    </section>
  );
}

function ViewRow({
  v,
  workspace,
  props,
  ownerName,
}: {
  v: SavedViewWithMeta;
  workspace: string;
  props: string[];
  ownerName: string | null;
}) {
  return (
    <li>
      <Link
        href={`/${workspace}/view/${v.id}`}
        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 rounded-md px-2 py-2 text-small hover:bg-row-hover"
      >
        <span className="flex items-center gap-2">
          <span style={{ color: v.icon_color }}>
            <Layers size={14} />
          </span>
          <span className="truncate font-medium text-text-primary">{v.name}</span>
          {v.description && (
            <span className="truncate text-mini text-text-tertiary">{v.description}</span>
          )}
        </span>
        {props.includes("created") && (
          <span className="text-mini text-text-tertiary">{fmt(v.created_at)}</span>
        )}
        {props.includes("updated") && (
          <span className="text-mini text-text-tertiary">{fmt(v.updated_at)}</span>
        )}
        {props.includes("owner") && (
          <span className="text-mini text-text-tertiary">{ownerName ?? "—"}</span>
        )}
      </Link>
    </li>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
