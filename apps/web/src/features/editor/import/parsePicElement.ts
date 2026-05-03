import type { ImageElement, ImageCrop } from "../model/types";
import {
  attr,
  firstChildByLocal,
  firstDescendantByLocal,
  hasDescendantLocal,
} from "./pptxXml";
import { emuToPx, pptxRotToDeg } from "./pptxUnits";
import type { PptxZip, RelsMap } from "./pptxZip";
import { resolveRelTarget } from "./pptxZip";
import { bytesToDataUrl, mimeFromPath } from "./mediaUtils";
import { recordSkip, type SkipReport } from "./types";

type Rescale = (n: number, axis: "x" | "y") => number;

function readCrop(blipFill: Element): ImageCrop | undefined {
  const srcRect = firstChildByLocal(blipFill, "srcRect");
  if (!srcRect) return undefined;
  const l = Number(attr(srcRect, "l") ?? "0") / 100000;
  const t = Number(attr(srcRect, "t") ?? "0") / 100000;
  const r = Number(attr(srcRect, "r") ?? "0") / 100000;
  const b = Number(attr(srcRect, "b") ?? "0") / 100000;
  if (l === 0 && t === 0 && r === 0 && b === 0) return undefined;
  const w = Math.max(0, 1 - l - r);
  const h = Math.max(0, 1 - t - b);
  if (w === 0 || h === 0) return undefined;
  return { x: l, y: t, w, h };
}

export async function parsePicElement(
  pic: Element,
  rels: RelsMap,
  zip: PptxZip,
  slidePartPath: string,
  rescale: Rescale,
  zIndex: number,
  slideIndex: number,
  skip: SkipReport,
  idGen: () => string,
): Promise<ImageElement | null> {
  // Video / audio picture frames.
  if (hasDescendantLocal(pic, "videoFile")) {
    recordSkip(skip, slideIndex, "video");
    return null;
  }
  if (hasDescendantLocal(pic, "audioFile")) {
    recordSkip(skip, slideIndex, "audio");
    return null;
  }

  const blipFill = firstChildByLocal(pic, "blipFill");
  const blip = blipFill ? firstChildByLocal(blipFill, "blip") : null;
  const embed = blip ? attr(blip, "r:embed") : null;
  if (!embed) {
    recordSkip(skip, slideIndex, "empty-picture");
    return null;
  }
  const rel = rels.get(embed);
  if (!rel) {
    recordSkip(skip, slideIndex, "empty-picture");
    return null;
  }
  const path = resolveRelTarget(slidePartPath, rel.target);
  const bytes = await zip.readBinary(path);
  if (!bytes) {
    recordSkip(skip, slideIndex, "empty-picture");
    return null;
  }
  const mime = mimeFromPath(path);
  if (!mime) {
    recordSkip(skip, slideIndex, "unknown-media-mime");
    return null;
  }
  const dataUrl = bytesToDataUrl(bytes, mime);

  // Geometry: spPr > xfrm > off/ext
  const spPr = firstChildByLocal(pic, "spPr");
  const xfrm = spPr ? firstChildByLocal(spPr, "xfrm") : null;
  const off = xfrm ? firstChildByLocal(xfrm, "off") : null;
  const ext = xfrm ? firstChildByLocal(xfrm, "ext") : null;
  const xPx = off ? emuToPx(attr(off, "x")) : 0;
  const yPx = off ? emuToPx(attr(off, "y")) : 0;
  const wPx = ext ? emuToPx(attr(ext, "cx")) : 200;
  const hPx = ext ? emuToPx(attr(ext, "cy")) : 200;
  const rotation = xfrm ? pptxRotToDeg(attr(xfrm, "rot")) : undefined;

  const crop = blipFill ? readCrop(blipFill) : undefined;

  // Alt text (nvPicPr > cNvPr descr).
  const cNvPr = firstDescendantByLocal(pic, "cNvPr");
  const alt = cNvPr
    ? attr(cNvPr, "descr") ?? attr(cNvPr, "title") ?? undefined
    : undefined;

  const el: ImageElement = {
    id: idGen(),
    type: "image",
    src: dataUrl,
    x: Math.round(rescale(xPx, "x")),
    y: Math.round(rescale(yPx, "y")),
    w: Math.max(1, Math.round(rescale(wPx, "x"))),
    h: Math.max(1, Math.round(rescale(hPx, "y"))),
    z: zIndex,
  };
  if (rotation !== undefined) el.rotation = rotation;
  if (alt) el.alt = alt;
  if (crop) el.crop = crop;
  return el;
}
