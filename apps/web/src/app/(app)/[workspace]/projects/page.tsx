import { Box, SlidersHorizontal, LayoutGrid, Square } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ProjectsTable } from "@/components/projects-table";
import { listMembers, listProjects } from "@/lib/api";
import { NewProjectButton } from "@/components/new-project-button";

export default async function ProjectsListPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [projects, members] = await Promise.all([
    listProjects(workspace),
    listMembers(workspace).catch(() => []),
  ]);

  return (
    <>
      <Topbar
        title="Projects"
        icon={<Box size={15} />}
        trailing={<NewProjectButton workspaceSlug={workspace} members={members} />}
      />

      <div className="flex h-[40px] shrink-0 items-center gap-2 border-b border-border-subtle px-4 text-mini">
        <button type="button" className="rounded-pill bg-row-selected px-2.5 py-1 text-text-primary">
          All projects
        </button>
        <button
          type="button"
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Group by initiative"
          title="Group by initiative"
        >
          <LayoutGrid size={13} />
        </button>
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
        <ProjectsTable projects={projects} workspace={workspace} />
      </div>
    </>
  );
}
