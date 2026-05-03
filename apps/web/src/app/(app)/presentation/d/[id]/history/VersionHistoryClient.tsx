"use client";

import dynamic from "next/dynamic";

const VersionHistoryShell = dynamic(
  () =>
    import("@/features/version-history").then((m) => ({
      default: m.VersionHistoryShell,
    })),
  { ssr: false },
);

export function VersionHistoryClient({ deckId }: { deckId: string }) {
  return <VersionHistoryShell deckId={deckId} />;
}
