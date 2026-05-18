import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { CircleUser } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { MyIssuesBody } from "@/components/my-issues-body";
import { MyIssuesControls } from "@/components/my-issues-controls";
import { MyIssuesPrefsApplier } from "@/components/my-issues-prefs-applier";
import {
  getWorkspace,
  listMembers,
  listProjects,
  listWorkspaceLabels,
  myIssues,
  NotFoundError,
  type Issue,
  type Label,
  type Member,
  type Project,
  type Team,
} from "@/lib/api";

const SCOPES = ["assigned", "created", "subscribed", "activity"] as const;

export default async function MyIssuesPage({ params }: { params: Promise<{ workspace: string; scope: string }> }) {
  const { workspace, scope } = await params;
  if (!(SCOPES as readonly string[]).includes(scope)) notFound();

  let issues: Issue[];
  let projects: Project[] = [];
  let members: Member[] = [];
  let labels: Label[] = [];
  let teams: Team[] = [];
  try {
    const [
      issuesRes,
      projectsRes,
      membersRes,
      labelsRes,
      wsRes,
    ] = await Promise.all([
      myIssues(workspace, scope),
      listProjects(workspace).catch(() => [] as Project[]),
      listMembers(workspace).catch(() => [] as Member[]),
      listWorkspaceLabels(workspace).catch(() => [] as Label[]),
      getWorkspace(workspace).catch(() => null),
    ]);
    issues = issuesRes;
    projects = projectsRes;
    members = membersRes;
    labels = labelsRes;
    teams = wsRes?.teams ?? [];
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <>
      <Topbar title="My issues" icon={<CircleUser size={15} />} />
      {/*
        Tabs sub-row. Linear styles every tab as an outlined pill (not
        only the active one), with generous horizontal breathing room
        and a slightly taller bar than the topbar itself. We mirror that
        here so the active pill reads as a fill-up over the same outline
        every other tab uses, rather than a magically appearing chip.
      */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border-subtle px-5">
        {SCOPES.map((s) => (
          <Link
            key={s}
            href={`/${workspace}/my/${s}`}
            className={clsx(
              "rounded-pill border px-3 py-1 text-mini transition-colors",
              s === scope
                ? "border-border-strong bg-row-selected text-text-primary"
                : "border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </Link>
        ))}
        <span className="ml-auto">
          <MyIssuesControls workspaceSlug={workspace} />
        </span>
      </div>
      <MyIssuesPrefsApplier workspaceSlug={workspace} />
      <MyIssuesBody
        workspaceSlug={workspace}
        scope={scope}
        initial={issues}
        projects={projects}
        members={members}
        labels={labels}
        teams={teams}
      />
    </>
  );
}
