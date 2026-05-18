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
  const usp = new URLSearchParams(view.query || "");
  usp.set("view_id", view.id);
  const qs = usp.toString();
  // Project-scope views open on /projects with the saved query restoring
  // group / filter / sort. Issue-scope views open on the team page; if no
  // team is attached we fall back to /my/assigned so the view still
  // resolves to a real list rather than a 404.
  if (view.scope === "projects") {
    redirect(`/${workspace}/projects${qs ? `?${qs}` : ""}`);
  }
  if (!view.team_key) {
    redirect(`/${workspace}/my/assigned${qs ? `?${qs}` : ""}`);
  }
  redirect(`/${workspace}/team/${view.team_key}/${view.base}${qs ? `?${qs}` : ""}`);
}
