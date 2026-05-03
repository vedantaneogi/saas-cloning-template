"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { EditorShell } from "@/features/editor/components/EditorShell";
import { EditorProvider } from "@/features/editor/state/EditorContext";
import { usePresentation } from "@/features/presentations";

const centeredSx = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  color: "text.secondary",
} as const;

export default function EditorMount({ deckId }: { deckId: string }) {
  const { data, isLoading, isError, error } = usePresentation(deckId);

  if (isLoading) {
    return (
      <Box sx={centeredSx}>
        <CircularProgress size={32} />
        <Typography variant="body2">Loading presentation…</Typography>
      </Box>
    );
  }

  if (isError || !data) {
    const message = error?.message?.includes("404")
      ? "This presentation doesn't exist or you don't have access to it."
      : "Couldn't load this presentation. Please try again.";
    return (
      <Box sx={centeredSx}>
        <Typography variant="h6">Unable to open presentation</Typography>
        <Typography variant="body2">{message}</Typography>
      </Box>
    );
  }

  return (
    <EditorProvider deckId={deckId} initialDeck={data.content}>
      <EditorShell />
    </EditorProvider>
  );
}
