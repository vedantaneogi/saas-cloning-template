import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { NewTeamForm } from "@/components/new-team-form";

export default async function NewTeamPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <>
      <Topbar title="Create team" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px]">
          <Link
            href={`/${workspace}/settings/teams`}
            className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-mini text-text-tertiary hover:text-text-secondary"
          >
            <ChevronLeft size={13} />
            Back
          </Link>

          <h1 className="mt-4 text-title2 font-semibold tracking-tight text-text-primary">Create a new team</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Create a new team to manage separate cycles, workflows, and notifications.
          </p>

          <NewTeamForm workspaceSlug={workspace} />
        </div>
      </div>
    </>
  );
}
