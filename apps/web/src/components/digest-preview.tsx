"use client";

import { useEffect, useState } from "react";
import { getDigest, type NotificationDigest } from "@/lib/api";

export function DigestPreview({
  workspaceSlug,
  initialPeriod,
}: {
  workspaceSlug: string;
  initialPeriod: "daily" | "weekly";
}) {
  const [period, setPeriod] = useState<"daily" | "weekly">(initialPeriod);
  const [data, setData] = useState<NotificationDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDigest(workspaceSlug, period).then(setData).finally(() => setLoading(false));
  }, [workspaceSlug, period]);

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPeriod("daily")}
          className={`rounded-md px-2 py-1 text-mini ${period === "daily" ? "bg-row-selected text-text-primary" : "bg-pill text-text-secondary"}`}
        >
          Daily
        </button>
        <button
          onClick={() => setPeriod("weekly")}
          className={`rounded-md px-2 py-1 text-mini ${period === "weekly" ? "bg-row-selected text-text-primary" : "bg-pill text-text-secondary"}`}
        >
          Weekly
        </button>
        <span className="ml-auto text-mini text-text-tertiary">
          {data ? `${data.count} update${data.count === 1 ? "" : "s"}` : ""}
        </span>
        <button
          onClick={copy}
          disabled={!data}
          className="rounded-md bg-accent px-2 py-1 text-mini font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
        >
          {copied ? "Copied ✓" : "Copy HTML"}
        </button>
      </div>
      <div className="rounded-md border border-border-subtle bg-elevated p-4">
        {loading || !data ? (
          <p className="text-mini text-text-tertiary">Loading…</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: data.html }} />
        )}
      </div>
    </>
  );
}
