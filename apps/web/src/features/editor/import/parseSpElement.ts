import type {
  ShapeElement,
  ShapeKind,
  TextElement,
  TextBlock,
} from "../model/types";
import {
  attr,
  childrenByLocal,
  firstChildByLocal,
} from "./pptxXml";
import { emuToPx, pptxRotToDeg } from "./pptxUnits";
import type { RelsMap } from "./pptxZip";
import {
  parseTextFrame,
  txBodyHasText,
  type InheritedTextDefaults,
} from "./pptxRunsToProseMirror";
import { recordSkip, type SkipReport } from "./types";
import {
  resolveColorNode,
  resolveSolidFillColor,
  type ThemeContext,
} from "./parseTheme";

type Rescale = (n: number, axis: "x" | "y") => number;

function readGeometry(
  spPr: Element | null,
  rescale: Rescale,
): { x: number; y: number; w: number; h: number; rotation?: number } {
  const xfrm = spPr ? firstChildByLocal(spPr, "xfrm") : null;
  const off = xfrm ? firstChildByLocal(xfrm, "off") : null;
  const ext = xfrm ? firstChildByLocal(xfrm, "ext") : null;
  const xPx = off ? emuToPx(attr(off, "x")) : 0;
  const yPx = off ? emuToPx(attr(off, "y")) : 0;
  const wPx = ext ? emuToPx(attr(ext, "cx")) : 120;
  const hPx = ext ? emuToPx(attr(ext, "cy")) : 60;
  const rotation = xfrm ? pptxRotToDeg(attr(xfrm, "rot")) : undefined;
  return {
    x: Math.round(rescale(xPx, "x")),
    y: Math.round(rescale(yPx, "y")),
    w: Math.max(1, Math.round(rescale(wPx, "x"))),
    h: Math.max(1, Math.round(rescale(hPx, "y"))),
    rotation,
  };
}

function readFillStroke(
  spPr: Element | null,
  themeCtx: ThemeContext | null,
): {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  hasNoFill: boolean;
  arrowEnd: boolean;
} {
  if (!spPr)
    return { hasNoFill: false, arrowEnd: false };
  const out: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    hasNoFill: boolean;
    arrowEnd: boolean;
  } = { hasNoFill: false, arrowEnd: false };

  const noFill = firstChildByLocal(spPr, "noFill");
  if (noFill) out.hasNoFill = true;

  const fill = resolveSolidFillColor(spPr, themeCtx);
  if (fill) out.fill = fill;

  const ln = firstChildByLocal(spPr, "ln");
  if (ln) {
    const w = attr(ln, "w");
    if (w) out.strokeWidth = Math.max(1, Math.round(emuToPx(w)));
    const stroke = resolveSolidFillColor(ln, themeCtx);
    if (stroke) out.stroke = stroke;
    const tail = firstChildByLocal(ln, "tailEnd");
    const head = firstChildByLocal(ln, "headEnd");
    const tailType = tail ? attr(tail, "type") : null;
    const headType = head ? attr(head, "type") : null;
    if (
      (tailType && tailType !== "none") ||
      (headType && headType !== "none")
    ) {
      out.arrowEnd = true;
    }
  }
  return out;
}

// Silence unused-import warning: resolveColorNode is exported for callers
// that parse color nodes directly.
void resolveColorNode;

function mapPrstToShape(prst: string | null): ShapeKind | "other" | null {
  if (!prst) return null;
  switch (prst) {
    case "rect":
      return "rect";
    case "roundRect":
      return "rect";
    case "ellipse":
    case "oval":
      return "ellipse";
    case "line":
    case "straightConnector1":
      return "line";
    default:
      return "other";
  }
}

export type ParsedSp = {
  shape?: ShapeElement;
  text?: TextElement;
};

