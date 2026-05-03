"use client";

import dynamic from "next/dynamic";

const EditorMount = dynamic(() => import("./EditorMount"), { ssr: false });

export function EditorClient({ deckId }: { deckId: string }) {
  return <EditorMount deckId={deckId} />;
}
