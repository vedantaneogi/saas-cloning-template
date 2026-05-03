import type { SlideBackground } from "../model/types";
import { attr, firstChildByLocal } from "./pptxXml";
import type { PptxZip, RelsMap } from "./pptxZip";
import { resolveRelTarget } from "./pptxZip";
import { bytesToDataUrl, mimeFromPath } from "./mediaUtils";
import { resolveSolidFillColor, type ThemeContext } from "./parseTheme";

export async function parseSlideBackground(
  cSld: Element | null,
  rels: RelsMap,
  zip: PptxZip,
  slidePartPath: string,
  themeCtx: ThemeContext | null = null,
): Promise<SlideBackground> {
  if (!cSld) return { kind: "theme" };
  const bg = firstChildByLocal(cSld, "bg");
  if (!bg) return { kind: "theme" };

  const bgPr = firstChildByLocal(bg, "bgPr");
  if (bgPr) {
    const color = resolveSolidFillColor(bgPr, themeCtx);
    if (color) return { kind: "solid", color };
    const blipFill = firstChildByLocal(bgPr, "blipFill");
    if (blipFill) {
      const blip = firstChildByLocal(blipFill, "blip");
      const rid = blip ? attr(blip, "r:embed") : null;
      if (rid) {
        const rel = rels.get(rid);
        if (rel) {
          const path = resolveRelTarget(slidePartPath, rel.target);
          const bytes = await zip.readBinary(path);
          if (bytes) {
            const mime = mimeFromPath(path);
            if (mime) {
              return { kind: "image", src: bytesToDataUrl(bytes, mime) };
            }
          }
        }
      }
    }
  }

  return { kind: "theme" };
}