export function parseSpElement(
  sp: Element,
  rels: RelsMap,
  rescale: Rescale,
  zIndex: number,
  slideIndex: number,
  skip: SkipReport,
  idGen: () => string,
  themeCtx: ThemeContext | null = null,
  inheritedText: InheritedTextDefaults | null = null,
): ParsedSp {
  const spPr = firstChildByLocal(sp, "spPr");
  const { x, y, w, h, rotation } = readGeometry(spPr, rescale);
  const prstGeom = spPr ? firstChildByLocal(spPr, "prstGeom") : null;
  const prst = prstGeom ? attr(prstGeom, "prst") : null;
  const mappedShape = mapPrstToShape(prst);

  const fillStroke = readFillStroke(spPr, themeCtx);
  const isArrow =
    (mappedShape === "line" && fillStroke.arrowEnd) ||
    prst === "straightConnector1";

  const txBody = firstChildByLocal(sp, "txBody");
  const hasText = txBody ? txBodyHasText(txBody) : false;

  const result: ParsedSp = {};

  // Shape emission: for rectangular text boxes we skip the shape and emit
  // only the text element (the box is implicit). For non-rect shapes with
  // text, emit both the shape and an overlapping text element.
  const shouldEmitShape =
    mappedShape !== null &&
    mappedShape !== "other" &&
    !(mappedShape === "rect" && hasText);

  if (mappedShape === "other") {
    recordSkip(skip, slideIndex, "unsupported-shape");
  }

  if (shouldEmitShape) {
    let shapeKind: ShapeKind =
      mappedShape === "line" && isArrow ? "arrow" : (mappedShape as ShapeKind);
    const shape: ShapeElement = {
      id: idGen(),
      type: "shape",
      shape: shapeKind,
      x,
      y,
      w,
      h,
      z: zIndex,
    };
    if (rotation !== undefined) shape.rotation = rotation;
    if (fillStroke.fill && shapeKind !== "line" && shapeKind !== "arrow") {
      shape.fill = fillStroke.fill;
    }
    if (fillStroke.stroke) shape.stroke = fillStroke.stroke;
    if (fillStroke.strokeWidth) shape.strokeWidth = fillStroke.strokeWidth;

    if (prst === "roundRect") {
      // Invert exportPptx's rectRadius = radius / min(w,h), clamped to [0, 0.5].
      // PPTX prstGeom avLst carries adj1/val in thousandths (0..50000). Use it
      // if present, otherwise fall back to a reasonable default.
      const avLst = firstChildByLocal(prstGeom!, "avLst");
      const gd = avLst ? firstChildByLocal(avLst, "gd") : null;
      const fmla = gd ? attr(gd, "fmla") : null;
      let normalized = 0.125; // reasonable default
      if (fmla) {
        const m = /val\s+(-?\d+)/.exec(fmla);
        if (m) {
          const v = Number(m[1]);
          if (Number.isFinite(v))
            normalized = Math.max(0, Math.min(0.5, v / 100000));
        }
      }
      shape.radius = Math.round(Math.min(w, h) * normalized);
    }
    result.shape = shape;
  }

  if (txBody && hasText) {
    const { block, contentJson } = parseTextFrame(
      txBody,
      rels,
      themeCtx,
      inheritedText,
    );
    const textBlock: TextBlock = {};
    if (block.align) textBlock.align = block.align;
    if (block.fontSize) textBlock.fontSize = block.fontSize;
    if (block.fontFamily) textBlock.fontFamily = block.fontFamily;
    if (block.color) textBlock.color = block.color;
    if (block.lineHeight) textBlock.lineHeight = block.lineHeight;
    textBlock.contentJson = contentJson;

    const textEl: TextElement = {
      id: idGen(),
      type: "text",
      x,
      y,
      w,
      h,
      z: shouldEmitShape ? zIndex + 1 : zIndex,
      text: textBlock,
    };
    if (rotation !== undefined) textEl.rotation = rotation;
    result.text = textEl;
  }

  return result;
}
