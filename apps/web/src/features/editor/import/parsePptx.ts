import type { Slide, SlideElement } from "../model/types";
import {
  attr,
  childrenByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
  hasDescendantLocal,
  localName,
  parseXml,
} from "./pptxXml";
import { emuToPx } from "./pptxUnits";
import {
  openPptx,
  PptxError,
  readRels,
  resolveRelTarget,
  type PptxZip,
  type RelsMap,
} from "./pptxZip";
import { parseSpElement } from "./parseSpElement";
import { parsePicElement } from "./parsePicElement";
import { parseGraphicFrameTable } from "./parseGraphicFrameTable";
import { parseGraphicFrameChart } from "./parseGraphicFrameChart";
import { parseSlideBackground } from "./parseSlideBackground";
import {
  parseSlideContextChain,
  resolveSolidFillColor,
  type ThemeContext,
} from "./parseTheme";
import type { InheritedTextDefaults } from "./pptxRunsToProseMirror";
import { pptxFontSizePt } from "./pptxUnits";
import {
  emptySkipReport,
  recordSkip,
  type ParsedDeck,
  type SkipReport,
} from "./types";

export { PptxError } from "./pptxZip";
export type { ParsedDeck, SkipReport, SkipReason } from "./types";

const MAX_GROUP_DEPTH = 10;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function hasPlaceholder(spOrCxn: Element): boolean {
  return placeholderKey(spOrCxn) !== null;
}

function placeholderKey(spOrCxn: Element): string | null {
  const nvSpPr =
    firstChildByLocal(spOrCxn, "nvSpPr") ??
    firstChildByLocal(spOrCxn, "nvCxnSpPr");
  if (!nvSpPr) return null;
  const nvPr = firstChildByLocal(nvSpPr, "nvPr");
  if (!nvPr) return null;
  const ph = firstChildByLocal(nvPr, "ph");
  if (!ph) return null;
  const type = attr(ph, "type");
  const idx = attr(ph, "idx");
  if (type) return `type:${type}`;
  if (idx) return `idx:${idx}`;
  return "ph:*";
}

function readLayoutPlaceholderDefaults(
  layoutSpTree: Element,
  themeCtx: ThemeContext,
): Map<string, InheritedTextDefaults> {
  const out = new Map<string, InheritedTextDefaults>();

  const visit = (container: Element) => {
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      const ln = localName(child);
      if (ln === "sp") {
        const key = placeholderKey(child);
        if (key) {
          const defaults = extractDefaultsFromSp(child, themeCtx);
          if (defaults) out.set(key, defaults);
        }
      } else if (ln === "grpSp") {
        visit(child);
      }
    }
  };
  visit(layoutSpTree);
  return out;
}

function extractDefaultsFromSp(
  sp: Element,
  themeCtx: ThemeContext,
): InheritedTextDefaults | null {
  const txBody = firstChildByLocal(sp, "txBody");
  if (!txBody) return null;
  const lstStyle = firstChildByLocal(txBody, "lstStyle");
  if (!lstStyle) return null;
  const lvl1 = firstChildByLocal(lstStyle, "lvl1pPr");
  if (!lvl1) return null;

  const out: InheritedTextDefaults = {};
  const algn = attr(lvl1, "algn");
  if (algn) {
    switch (algn) {
      case "l":
        out.align = "left";
        break;
      case "ctr":
        out.align = "center";
        break;
      case "r":
        out.align = "right";
        break;
      case "just":
        out.align = "justify";
        break;
    }
  }
  const defRPr = firstChildByLocal(lvl1, "defRPr");
  if (defRPr) {
    const sz = pptxFontSizePt(attr(defRPr, "sz"));
    if (sz) out.fontSize = sz;
    const color = resolveSolidFillColor(defRPr, themeCtx);
    if (color) out.color = color;
    const latin = firstChildByLocal(defRPr, "latin");
    if (latin) {
      const tf = attr(latin, "typeface");
      if (tf) out.fontFamily = tf;
    }
  }
  return Object.keys(out).length ? out : null;
}

