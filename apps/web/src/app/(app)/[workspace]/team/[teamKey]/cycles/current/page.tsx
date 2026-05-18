import { redirect } from "next/navigation";
import { listCycles } from "@/lib/api";

/**
 * /team/<key>/cycles/current — smart redirect to the active cycle's
 * detail page if there is one, otherwise to the cycles index.
 */
export default async function CurrentCyclePage({
  params,
}: {
  params: Promise<{ workspace: string; teamKey: string }>;
}) {
  const { workspace, teamKey } = await params;
  const cycles = await listCycles(workspace, teamKey).catch(() => []);
  const active = cycles.find((c) => c.status === "active");
  if (active) redirect(`/${workspace}/cycle/${active.id}`);
  redirect(`/${workspace}/team/${teamKey}/cycles`);
}
