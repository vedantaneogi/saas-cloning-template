import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Folders } from "lucide-react";
import { getWorkspace } from "@/lib/api";

export default async function TeamsSettings({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ws = await getWorkspace(workspace);
  return (
    <>
      <Topbar title="Teams" icon={<Folders size={15} />} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[760px]">
          <h1 className="text-title3 font-semibold text-text-primary">Teams</h1>
          <p className="mt-1 text-small text-text-tertiary">
            Each team has its own backlog, workflow states, labels, and (optionally) cycles.
          </p>
          <ul className="mt-6 divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
            {ws.teams.map((t) => (
              <li key={t.key}>
                <Link
                  href={`/${workspace}/settings/team/${t.key}`}
                  className="flex items-center gap-3 px-4 py-3 text-small hover:bg-row-hover"
                >
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-sm"
                    style={{ background: t.icon_color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-text-primary">{t.name}</div>
                    <div className="truncate text-mini text-text-tertiary">
                      <span className="font-mono">{t.key}</span> · cycles {t.cycles_enabled ? "enabled" : "off"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
