import { parsePptx } from "@/features/editor/import";
import type { Slide } from "@/features/editor/model/types";
import {
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
} from "@/features/editor/model/mockDeck";

export type ParsedTemplate = {
  slides: Slide[];
  pageWidth: number;
  pageHeight: number;
};

export async function fetchAndParseTemplate(
  pptxUrl: string,
): Promise<ParsedTemplate> {
  const res = await fetch(pptxUrl, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Failed to fetch template (${res.status})`);
  }
  const blob = await res.blob();
  const file = new File([blob], pptxUrl.split("/").pop() ?? "template.pptx", {
    type:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const parsed = await parsePptx(file, {
    pageWidth: DEFAULT_PAGE_WIDTH,
    pageHeight: DEFAULT_PAGE_HEIGHT,
  });
  return {
    slides: parsed.slides,
    pageWidth: DEFAULT_PAGE_WIDTH,
    pageHeight: DEFAULT_PAGE_HEIGHT,
  };
}
