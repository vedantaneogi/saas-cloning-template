import type { TableCell, TableElement, TableStyle } from "../model/types";
import { DEFAULT_TABLE_STYLE } from "../model/tableDefaults";
import {
  attr,
  childrenByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
} from "./pptxXml";
import { emuToPx, pptxRotToDeg } from "./pptxUnits";
import { parseTextFrame } from "./pptxRunsToProseMirror";
import { resolveSolidFillColor, type ThemeContext } from "./parseTheme";
import type { RelsMap } from "./pptxZip";
import { recordSkip, type SkipReport } from "./types";

type Rescale = (n: number, axis: "x" | "y") => number;

function newCellId(): string {
  return `cell-${crypto.randomUUID().slice(0, 8)}`;
}

function readGraphicFrameGeometry(
  graphicFrame: Element,
  rescale: Rescale,
): { x: number; y: number; w: number; h: number; rotation?: number } {
  const xfrm = firstChildByLocal(graphicFrame, "xfrm");
  const off = xfrm ? firstChildByLocal(xfrm, "off") : null;
  const ext = xfrm ? firstChildByLocal(xfrm, "ext") : null;
  const xPx = off ? emuToPx(attr(off, "x")) : 0;
  const yPx = off ? emuToPx(attr(off, "y")) : 0;
  const wPx = ext ? emuToPx(attr(ext, "cx")) : 320;
  const hPx = ext ? emuToPx(attr(ext, "cy")) : 180;
  const rotation = xfrm ? pptxRotToDeg(attr(xfrm, "rot")) : undefined;
  return {
    x: Math.round(rescale(xPx, "x")),
    y: Math.round(rescale(yPx, "y")),
    w: Math.max(1, Math.round(rescale(wPx, "x"))),
    h: Math.max(1, Math.round(rescale(hPx, "y"))),
    rotation,
  };
}

function gridColWidthsPx(tbl: Element, rescaleX: (n: number) => number): number[] {
  const grid = firstChildByLocal(tbl, "tblGrid");
  if (!grid) return [];
  const cols = childrenByLocal(grid, "gridCol");
  return cols.map((c) => Math.max(24, Math.round(rescaleX(emuToPx(attr(c, "w"))))));
}

function rowHeightsPx(
  rowEls: Element[],
  rescaleY: (n: number) => number,
): number[] {
  return rowEls.map((r) => {
    const h = attr(r, "h");
    return h ? Math.max(24, Math.round(rescaleY(emuToPx(h)))) : 32;
  });
}

function parseCellBorder(
  tcPr: Element | null,
  themeCtx: ThemeContext | null,
): { color?: string; widthPt?: number } {
  if (!tcPr) return {};
  for (const side of ["lnL", "lnR", "lnT", "lnB"] as const) {
    const ln = firstChildByLocal(tcPr, side);
    if (!ln) continue;
    const w = attr(ln, "w");
    const widthPt = w ? Math.max(0.5, emuToPx(w) * (72 / 96)) : undefined;
    const color = resolveSolidFillColor(ln, themeCtx);
    if (color || widthPt != null) return { color, widthPt };
  }
  return {};
}

function parseCellFill(
  tcPr: Element | null,
  themeCtx: ThemeContext | null,
): string | undefined {
  if (!tcPr) return undefined;
  if (firstChildByLocal(tcPr, "noFill")) return "transparent";
  return resolveSolidFillColor(tcPr, themeCtx);
}

const CELL_MARKS = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "textStyle",
  "highlight",
]);

type PMNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
};

function sanitizeForCellSchema(node: PMNode): PMNode {
  const out: PMNode = { ...node };
  if (Array.isArray(node.marks)) {
    const filtered = node.marks.filter((m) => CELL_MARKS.has(m.type));
    if (filtered.length) out.marks = filtered;
    else delete out.marks;
  }
  if (Array.isArray(node.content)) {
    out.content = node.content.map(sanitizeForCellSchema);
  }
  return out;
}

function buildCellContent(
  tc: Element,
  rels: RelsMap,
  themeCtx: ThemeContext | null,
): unknown {
  const txBody = firstChildByLocal(tc, "txBody");
  if (!txBody) return { type: "doc", content: [{ type: "paragraph" }] };
  const { contentJson } = parseTextFrame(txBody, rels, themeCtx, null);
  const root = contentJson as { content?: PMNode[] };
  const paragraphs = Array.isArray(root.content) ? root.content : [];
  const safe = paragraphs.map(sanitizeForCellSchema);
  return {
    type: "doc",
    content: safe.length ? safe : [{ type: "paragraph" }],
  };
}

function readTblPrFlags(tbl: Element): {
  firstRowHeader: boolean;
  banded: boolean;
} {
  const tblPr = firstChildByLocal(tbl, "tblPr");
  if (!tblPr) return { firstRowHeader: true, banded: false };
  const firstRow = attr(tblPr, "firstRow");
  const bandRow = attr(tblPr, "bandRow");
  return {
    firstRowHeader: firstRow == null ? true : firstRow === "1" || firstRow === "true",
    banded: bandRow === "1" || bandRow === "true",
  };
}

