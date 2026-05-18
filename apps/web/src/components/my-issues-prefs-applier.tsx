"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyMyIssuesPrefs, deserializeMyIssuesPrefs } from "@/lib/my-issues-prefs";

/**
 * Mounted on /my/[scope]. When the URL carries a `?mip=` query (set by the
 * /view/[viewId] redirect for views saved from a my-issues page), the
 * applier:
 *   1. parses the prefs blob,
 *   2. writes it into the per-workspace localStorage key,
 *   3. strips `mip` (and `view_id`) from the URL so the address bar stays
 *      clean while the controls + body re-render against the new prefs.
 *
 * Idempotent — re-runs are no-ops because the params get removed on the
 * first pass.
 */
export function MyIssuesPrefsApplier({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params?.toString() ?? "";
    if (!qs) return;
    const patch = deserializeMyIssuesPrefs(qs);
    if (!patch) return;
    applyMyIssuesPrefs(workspaceSlug, patch);
    const next = new URLSearchParams(qs);
    next.delete("mip");
    next.delete("view_id");
    const clean = next.toString();
    router.replace(clean ? `?${clean}` : "?", { scroll: false });
  }, [params, workspaceSlug, router]);

  return null;
}
