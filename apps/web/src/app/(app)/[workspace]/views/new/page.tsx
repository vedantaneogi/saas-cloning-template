import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { NewViewEditor } from "@/components/new-view-editor";
import { getWorkspace, NotFoundError } from "@/lib/api";

export default async function NewViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ scope?: string; team?: string }>;
}) {
  const { workspace } = await params;
  const sp = await searchParams;
  const scope: "issues" | "projects" = sp.scope === "projects" ? "projects" : "issues";
  const initialTeamKey = typeof sp.team === "string" ? sp.team : undefined;

  let ws;
  try {
    ws = await getWorkspace(workspace);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const teamForCrumb = initialTeamKey
    ? (ws.teams ?? []).find((t) => t.key === initialTeamKey)
    : undefined;

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4 text-small">
        <Layers size={14} className="text-text-tertiary" />
        {teamForCrumb ? (
          <>
            <Link
              href={`/${workspace}/team/${teamForCrumb.key}/${scope === "projects" ? "projects" : "active"}`}
              className="text-text-secondary hover:text-text-primary"
            >
              {teamForCrumb.name}
            </Link>
            <span className="text-text-quaternary">›</span>
            <Link
              href={`/${workspace}/views?tab=${scope}`}
              className="text-text-secondary hover:text-text-primary"
            >
              Views
            </Link>
          </>
        ) : (
          <Link
            href={`/${workspace}/views?tab=${scope}`}
            className="text-text-secondary hover:text-text-primary"
          >
            Views
          </Link>
        )}
        <span className="text-text-quaternary">›</span>
        <span className="font-semibold text-accent">
          {scope === "projects" ? "All projects" : "All issues"}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto">
        <NewViewEditor
          workspace={workspace}
          scope={scope}
          teams={ws.teams ?? []}
          workspaceName={ws.name}
          initialTeamKey={initialTeamKey}
        />
      </div>
    </>
  );
}
