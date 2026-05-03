import type { TableCell, TableElement } from "../model/types";
import { DEFAULT_TABLE_STYLE } from "../model/tableDefaults";
import { proseMirrorToPptxRuns, type PptxTextRun } from "./proseMirrorToPptxRuns";

const PX_PER_INCH = 96;
const pxToIn = (px: number): number => px / PX_PER_INCH;

const stripHash = (c: string | undefined): string | undefined =>
  c?.startsWith("#") ? c.slice(1) : c;

type PptxTableCell = {
  text?: string | PptxTextRun[];
  options?: Record<string, unknown>;
};

type PptxSlideLike = {
  addTable: (rows: PptxTableCell[][], options: Record<string, unknown>) => unknown;
};

function buildCellGrid(
  el: TableElement,
): Array<Array<TableCell | undefined>> {
  const grid: Array<Array<TableCell | undefined>> = Array.from(
    { length: el.rows },
    () => Array<TableCell | undefined>(el.cols).fill(undefined),
  );
  for (const cell of el.cells) {
    if (cell.row < el.rows && cell.col < el.cols) grid[cell.row][cell.col] = cell;
  }
  return grid;
}

function ratiosToPixels(ratios: number[], total: number): number[] {
  const sum = ratios.reduce((a, b) => a + b, 0);
  if (sum <= 0) return ratios.map(() => total / ratios.length);
  return ratios.map((r) => (r / sum) * total);
}

/**
 * Render a TableElement as a native PPTX table via `slide.addTable`. Never
 * flattens to an image — cell text is emitted as run-level pptxgenjs props so
 * bold/italic/color survive the round-trip, and header/zebra fills are set per
 * cell so PowerPoint and Google Slides show them correctly.
 */
export function renderTableElement(slide: PptxSlideLike, el: TableElement): void {
  const styleSrc = el.style ?? {};
  const style = {
    headerEnabled: styleSrc.headerEnabled ?? DEFAULT_TABLE_STYLE.headerEnabled,
    headerFill: styleSrc.headerFill ?? DEFAULT_TABLE_STYLE.headerFill,
    headerBold: styleSrc.headerBold ?? DEFAULT_TABLE_STYLE.headerBold,
    zebraEnabled: styleSrc.zebraEnabled ?? DEFAULT_TABLE_STYLE.zebraEnabled,
    zebraFill: styleSrc.zebraFill ?? DEFAULT_TABLE_STYLE.zebraFill,
    borderColor: styleSrc.borderColor ?? DEFAULT_TABLE_STYLE.borderColor,
    borderWidth: styleSrc.borderWidth ?? DEFAULT_TABLE_STYLE.borderWidth,
    tableFill: styleSrc.tableFill ?? DEFAULT_TABLE_STYLE.tableFill,
  };

  const headerFill =
    style.headerFill === "transparent" ? undefined : stripHash(style.headerFill);
  const zebraFill =
    style.zebraFill === "transparent" ? undefined : stripHash(style.zebraFill);
  const bodyFill =
    style.tableFill === "transparent" ? undefined : stripHash(style.tableFill);
  const borderColor = stripHash(style.borderColor) ?? "CCCCCC";

  if (el.rows === 0 || el.cols === 0) return;
  const grid = buildCellGrid(el);

  const rows: PptxTableCell[][] = [];
  let bodyRowIdx = 0;
  for (let r = 0; r < el.rows; r++) {
    const isHeaderRow = style.headerEnabled && r === 0;
    const rowOut: PptxTableCell[] = [];
    for (let c = 0; c < el.cols; c++) {
      const cell = grid[r][c];
      const applyHeader = isHeaderRow;
      const applyZebra =
        !applyHeader &&
        style.zebraEnabled &&
        bodyRowIdx % 2 === 1;

      const runs = cell?.contentJson
        ? proseMirrorToPptxRuns(cell.contentJson, { fontSize: 14 })
        : [];
      if (applyHeader && style.headerBold) {
        for (const run of runs) {
          run.options = { ...run.options, bold: true };
        }
      }
      const cellOpts: Record<string, unknown> = {
        valign: "middle",
        border: { pt: style.borderWidth, color: borderColor, type: "solid" },
      };
      if (applyHeader && headerFill) {
        cellOpts.fill = { color: headerFill };
      } else if (applyZebra && zebraFill) {
        cellOpts.fill = { color: zebraFill };
      } else if (bodyFill) {
        cellOpts.fill = { color: bodyFill };
      }
      rowOut.push({ text: runs, options: cellOpts });
    }
    rows.push(rowOut);
    if (!isHeaderRow) bodyRowIdx++;
  }

  const totalWIn = pxToIn(el.w);
  const totalHIn = pxToIn(el.h);
  const colRatios =
    el.colRatios.length === el.cols
      ? el.colRatios
      : Array.from({ length: el.cols }, () => 1);
  const rowRatios =
    el.rowRatios.length === el.rows
      ? el.rowRatios
      : Array.from({ length: el.rows }, () => 1);
  const colW = ratiosToPixels(colRatios, totalWIn);
  const rowH = ratiosToPixels(rowRatios, totalHIn);

  const options: Record<string, unknown> = {
    x: pxToIn(el.x),
    y: pxToIn(el.y),
    w: totalWIn,
    h: totalHIn,
    colW,
    rowH,
    border: { pt: style.borderWidth, color: borderColor, type: "solid" },
  };
  if (el.rotation) options.rotate = el.rotation;

  slide.addTable(rows, options);
}
