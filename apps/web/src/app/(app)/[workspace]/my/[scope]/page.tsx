import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { CircleUser } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { MyIssuesBody } from "@/components/my-issues-body";
import { MyIssuesControls } from "@/components/my-issues-controls";
import {
  listMembers,
  listProjects,
  myIssues,
  myIssueCounts,
  NotFoundError,
  type Issue,
  type Member,
  type Project,
} from "@/lib/api";

const SCOPES = ["assigned", "created", "subscribed", "activity"] as const;

export default async function MyIssuesPage({ params }: { params: Promise<{ workspace: string; scope: string }> }) {
  const { workspace, scope } = await params;
  if (!(SCOPES as readonly string[]).includes(scope)) notFound();

  let issues: Issue[];
  let counts: Record<string, number> = {};
  let projects: Project[] = [];
  let members: Member[] = [];
  try {
    [issues, counts, projects, members] = await Promise.all([
      myIssues(workspace, scope),
      myIssueCounts(workspace),
      listProjects(workspace).catch(() => [] as Project[]),
      listMembers(workspace).catch(() => [] as Member[]),
    ]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <>
      <Topbar title="My issues" icon={<CircleUser size={15} />} />
      <div className="flex h-[40px] shrink-0 items-center gap-1 border-b border-border-subtle px-4">
        {SCOPES.map((s) => (
          <Link
            key={s}
            href={`/${workspace}/my/${s}`}
            className={clsx(
              "rounded-pill px-2.5 py-1 text-mini",
              s === scope
                ? "bg-row-selected text-text-primary"
                : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            {s[0].toUpperCase() + s.slice(1)}
            {counts[s] !== undefined && counts[s] > 0 && (
              <span className="ml-1 text-text-quaternary">{counts[s]}</span>
            )}
          </Link>
        ))}
        <span className="ml-auto">
          <MyIssuesControls workspaceSlug={workspace} />
        </span>
      </div>
      <MyIssuesBody
        workspaceSlug={workspace}
        scope={scope}
        initial={issues}
        projects={projects}
        members={members}
      />
    </>
  );
}
