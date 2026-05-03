import type { TableElement } from "../model/types";

export const MIN_ROW_H = 32;
export const MIN_COL_W = 48;

export function countTableDims(element: TableElement): { rows: number; cols: number } {
  return {
    rows: Math.max(0, element.rows ?? 0),
    cols: Math.max(0, element.cols ?? 0),
  };
}

export function tableMinSize(element: TableElement): { minW: number; minH: number } {
  const { rows, cols } = countTableDims(element);
  return {
    minW: cols > 0 ? cols * MIN_COL_W : 0,
    minH: rows > 0 ? rows * MIN_ROW_H : 0,
  };
}