async function readPresentation(zip: PptxZip): Promise<{
  sourceWidthPx: number;
  sourceHeightPx: number;
  slidePartPaths: string[];
}> {
  const text = await zip.readText("ppt/presentation.xml");
  if (!text) throw new PptxError("not-pptx", "Missing ppt/presentation.xml");
  const doc = parseXml(text);
  const root = doc.documentElement;
  const sldSz = firstDescendantByLocal(root, "sldSz");
  const cx = sldSz ? Number(attr(sldSz, "cx") ?? "9144000") : 9144000;
  const cy = sldSz ? Number(attr(sldSz, "cy") ?? "6858000") : 6858000;

  const idLst = firstDescendantByLocal(root, "sldIdLst");
  const ids = idLst ? childrenByLocal(idLst, "sldId") : [];
  const rels = await readRels(zip, "ppt/presentation.xml");
  const slidePartPaths: string[] = [];
  for (const idEl of ids) {
    const rid = attr(idEl, "r:id");
    if (!rid) continue;
    const rel = rels.get(rid);
    if (!rel) continue;
    slidePartPaths.push(resolveRelTarget("ppt/presentation.xml", rel.target));
  }

  return {
    sourceWidthPx: emuToPx(cx),
    sourceHeightPx: emuToPx(cy),
    slidePartPaths,
  };
}

type Rescale = (n: number, axis: "x" | "y") => number;

async function walkSpTree(
  spTree: Element,
  rels: RelsMap,
  zip: PptxZip,
  slidePartPath: string,
  rescale: Rescale,
  slideIndex: number,
  skip: SkipReport,
  depth: number,
  zCounter: { z: number },
  themeCtx: ThemeContext | null,
  skipPlaceholders: boolean,
  placeholderDefaults: Map<string, InheritedTextDefaults> | null,
): Promise<SlideElement[]> {
  const elements: SlideElement[] = [];
  if (depth > MAX_GROUP_DEPTH) {
    recordSkip(skip, slideIndex, "group-transform");
    return elements;
  }

  for (let i = 0; i < spTree.children.length; i++) {
    const child = spTree.children[i];
    const ln = localName(child);
    switch (ln) {
      case "sp":
      case "cxnSp": {
        if (skipPlaceholders && hasPlaceholder(child)) {
          break;
        }
        const phKey = placeholderDefaults ? placeholderKey(child) : null;
        const inherited =
          phKey && placeholderDefaults ? placeholderDefaults.get(phKey) ?? null : null;
        const parsed = parseSpElement(
          child,
          rels,
          rescale,
          zCounter.z,
          slideIndex,
          skip,
          () => newId("el"),
          themeCtx,
          inherited,
        );
        if (parsed.shape) {
          elements.push(parsed.shape);
          zCounter.z += 1;
        }
        if (parsed.text) {
          parsed.text.z = zCounter.z;
          elements.push(parsed.text);
          zCounter.z += 1;
        }
        break;
      }
      case "pic": {
        const el = await parsePicElement(
          child,
          rels,
          zip,
          slidePartPath,
          rescale,
          zCounter.z,
          slideIndex,
          skip,
          () => newId("el"),
        );
        if (el) {
          elements.push(el);
          zCounter.z += 1;
        }
        break;
      }
      case "grpSp": {
        // Non-identity group xfrm is not applied in v1.
        const grpSpPr = firstChildByLocal(child, "grpSpPr");
        const xfrm = grpSpPr ? firstChildByLocal(grpSpPr, "xfrm") : null;
        if (xfrm) {
          const off = firstChildByLocal(xfrm, "off");
          const chOff = firstChildByLocal(xfrm, "chOff");
          const hasTransform =
            (off && (attr(off, "x") !== "0" || attr(off, "y") !== "0")) ||
            (chOff && (attr(chOff, "x") !== "0" || attr(chOff, "y") !== "0"));
          if (hasTransform) recordSkip(skip, slideIndex, "group-transform");
        }
        const nested = await walkSpTree(
          child,
          rels,
          zip,
          slidePartPath,
          rescale,
          slideIndex,
          skip,
          depth + 1,
          zCounter,
          themeCtx,
          skipPlaceholders,
          placeholderDefaults,
        );
        elements.push(...nested);
        break;
      }
      case "graphicFrame": {
        if (hasDescendantLocal(child, "chart")) {
          const chartEl = await parseGraphicFrameChart(
            child,
            rels,
            zip,
            slidePartPath,
            rescale,
            zCounter.z,
            () => newId("el"),
          );
          if (chartEl) {
            elements.push(chartEl);
            zCounter.z += 1;
          } else {
            // Unsupported chart shape (e.g. line, scatter, multi-series) —
            // keep the historical skip-report entry so the toast explains why.
            recordSkip(skip, slideIndex, "chart");
          }
        } else if (hasDescendantLocal(child, "tbl")) {
          const table = parseGraphicFrameTable(
            child,
            rels,
            rescale,
            zCounter.z,
            slideIndex,
            skip,
            () => newId("el"),
            themeCtx,
          );
          if (table) {
            elements.push(table);
            zCounter.z += 1;
          }
        } else if (hasDescendantLocal(child, "relIds")) {
          recordSkip(skip, slideIndex, "smartart");
        } else {
          recordSkip(skip, slideIndex, "ole");
        }
        break;
      }
      default:
        // nvGrpSpPr, grpSpPr, extLst etc. — silently ignore
        break;
    }
  }
  return elements;
}

