import { notFound } from "next/navigation";
import { CircleUser } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { IssueGroup } from "@/components/issue-group";
import { myIssues, myIssueCounts, NotFoundError, type Issue, type StateGroup } from "@/lib/api";

const SCOPES = ["assigned", "created", "subscribed", "activity"] as const;

export default async function MyIssuesPage({ params }: { params: Promise<{ workspace: string; scope: string }> }) {
  const { workspace, scope } = await params;
  if (!(SCOPES as readonly string[]).includes(scope)) notFound();

  let issues: Issue[];
  let counts: Record<string, number> = {};
  try {
    [issues, counts] = await Promise.all([myIssues(workspace, scope), myIssueCounts(workspace)]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const byStateName = new Map<string, { name: string; group: StateGroup; position: number; issues: Issue[] }>();
  for (const issue of issues) {
    const key = issue.state.name;
    if (!byStateName.has(key)) {
      byStateName.set(key, { name: issue.state.name, group: issue.state.group, position: issue.state.position, issues: [] });
    }
    byStateName.get(key)!.issues.push(issue);
  }
  const groups = [...byStateName.values()].sort((a, b) => a.position - b.position);

  return (
    <>
      <Topbar
        title="My issues"
        icon={<CircleUser size={15} />}
        tabs={SCOPES.map((s) => ({
          key: s,
          label: `${s[0].toUpperCase() + s.slice(1)}${counts[s] !== undefined ? ` ${counts[s]}` : ""}`,
          href: `/${workspace}/my/${s}`,
        }))}
        activeTab={scope}
      />
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
            No issues in this view.
          </div>
        ) : (
          groups.map((g) => (
            <IssueGroup
              key={g.name}
              title={g.name}
              group={g.group}
              count={g.issues.length}
              issues={g.issues}
              workspaceSlug={workspace}
            />
          ))
        )}
      </div>
    </>
  );
}
