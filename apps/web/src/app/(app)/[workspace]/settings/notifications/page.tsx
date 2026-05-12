import { Topbar } from "@/components/topbar";
import { Bell } from "lucide-react";
import { NotificationPrefsForm } from "@/components/notification-prefs-form";
import { getWorkspace, listNotificationPrefs, listProjects } from "@/lib/api";

export default async function NotificationsSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [ws, prefs, projects] = await Promise.all([
    getWorkspace(workspace).catch(() => null),
    listNotificationPrefs(workspace).catch(() => []),
    listProjects(workspace).catch(() => []),
  ]);
  return (
    <>
      <Topbar title="Notifications" icon={<Bell size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px]">
          <h1 className="text-title3 font-semibold text-text-primary">Notifications</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Mute notifications from specific teams or projects. You'll still see issue-page updates,
            but won't get inbox entries.
          </p>
          <NotificationPrefsForm
            workspaceSlug={workspace}
            teams={ws?.teams ?? []}
            projects={projects}
            initial={prefs}
          />
        </div>
      </div>
    </>
  );
}
