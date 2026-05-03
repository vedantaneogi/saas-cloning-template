import type { TableCell, TableElement, TableStyle } from "./types";

export const DEFAULT_TABLE_STYLE: Required<TableStyle> = {
  headerEnabled: true,
  headerFill: "#dfe6f7",
  headerBold: true,
  zebraEnabled: false,
  zebraFill: "#f1f3f4",
  borderColor: "#c7c9cc",
  borderWidth: 1,
  tableFill: "transparent",
};

function newCellId(): string {
  return `cell-${crypto.randomUUID().slice(0, 8)}`;
}

function buildCells(rows: number, cols: number): TableCell[] {
  const out: TableCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ id: newCellId(), row: r, col: c });
    }
  }
  return out;
}

function equalRatios(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

/**
 * Create a default TableElement sized to 60% × ~32px/row of the slide, centered.
 * Columns and rows are equal-ratio by default (each cell gets `1fr`).
 */
export function buildDefaultTableElement(params: {
  id: string;
  rows: number;
  cols: number;
  slideWidth: number;
  slideHeight: number;
  z: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}): TableElement {
  const rows = Math.max(1, params.rows);
  const cols = Math.max(1, params.cols);
  const w = params.w ?? params.slideWidth * 0.6;
  const h = params.h ?? Math.max(96, rows * 40 + 2);
  const x = params.x ?? (params.slideWidth - w) / 2;
  const y = params.y ?? (params.slideHeight - h) / 2;
  return {
    id: params.id,
    type: "table",
    x,
    y,
    w,
    h,
    z: params.z,
    rows,
    cols,
    colRatios: equalRatios(cols),
    rowRatios: equalRatios(rows),
    cells: buildCells(rows, cols),
    style: { ...DEFAULT_TABLE_STYLE },
  };
}
