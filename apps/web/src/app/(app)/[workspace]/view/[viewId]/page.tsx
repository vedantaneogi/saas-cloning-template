import { notFound, redirect } from "next/navigation";
import {
  getSavedView,
  listMembers,
  listWorkspaceIssues,
  listWorkspaceLabels,
  NotFoundError,
  type Issue,
  type Label,
  type Member,
  type SavedView,
} from "@/lib/api";
import { ViewDetailBody } from "@/components/view-detail-body";

export default async function SavedViewPage({
  params,
}: {
  params: Promise<{ workspace: string; viewId: string }>;
}) {
  const { workspace, viewId } = await params;
  let view: SavedView;
  try {
    view = await getSavedView(workspace, viewId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  // Project-scope views still redirect — /projects already knows how to
  // hydrate from its own JSON-blob query format.
  if (view.scope === "projects") {
    const usp = new URLSearchParams(view.query || "");
    usp.set("view_id", view.id);
    redirect(`/${workspace}/projects?${usp.toString()}`);
  }

  // Issue views render inline here so the right-side info panel
  // (Visibility / Owner / Assignees / Labels / Projects / Teams) can be
  // toggled without leaving the page. The saved query is forwarded to
  // listWorkspaceIssues — if team_key is set we constrain there.
  const sp = new URLSearchParams(view.query || "");
  const params2: Parameters<typeof listWorkspaceIssues>[1] = {
    view: (view.base as "active" | "backlog" | "all") ?? "active",
  };
  if (sp.get("priority")) params2.priority = sp.get("priority")!;
  if (sp.get("label")) params2.label = sp.get("label")!;
  if (sp.get("assignee")) params2.assignee = sp.get("assignee")!;
  if (sp.get("state")) params2.state = sp.get("state")!;
  if (sp.get("project")) params2.project = sp.get("project")!;
  if (sp.get("sort")) params2.sort = sp.get("sort")!;
  if (view.team_key) params2.team = view.team_key;

  let issues: Issue[] = [];
  let members: Member[] = [];
  let labels: Label[] = [];
  try {
    [issues, members, labels] = await Promise.all([
      listWorkspaceIssues(workspace, params2),
      listMembers(workspace).catch(() => [] as Member[]),
      listWorkspaceLabels(workspace).catch(() => [] as Label[]),
    ]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <ViewDetailBody
      workspace={workspace}
      view={view}
      initialIssues={issues}
      members={members}
      labels={labels}
    />
  );
}
