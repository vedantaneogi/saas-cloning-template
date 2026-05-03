"use client";

import { useCallback, useState } from "react";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import { parsePptx, PptxError } from "../import";
import type { SkipReport, SkipReason } from "../import";

export type ImportStatus = "idle" | "parsing" | "done" | "error";

export type ImportResult =
  | { ok: true; insertedCount: number; skipReport: SkipReport }
  | {
      ok: false;
      error: "corrupt" | "encrypted" | "not-pptx" | "empty" | "unknown";
    };

const REASON_LABELS: Record<SkipReason, string> = {
  chart: "chart",
  table: "table",
  smartart: "SmartArt graphic",
  ole: "embedded object",
  video: "video",
  audio: "audio",
  ink: "ink drawing",
  "group-transform": "grouped shape",
  "unsupported-shape": "unsupported shape",
  "unknown-media-mime": "unsupported image",
  "empty-picture": "missing image",
};

function pluralize(word: string, n: number): string {
  if (n === 1) return word;
  if (word.endsWith("s")) return word;
  return `${word}s`;
}

export function buildToastMessage(result: ImportResult): string {
  if (result.ok === false) {
    switch (result.error) {
      case "encrypted":
        return "Can't import — file is password-protected.";
      case "not-pptx":
        return "Can't import — this doesn't look like a .pptx file.";
      case "corrupt":
        return "Can't import — file is corrupt or damaged.";
      case "empty":
        return "Can't import — the file is empty.";
      default:
        return "Couldn't import the file. Please try another.";
    }
  }
  const { insertedCount, skipReport } = result;
  const base = `Imported ${insertedCount} slide${insertedCount === 1 ? "" : "s"}.`;
  const totals = skipReport.totalsByReason;
  const parts = (Object.keys(totals) as SkipReason[])
    .filter((k) => (totals[k] ?? 0) > 0)
    .map((k) => {
      const n = totals[k] ?? 0;
      return `${n} ${pluralize(REASON_LABELS[k], n)}`;
    });
  if (!parts.length) return base;
  return `${base} Skipped: ${parts.join(", ")}.`;
}

export function useImportPptx() {
  const { deck } = useEditorState();
  const slide = useActiveSlide();
  const { insertSlides } = useEditorActions();
  const [status, setStatus] = useState<ImportStatus>("idle");

  const run = useCallback(
    async (file: File): Promise<ImportResult> => {
      setStatus("parsing");
      try {
        const parsed = await parsePptx(file, {
          pageWidth: deck.meta.pageWidth,
          pageHeight: deck.meta.pageHeight,
        });
        if (parsed.slides.length === 0) {
          setStatus("error");
          return { ok: false, error: "empty" };
        }
        insertSlides(parsed.slides, slide?.id ?? null);
        setStatus("done");
        return {
          ok: true,
          insertedCount: parsed.slides.length,
          skipReport: parsed.skipReport,
        };
      } catch (err) {
        setStatus("error");
        if (err instanceof PptxError) {
          return { ok: false, error: err.kind === "unknown" ? "unknown" : err.kind };
        }
        console.error("[useImportPptx]", err);
        return { ok: false, error: "unknown" };
      }
    },
    [deck.meta.pageWidth, deck.meta.pageHeight, insertSlides, slide?.id],
  );

  return { run, status };
}
