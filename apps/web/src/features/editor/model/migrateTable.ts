import type {
  LegacyTableElement,
  TableCell,
  TableElement,
  TableStyle,
} from "./types";
import { DEFAULT_TABLE_STYLE } from "./tableDefaults";

type PMNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
};

function newCellId(): string {
  return `cell-${crypto.randomUUID().slice(0, 8)}`;
}

function findTableNode(contentJson: unknown): PMNode | null {
  if (!contentJson || typeof contentJson !== "object") return null;
  const root = contentJson as PMNode;
  if (root.type === "table") return root;
  const children = Array.isArray(root.content) ? root.content : [];
  for (const child of children) {
    if (child && child.type === "table") return child;
  }
  return null;
}

function deriveRatiosFromColwidths(firstRow: PMNode, cols: number): number[] {
  const widths: number[] = [];
  const cells = Array.isArray(firstRow.content) ? firstRow.content : [];
  for (const cell of cells) {
    const cw = cell?.attrs?.colwidth;
    const colspan = typeof cell?.attrs?.colspan === "number" ? (cell.attrs.colspan as number) : 1;
    if (Array.isArray(cw) && cw.length > 0) {
      for (let i = 0; i < colspan; i++) {
        const v = typeof cw[i] === "number" ? (cw[i] as number) : (cw[0] as number);
        widths.push(typeof v === "number" && v > 0 ? v : 1);
      }
    } else {
      for (let i = 0; i < colspan; i++) widths.push(1);
    }
  }
  while (widths.length < cols) widths.push(1);
  return widths.slice(0, cols);
}

function cellParagraphsFromPm(pmCell: PMNode | undefined): unknown[] {
  if (!pmCell) return [{ type: "paragraph" }];
  const paragraphs = Array.isArray(pmCell.content) ? pmCell.content : [];
  const out: unknown[] = [];
  for (const p of paragraphs) {
    if (p && p.type === "paragraph") {
      out.push({
        type: "paragraph",
        ...(p.attrs ? { attrs: p.attrs } : null),
        ...(Array.isArray(p.content) ? { content: p.content } : null),
      });
    }
  }
  return out.length ? out : [{ type: "paragraph" }];
}

function equalRatios(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

export type MigratedTable = {
  element: TableElement;
  cellContent: Map<string, unknown>;
};

/**
 * Converts a legacy table (ProseMirror `contentJson` with Tiptap-table nodes)
 * into the new row-major CSS-grid shape. Returns the element plus a map of
 * `cellId → paragraphs` so the caller can seed per-cell fragments.
 */
export function migrateLegacyTable(legacy: LegacyTableElement): MigratedTable {
  const table = findTableNode(legacy.contentJson);
  const rawStyle: TableStyle = { ...(legacy.style ?? {}) };
  const style: TableStyle = { ...DEFAULT_TABLE_STYLE, ...rawStyle };

  if (!table) {
    const rows = Math.max(1, legacy.rows ?? 3);
    const cols = Math.max(1, legacy.cols ?? 3);
    const cells: TableCell[] = [];
    const cellContent = new Map<string, unknown>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = newCellId();
        cells.push({ id, row: r, col: c });
        cellContent.set(id, { type: "doc", content: [{ type: "paragraph" }] });
      }
    }
    const element: TableElement = {
      id: legacy.id,
      type: "table",
      x: legacy.x,
      y: legacy.y,
      w: legacy.w,
      h: legacy.h,
      z: legacy.z,
      rotation: legacy.rotation,
      locked: legacy.locked,
      rows,
      cols,
      colRatios: equalRatios(cols),
      rowRatios: equalRatios(rows),
      cells,
      style,
    };
    return { element, cellContent };
  }

  const rowNodes = (table.content ?? []).filter(
    (n) => n && n.type === "tableRow",
  );
  const rows = Math.max(1, rowNodes.length);
  const firstRow = rowNodes[0];
  let cols = 0;
  const firstRowCells = Array.isArray(firstRow?.content) ? firstRow!.content : [];
  for (const cell of firstRowCells) {
    const cs = typeof cell?.attrs?.colspan === "number" ? (cell.attrs.colspan as number) : 1;
    cols += cs;
  }
  cols = Math.max(1, cols);

  const colRatios = firstRow ? deriveRatiosFromColwidths(firstRow, cols) : equalRatios(cols);
  const rowRatios = equalRatios(rows);

  const cells: TableCell[] = [];
  const cellContent = new Map<string, unknown>();
  for (let r = 0; r < rows; r++) {
    const rowCells = Array.isArray(rowNodes[r]?.content) ? rowNodes[r]!.content! : [];
    let colCursor = 0;
    for (let ci = 0; ci < rowCells.length && colCursor < cols; ci++) {
      const pmCell = rowCells[ci];
      const cs = typeof pmCell?.attrs?.colspan === "number" ? (pmCell.attrs.colspan as number) : 1;
      const id = newCellId();
      cells.push({ id, row: r, col: colCursor });
      const paragraphs = cellParagraphsFromPm(pmCell);
      cellContent.set(id, { type: "doc", content: paragraphs });
      for (let extra = 1; extra < cs && colCursor + extra < cols; extra++) {
        const fillerId = newCellId();
        cells.push({ id: fillerId, row: r, col: colCursor + extra });
        cellContent.set(fillerId, { type: "doc", content: [{ type: "paragraph" }] });
      }
      colCursor += cs;
    }
    while (colCursor < cols) {
      const id = newCellId();
      cells.push({ id, row: r, col: colCursor });
      cellContent.set(id, { type: "doc", content: [{ type: "paragraph" }] });
      colCursor++;
    }
  }

  const element: TableElement = {
    id: legacy.id,
    type: "table",
    x: legacy.x,
    y: legacy.y,
    w: legacy.w,
    h: legacy.h,
    z: legacy.z,
    rotation: legacy.rotation,
    locked: legacy.locked,
    rows,
    cols,
    colRatios,
    rowRatios,
    cells,
    style,
  };
  return { element, cellContent };
}

export function isLegacyTableShape(el: unknown): el is LegacyTableElement {
  if (!el || typeof el !== "object") return false;
  const o = el as Record<string, unknown>;
  if (o.type !== "table") return false;
  return !Array.isArray(o.cells) || !Array.isArray(o.colRatios);
}
