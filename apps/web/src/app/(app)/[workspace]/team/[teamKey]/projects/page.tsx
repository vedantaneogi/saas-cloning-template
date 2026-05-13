import { notFound } from "next/navigation";
import { Box, LayoutGrid, SlidersHorizontal, Square } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { ProjectsTable } from "@/components/projects-table";
import { getWorkspace, listMembers, listProjects, NotFoundError } from "@/lib/api";

export default async function TeamProjectsPage({ params }: { params: Promise<{ workspace: string; teamKey: string }> }) {
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

  const [all, members] = await Promise.all([
    listProjects(workspace),
    listMembers(workspace).catch(() => []),
  ]);
  const filtered = all.filter((p) => (p.team_keys ?? []).includes(teamKey));

  return (
    <>
      <Topbar title="Projects" icon={<Box size={15} />} />

      <div className="flex h-[40px] shrink-0 items-center gap-2 border-b border-border-subtle px-4 text-mini">
        <button type="button" className="rounded-pill bg-row-selected px-2.5 py-1 text-text-primary">
          {team.name}
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
        <ProjectsTable
          groups={[{ key: "all", label: team.name, projects: filtered }]}
          workspace={workspace}
          showGroupHeaders={false}
          members={members}
        />
      </div>
    </>
  );
}