function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 1);
  return values.map((v) => v / sum);
}

/**
 * Parse a `<p:graphicFrame>` containing an `<a:tbl>` into a native TableElement
 * in the new CSS-grid shape (colRatios / rowRatios / cells + per-cell
 * contentJson). Column spans are expanded into filler cells to keep the grid
 * rectangular — merged cells are deferred to v2.
 */
export function parseGraphicFrameTable(
  graphicFrame: Element,
  rels: RelsMap,
  rescale: Rescale,
  zIndex: number,
  slideIndex: number,
  skip: SkipReport,
  idGen: () => string,
  themeCtx: ThemeContext | null = null,
): TableElement | null {
  const tbl = firstDescendantByLocal(graphicFrame, "tbl");
  if (!tbl) return null;

  const { x, y, w, h, rotation } = readGraphicFrameGeometry(graphicFrame, rescale);
  const { firstRowHeader, banded } = readTblPrFlags(tbl);
  const colWidthsPx = gridColWidthsPx(tbl, (n) => rescale(n, "x"));

  const rowEls = childrenByLocal(tbl, "tr");
  if (rowEls.length === 0) {
    recordSkip(skip, slideIndex, "table");
    return null;
  }
  const rowHeights = rowHeightsPx(rowEls, (n) => rescale(n, "y"));

  let headerFill: string | undefined;
  let zebraFill: string | undefined;
  let bodyFill: string | undefined;
  let borderColor: string | undefined;
  let borderWidth: number | undefined;

  const cells: TableCell[] = [];
  const cols = Math.max(1, colWidthsPx.length);
  const rows = rowEls.length;

  for (let r = 0; r < rowEls.length; r++) {
    const row = rowEls[r];
    const cellEls = childrenByLocal(row, "tc");
    let colCursor = 0;

    for (let c = 0; c < cellEls.length; c++) {
      const tc = cellEls[c];
      if (attr(tc, "hMerge") === "1" || attr(tc, "vMerge") === "1") {
        colCursor += 1;
        continue;
      }
      const tcPr = firstChildByLocal(tc, "tcPr");
      const gridSpan = Number(attr(tc, "gridSpan") ?? "1") || 1;
      const isHeader = firstRowHeader && r === 0;
      const fill = parseCellFill(tcPr, themeCtx);
      const border = parseCellBorder(tcPr, themeCtx);

      if (isHeader && !headerFill && fill && fill !== "transparent") headerFill = fill;
      if (!isHeader) {
        const bodyRowIdx = firstRowHeader ? r - 1 : r;
        if (bodyRowIdx % 2 === 1 && !zebraFill && fill && fill !== "transparent") {
          zebraFill = fill;
        }
        if (bodyRowIdx % 2 === 0 && !bodyFill && fill) bodyFill = fill;
      }
      if (!borderColor && border.color) borderColor = border.color;
      if (borderWidth == null && border.widthPt != null) borderWidth = border.widthPt;

      const content = buildCellContent(tc, rels, themeCtx);
      cells.push({
        id: newCellId(),
        row: r,
        col: colCursor,
        contentJson: content,
      });
      for (let extra = 1; extra < gridSpan && colCursor + extra < cols; extra++) {
        cells.push({
          id: newCellId(),
          row: r,
          col: colCursor + extra,
          contentJson: { type: "doc", content: [{ type: "paragraph" }] },
        });
      }
      colCursor += gridSpan;
    }

    while (colCursor < cols) {
      cells.push({
        id: newCellId(),
        row: r,
        col: colCursor,
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
      });
      colCursor++;
    }
  }

  if (cells.length === 0) {
    recordSkip(skip, slideIndex, "table");
    return null;
  }

  const colRatios = normalize(
    colWidthsPx.length === cols ? colWidthsPx : Array.from({ length: cols }, () => 1),
  );
  const rowRatios = normalize(
    rowHeights.length === rows ? rowHeights : Array.from({ length: rows }, () => 1),
  );

  const style: TableStyle = {
    headerEnabled: firstRowHeader,
    headerFill: headerFill ?? DEFAULT_TABLE_STYLE.headerFill,
    headerBold: DEFAULT_TABLE_STYLE.headerBold,
    zebraEnabled: banded && zebraFill != null,
    zebraFill: zebraFill ?? DEFAULT_TABLE_STYLE.zebraFill,
    borderColor: borderColor ?? DEFAULT_TABLE_STYLE.borderColor,
    borderWidth: borderWidth ?? DEFAULT_TABLE_STYLE.borderWidth,
    tableFill: bodyFill ?? "transparent",
  };

  const element: TableElement = {
    id: idGen(),
    type: "table",
    x,
    y,
    w,
    h,
    z: zIndex,
    rows,
    cols,
    colRatios,
    rowRatios,
    cells,
    style,
  };
  if (rotation !== undefined) element.rotation = rotation;
  return element;
}
