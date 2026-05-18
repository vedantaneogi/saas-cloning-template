import { redirect } from "next/navigation";
import { listCycles } from "@/lib/api";

/**
 * /team/<key>/cycles/upcoming — redirects to the soonest-starting
 * upcoming cycle, or the cycles index if none.
 */
export default async function UpcomingCyclePage({
  params,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
}) {
  const { workspace, teamKey } = await params;
  const cycles = await listCycles(workspace, teamKey).catch(() => []);
  const upcoming = cycles
    .filter((c) => c.status === "upcoming")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  if (upcoming[0]) redirect(`/${workspace}/cycle/${upcoming[0].id}`);
  redirect(`/${workspace}/team/${teamKey}/cycles`);
}