async function parseSlide(
  zip: PptxZip,
  partPath: string,
  rescale: Rescale,
  slideIndex: number,
  skip: SkipReport,
): Promise<Slide> {
  const text = await zip.readText(partPath);
  if (!text) {
    return {
      id: newId("slide"),
      layoutId: "blank",
      background: { kind: "theme" },
      elements: [],
    };
  }
  const doc = parseXml(text);
  const root = doc.documentElement;
  const rels = await readRels(zip, partPath);

  const themeCtx = await parseSlideContextChain(zip, partPath, rels);

  const cSld = firstChildByLocal(root, "cSld");
  let background = await parseSlideBackground(
    cSld,
    rels,
    zip,
    partPath,
    themeCtx,
  );

  const zCounter = { z: 1 };
  const layoutElements: SlideElement[] = [];
  let placeholderDefaults: Map<string, InheritedTextDefaults> | null = null;
  if (themeCtx.layoutPartPath) {
    const layoutText = await zip.readText(themeCtx.layoutPartPath);
    if (layoutText) {
      const layoutDoc = parseXml(layoutText);
      const layoutRoot = layoutDoc.documentElement;
      const layoutRels = await readRels(zip, themeCtx.layoutPartPath);
      const layoutCSld = firstChildByLocal(layoutRoot, "cSld");

      if (background.kind === "theme") {
        background = await parseSlideBackground(
          layoutCSld,
          layoutRels,
          zip,
          themeCtx.layoutPartPath,
          themeCtx,
        );
      }

      const layoutSpTree = layoutCSld
        ? firstChildByLocal(layoutCSld, "spTree")
        : null;
      if (layoutSpTree) {
        placeholderDefaults = readLayoutPlaceholderDefaults(
          layoutSpTree,
          themeCtx,
        );
        const parsedLayout = await walkSpTree(
          layoutSpTree,
          layoutRels,
          zip,
          themeCtx.layoutPartPath,
          rescale,
          slideIndex,
          skip,
          0,
          zCounter,
          themeCtx,
          true, // skip placeholders from layout — slide overrides those
          null,
        );
        layoutElements.push(...parsedLayout);
      }
    }
  }

  const spTree = cSld ? firstChildByLocal(cSld, "spTree") : null;
  const slideElements = spTree
    ? await walkSpTree(
        spTree,
        rels,
        zip,
        partPath,
        rescale,
        slideIndex,
        skip,
        0,
        zCounter,
        themeCtx,
        false,
        placeholderDefaults,
      )
    : [];

  return {
    id: newId("slide"),
    layoutId: "blank",
    background,
    elements: [...layoutElements, ...slideElements],
  };
}

export async function parsePptx(
  file: File,
  target: { pageWidth: number; pageHeight: number },
): Promise<ParsedDeck> {
  const zip = await openPptx(file);
  const { sourceWidthPx, sourceHeightPx, slidePartPaths } =
    await readPresentation(zip);

  const sx = target.pageWidth / Math.max(1, sourceWidthPx);
  const sy = target.pageHeight / Math.max(1, sourceHeightPx);
  const rescale: Rescale = (n, axis) => n * (axis === "x" ? sx : sy);

  const skip: SkipReport = emptySkipReport();
  const slides: Slide[] = [];
  for (let i = 0; i < slidePartPaths.length; i++) {
    try {
      const slide = await parseSlide(zip, slidePartPaths[i], rescale, i, skip);
      slides.push(slide);
    } catch (err) {
      console.warn(`[parsePptx] slide ${i + 1} failed`, err);
      // Still push a blank slide so indices stay aligned with the report.
      slides.push({
        id: newId("slide"),
        layoutId: "blank",
        background: { kind: "theme" },
        elements: [],
      });
    }
  }

  return {
    slides,
    sourcePageWidthPx: sourceWidthPx,
    sourcePageHeightPx: sourceHeightPx,
    skipReport: skip,
  };
}
