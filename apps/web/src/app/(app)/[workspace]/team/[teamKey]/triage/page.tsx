import { notFound } from "next/navigation";
import { AlertOctagon } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { TriageBody } from "@/components/triage-body";
import { listTriage, NotFoundError, type Issue } from "@/lib/api";

export default async function TeamTriagePage({
  params,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
}) {
  const { workspace, teamKey } = await params;
  let items: Issue[];
  try {
    items = await listTriage(workspace, teamKey);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <>
      <Topbar title="Triage" icon={<AlertOctagon size={15} />} />
      <TriageBody workspaceSlug={workspace} teamKey={teamKey} initial={items} />
    </>
  );
}
