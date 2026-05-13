import Link from "next/link";
import clsx from "clsx";
import { Box, SlidersHorizontal, LayoutGrid, Square } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ProjectsTable } from "@/components/projects-table";
import { listMembers, listProjects, type Project, type ProjectState } from "@/lib/api";
import { NewProjectButton } from "@/components/new-project-button";

type FilterKey = "all" | "active" | "planned" | "completed";

const FILTERS: { key: FilterKey; label: string; states: ProjectState[] | null }[] = [
  { key: "all", label: "All", states: null },
  { key: "active", label: "Active", states: ["started", "paused"] },
  { key: "planned", label: "Planned", states: ["planned"] },
  { key: "completed", label: "Completed", states: ["completed", "canceled"] },
];

export default async function ProjectsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { workspace } = await params;
  const { filter } = await searchParams;
  const active = (FILTERS.find((f) => f.key === filter)?.key ?? "all") as FilterKey;

  const [allProjects, members] = await Promise.all([
    listProjects(workspace),
    listMembers(workspace).catch(() => []),
  ]);

  const filtered = filterProjects(allProjects, active);

  return (
    <>
      <Topbar
        title="Projects"
        icon={<Box size={15} />}
        trailing={<NewProjectButton workspaceSlug={workspace} members={members} />}
      />

      <div className="flex h-[40px] shrink-0 items-center gap-1 border-b border-border-subtle px-4 text-mini">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? `/${workspace}/projects` : `/${workspace}/projects?filter=${f.key}`}
            className={clsx(
              "rounded-pill px-2.5 py-1",
              active === f.key
                ? "bg-row-selected text-text-primary"
                : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            )}
          >
            {f.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" aria-label="Filter" title="Filter">
            <SlidersHorizontal size={13} />
          </button>
          <button type="button" className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" aria-label="Display options" title="Display options">
            <LayoutGrid size={13} />
          </button>
          <button type="button" className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" aria-label="View toggle" title="View toggle">
            <Square size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ProjectsTable projects={filtered} workspace={workspace} />
      </div>
    </>
  );
}

function filterProjects(projects: Project[], key: FilterKey): Project[] {
  const f = FILTERS.find((x) => x.key === key);
  if (!f || !f.states) return projects;
  const states = new Set(f.states);
  return projects.filter((p) => states.has(p.state));
}
