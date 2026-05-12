import { NewWorkspaceForm } from "@/components/new-workspace-form";

export default function NewWorkspacePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center gap-2 text-text-secondary">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-mini font-semibold text-white">L</span>
          <span className="text-default font-semibold tracking-tight text-text-primary">Linear clone</span>
        </div>
        <div className="rounded-xl bg-elevated p-6 shadow-popover">
          <h1 className="text-title3 font-semibold text-text-primary">Create a workspace</h1>
          <p className="mt-1 text-small text-text-tertiary">A workspace is where your team collaborates on issues, projects, and docs.</p>
          <NewWorkspaceForm />
        </div>
      </div>
    </div>
  );
}
