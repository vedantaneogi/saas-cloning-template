import type { Slide } from "../model/types";

export type SkipReason =
  | "chart"
  | "table"
  | "smartart"
  | "ole"
  | "video"
  | "audio"
  | "ink"
  | "group-transform"
  | "unsupported-shape"
  | "unknown-media-mime"
  | "empty-picture";

export type SkipReport = {
  perSlide: Array<{ slideIndex: number; reasons: SkipReason[] }>;
  totalsByReason: Partial<Record<SkipReason, number>>;
};

export type ParsedDeck = {
  slides: Slide[];
  sourcePageWidthPx: number;
  sourcePageHeightPx: number;
  skipReport: SkipReport;
};

export function emptySkipReport(): SkipReport {
  return { perSlide: [], totalsByReason: {} };
}

export function recordSkip(
  report: SkipReport,
  slideIndex: number,
  reason: SkipReason,
): void {
  let entry = report.perSlide.find((e) => e.slideIndex === slideIndex);
  if (!entry) {
    entry = { slideIndex, reasons: [] };
    report.perSlide.push(entry);
  }
  entry.reasons.push(reason);
  report.totalsByReason[reason] = (report.totalsByReason[reason] ?? 0) + 1;
}
