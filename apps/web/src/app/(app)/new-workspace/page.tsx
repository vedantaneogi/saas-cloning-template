import { NewWorkspaceForm } from "@/components/new-workspace-form";
import { UseDifferentEmail } from "@/components/use-different-email";
import { getMe } from "@/lib/api";

export default async function NewWorkspacePage() {
  const me = await getMe().catch(() => null);
  const email = me?.user.email ?? "";

  return (
    <div className="flex min-h-screen items-start justify-center bg-app px-4 pt-[18vh]">
      <div className="w-full max-w-[420px]">
        <header className="mb-8 text-center">
          <h1 className="text-title2 font-semibold text-text-primary">Create a workspace</h1>
          <p className="mt-1.5 text-small text-text-tertiary">
            Move work forward across teams and agents
          </p>
        </header>

        <NewWorkspaceForm />

        {email && <UseDifferentEmail email={email} />}
      </div>
    </div>
  );
}
