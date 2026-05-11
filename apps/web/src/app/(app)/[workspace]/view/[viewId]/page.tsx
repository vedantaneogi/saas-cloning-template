import { notFound, redirect } from "next/navigation";
import { getSavedView, NotFoundError } from "@/lib/api";

export default async function SavedViewPage({
  params,
}: {
  params: Promise<{ workspace: string; viewId: string }>;
}) {
  const { workspace, viewId } = await params;
  let view;
  try {
    view = await getSavedView(workspace, viewId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  if (!view.team_key) {
    // Workspace-scoped saved views aren't shown anywhere yet; bounce to projects.
    redirect(`/${workspace}/projects`);
  }
  const qs = view.query ? `?${view.query}` : "";
  redirect(`/${workspace}/team/${view.team_key}/${view.base}${qs}`);
}
