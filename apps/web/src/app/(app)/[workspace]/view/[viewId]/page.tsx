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
    redirect(`/${workspace}/projects`);
  }
  const usp = new URLSearchParams(view.query || "");
  usp.set("view_id", view.id);
  const qs = usp.toString();
  redirect(`/${workspace}/team/${view.team_key}/${view.base}${qs ? `?${qs}` : ""}`);
}
