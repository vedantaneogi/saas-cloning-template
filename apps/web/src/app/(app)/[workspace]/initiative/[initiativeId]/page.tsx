import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Folders } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar } from "@/components/icons";
import { ProjectIconBlock } from "@/components/project-icons";
import { NewProjectButton } from "@/components/new-project-button";
import { getInitiative, getWorkspace, listMembers, NotFoundError } from "@/lib/api";

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; initiativeId: string }>;
}) {
  const { workspace, initiativeId } = await params;
  let ini;
  try {
    ini = await getInitiative(workspace, initiativeId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const [ws, members] = await Promise.all([
    getWorkspace(workspace),
    listMembers(workspace).catch(() => []),
  ]);
  const pct = ini.project_count > 0 ? Math.round((ini.completed_project_count / ini.project_count) * 100) : 0;

  return (
    <>
      <Topbar
        title={ini.name}
        icon={<Compass size={15} />}
        trailing={
          <NewProjectButton
            workspaceSlug={workspace}
            workspaceName={ws.name}
            workspaceColor={ws.icon_color}
            members={members}
          />
        }
      />
      <div className="flex-1 overflow-y-auto">
        <header className="border-b border-border-subtle px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm"
              style={{ background: ini.icon_color }}
            >
              <Compass size={14} className="text-white/80" />
            </span>
            <h1 className="text-default font-semibold text-text-primary">{ini.name}</h1>
            <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro font-medium text-text-secondary">
              {ini.status.charAt(0).toUpperCase() + ini.status.slice(1)}
            </span>
          </div>
          {ini.description && (
            <p className="mt-3 max-w-3xl text-small text-text-secondary">{ini.description}</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-6 text-mini">
            <Stat label="Owner">
              {ini.owner ? (
                <span className="flex items-center gap-1.5">
                  <Avatar initials={ini.owner.initials} color={ini.owner.color} size={16} />
                  <span className="text-text-secondary">{ini.owner.name}</span>
                </span>
              ) : (
                <span className="text-text-tertiary">Unowned</span>
              )}
            </Stat>
            <Stat label="Target">
              {ini.target_date ? (
                <span className="text-text-secondary">
                  {new Date(ini.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              ) : (
                <span className="text-text-tertiary">No target</span>
              )}
            </Stat>
            <Stat label="Projects">
              <span className="flex items-center gap-2">
                <span className="text-text-secondary">
                  {ini.completed_project_count}/{ini.project_count}
                </span>
                <span className="h-1.5 w-24 overflow-hidden rounded-pill bg-pill">
                  <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-text-tertiary">{pct}%</span>
              </span>
            </Stat>
          </div>
        </header>

        <section>
          <header className="flex h-[36px] items-center gap-2 bg-elevated px-5 text-small">
            <Folders size={13} className="text-text-tertiary" />
            <span className="font-medium text-text-primary">Projects</span>
            <span className="text-text-tertiary">{ini.projects.length}</span>
          </header>
          {ini.projects.length === 0 ? (
            <div className="px-5 py-6 text-mini text-text-tertiary">No projects in this initiative.</div>
          ) : (
            ini.projects.map((p) => (
              <Link
                key={p.id}
                href={`/${workspace}/project/${p.slug_id}`}
                className="group flex h-[40px] items-center gap-3 border-b border-border-subtle px-5 text-small hover:bg-row-hover"
              >
                <ProjectIconBlock color={p.icon_color} size={14} />
                <span className="flex-1 truncate text-text-primary">{p.name}</span>
                <span className="text-mini text-text-tertiary">
                  {p.completed_issue_count}/{p.issue_count}
                </span>
                <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro font-medium text-text-secondary">
                  {p.state}
                </span>
                {p.lead ? (
                  <Avatar initials={p.lead.initials} color={p.lead.color} size={18} />
                ) : (
                  <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
                )}
              </Link>
            ))
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro uppercase tracking-wider text-text-tertiary">{label}</span>
      <span className="text-small">{children}</span>
    </div>
  );
}
