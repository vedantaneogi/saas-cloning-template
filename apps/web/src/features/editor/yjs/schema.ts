/**
 * Y.Doc schema and projection helpers.
 *
 * Structure:
 *   doc.getMap('meta')   -> { id, title, themeId, pageWidth, pageHeight, schemaVersion }
 *   doc.getArray('slides') -> Y.Array<Y.Map>
 *     slide Y.Map: { id, layoutId, background (plain), notes, elements: Y.Array<Y.Map> }
 *       element Y.Map: { id, type, x, y, w, h, z, rotation, locked, ...type-specific }
 *
 *   For text elements, `text` holds the block-level props (align, fontSize,
 *   fontFamily, color, lineHeight, placeholder) as plain JSON, and `doc`
 *   holds a Y.XmlFragment bound to Tiptap via y-prosemirror.
 *
 *   Table elements store structural fields (rows, cols, colRatios, rowRatios,
 *   cells, style) as plain JSON, plus `"cells"` as a Y.Map<cellId, Y.XmlFragment>
 *   for per-cell rich-text.
 */

import * as Y from "yjs";
import {
  prosemirrorJSONToYXmlFragment,
  yXmlFragmentToProsemirrorJSON,
} from "y-prosemirror";
import { getTableCellSchema, getTextSchema } from "../tiptap/extensions";
import type {
  BaseElement,
  ChartDataPoint,
  ChartElement,
  ChartKind,
  ChartStyle,
  Comment,
  Deck,
  DeckMaster,
  DeckMeta,
  ElementId,
  ImageCrop,
  ImageElement,
  LegacyTableElement,
  ShapeElement,
  Slide,
  SlideElement,
  TableCell,
  TableElement,
  TableStyle,
  TextBlock,
  TextElement,
} from "../model/types";
import { migrateLegacyTable } from "../model/migrateTable";

export type YSlide = Y.Map<unknown>;
export type YElement = Y.Map<unknown>;
export type YComment = Y.Map<unknown>;

const COMMENT_KEYS: Array<keyof Comment> = [
  "id",
  "slideId",
  "authorId",
  "authorName",
  "authorPicture",
  "text",
  "createdAt",
  "updatedAt",
  "resolvedAt",
  "resolvedByName",
];

export function commentToYMap(c: Comment): YComment {
  const m = new Y.Map<unknown>();
  for (const k of COMMENT_KEYS) m.set(k, c[k]);
  return m;
}

export function readComment(m: YComment): Comment {
  return {
    id: m.get("id") as string,
    slideId: m.get("slideId") as string,
    authorId: m.get("authorId") as string,
    authorName: m.get("authorName") as string,
    authorPicture: (m.get("authorPicture") as string | null) ?? null,
    text: m.get("text") as string,
    createdAt: m.get("createdAt") as number,
    updatedAt: (m.get("updatedAt") as number | null) ?? null,
    resolvedAt: (m.get("resolvedAt") as number | null) ?? null,
    resolvedByName: (m.get("resolvedByName") as string | null) ?? null,
  };
}

export function findCommentYMap(doc: Y.Doc, commentId: string): YComment | null {
  const comments = doc.getArray<YComment>("comments");
  for (const c of comments) {
    if (c.get("id") === commentId) return c;
  }
  return null;
}

export function findCommentIndex(doc: Y.Doc, commentId: string): number {
  const comments = doc.getArray<YComment>("comments");
  for (let i = 0; i < comments.length; i++) {
    if (comments.get(i).get("id") === commentId) return i;
  }
  return -1;
}

export function sanitizeTextBlock(text: TextBlock): TextBlock {
  const { contentJson: _drop, ...rest } = text;
  return rest;
}

function sanitizeCell(cell: TableCell): TableCell {
  const { contentJson: _drop, ...rest } = cell;
  return rest;
}

function isNewTableElement(el: SlideElement | LegacyTableElement): el is TableElement {
  if (el.type !== "table") return false;
  const maybe = el as TableElement;
  return Array.isArray(maybe.cells) && Array.isArray(maybe.colRatios);
}

function elementToYMap(el: SlideElement): YElement {
  const m = new Y.Map<unknown>();
  m.set("id", el.id);
  m.set("type", el.type);
  m.set("x", el.x);
  m.set("y", el.y);
  m.set("w", el.w);
  m.set("h", el.h);
  m.set("z", el.z);
  if (el.rotation !== undefined) m.set("rotation", el.rotation);
  if (el.locked !== undefined) m.set("locked", el.locked);
  if (el.type === "text") {
    m.set("text", sanitizeTextBlock(el.text));
    m.set("doc", new Y.XmlFragment());
  } else if (el.type === "shape") {
    m.set("shape", el.shape);
    if (el.fill !== undefined) m.set("fill", el.fill);
    if (el.stroke !== undefined) m.set("stroke", el.stroke);
    if (el.strokeWidth !== undefined) m.set("strokeWidth", el.strokeWidth);
    if (el.radius !== undefined) m.set("radius", el.radius);
    if (el.text !== undefined) {
      m.set("text", sanitizeTextBlock(el.text));
      m.set("doc", new Y.XmlFragment());
    }
  } else if (el.type === "table") {
    m.set("style", { ...el.style });
    m.set("rows", el.rows);
    m.set("cols", el.cols);
    m.set("colRatios", [...el.colRatios]);
    m.set("rowRatios", [...el.rowRatios]);
    m.set("cells", el.cells.map(sanitizeCell));
    const cellFragments = new Y.Map<Y.XmlFragment>();
    for (const cell of el.cells) {
      cellFragments.set(cell.id, new Y.XmlFragment());
    }
    m.set("cellFragments", cellFragments);
  } else if (el.type === "chart") {
    m.set("chartKind", el.chartKind);
    m.set("style", { ...el.style });
    m.set(
      "data",
      el.data.map((p) => ({ id: p.id, label: p.label, value: p.value })),
    );
  } else {
    m.set("src", el.src);
    if (el.alt !== undefined) m.set("alt", el.alt);
    if (el.crop !== undefined) m.set("crop", { ...el.crop });
  }
  return m;
}

function slideToYMap(s: Slide): YSlide {
  const m = new Y.Map<unknown>();
  m.set("id", s.id);
  m.set("layoutId", s.layoutId);
  m.set("background", { ...s.background });
  if (s.notes !== undefined) m.set("notes", s.notes);
  const els = new Y.Array<YElement>();
  m.set("elements", els);
  els.insert(0, s.elements.map(elementToYMap));
  return m;
}

function normalizeTableElement(el: SlideElement | LegacyTableElement): {
  element: TableElement;
  cellContent: Map<string, unknown>;
} {
  if (el.type !== "table") {
    throw new Error("normalizeTableElement called on non-table element");
  }
  if (isNewTableElement(el)) {
    const content = new Map<string, unknown>();
    for (const cell of el.cells) {
      if (cell.contentJson) content.set(cell.id, cell.contentJson);
    }
    return { element: el, cellContent: content };
  }
  return migrateLegacyTable(el as LegacyTableElement);
}

export function hydrateDoc(doc: Y.Doc, deck: Deck) {
  const meta = doc.getMap<unknown>("meta");
  const slides = doc.getArray<YSlide>("slides");
  const comments = doc.getArray<YComment>("comments");
  doc.transact(() => {
    meta.set("id", deck.id);
    meta.set("title", deck.meta.title);
    meta.set("themeId", deck.meta.themeId);
    meta.set("pageWidth", deck.meta.pageWidth);
    meta.set("pageHeight", deck.meta.pageHeight);
    meta.set("schemaVersion", deck.meta.schemaVersion);
    meta.set("master", deck.meta.master ?? {});
    if (slides.length) slides.delete(0, slides.length);

    const normalizedSlides: Slide[] = deck.slides.map((s) => ({
      ...s,
      elements: s.elements.map((el) =>
        el.type === "table" ? normalizeTableElement(el).element : el,
      ),
    }));
    slides.insert(0, normalizedSlides.map(slideToYMap));
    if (comments.length) comments.delete(0, comments.length);
    if (deck.comments?.length) {
      comments.insert(0, deck.comments.map(commentToYMap));
    }

    // Second pass: populate text / table-cell Y.XmlFragments now that all
    // Y.Maps are attached. Deferring matches what y-prosemirror needs —
    // a detached fragment cannot receive content changes without losing them.
    let textSchema: ReturnType<typeof getTextSchema> | null = null;
    let cellSchema: ReturnType<typeof getTableCellSchema> | null = null;
    for (let i = 0; i < deck.slides.length; i++) {
      const sourceElements = deck.slides[i].elements;
      const ySlide = slides.get(i);
      const yEls = ySlide.get("elements") as Y.Array<YElement>;
      for (let j = 0; j < sourceElements.length; j++) {
        const el = sourceElements[j];
        const yEl = yEls.get(j);
        if (el.type === "table") {
          const { cellContent } = normalizeTableElement(el);
          const cellFragments = yEl.get("cellFragments");
          if (!(cellFragments instanceof Y.Map)) continue;
          try {
            if (!cellSchema) cellSchema = getTableCellSchema();
          } catch (err) {
            console.warn("[hydrateDoc] failed to build cell schema", err);
            continue;
          }
          cellFragments.forEach((fragment, cellId) => {
            if (!(fragment instanceof Y.XmlFragment)) return;
            const content =
              cellContent.get(cellId) ?? {
                type: "doc",
                content: [{ type: "paragraph" }],
              };
            try {
              prosemirrorJSONToYXmlFragment(cellSchema!, content, fragment);
            } catch (err) {
              console.warn("[hydrateDoc] failed to hydrate cell", cellId, err);
            }
          });
          continue;
        }
        const fragment = yEl.get("doc");
        if (!(fragment instanceof Y.XmlFragment)) continue;
        const block =
          el.type === "text"
            ? el.text
            : el.type === "shape"
              ? el.text
              : undefined;
        const contentJson = block?.contentJson;
        if (!contentJson || typeof contentJson !== "object") continue;
        try {
          if (!textSchema) textSchema = getTextSchema();
          prosemirrorJSONToYXmlFragment(textSchema, contentJson, fragment);
        } catch (err) {
          console.warn("[hydrateDoc] failed to hydrate text fragment", err);
        }
      }
    }
  }, "hydrate");
}

function readTableElement(m: YElement, base: BaseElement): TableElement {
  const style = { ...((m.get("style") as TableStyle | undefined) ?? {}) };
  const rows = (m.get("rows") as number | undefined) ?? 0;
  const cols = (m.get("cols") as number | undefined) ?? 0;
  const colRatios = [...((m.get("colRatios") as number[] | undefined) ?? [])];
  const rowRatios = [...((m.get("rowRatios") as number[] | undefined) ?? [])];
  const rawCells = (m.get("cells") as TableCell[] | undefined) ?? [];
  const cellFragments = m.get("cellFragments");
  const fragMap =
    cellFragments instanceof Y.Map ? (cellFragments as Y.Map<Y.XmlFragment>) : null;
  const cells: TableCell[] = rawCells.map((c) => {
    const copy: TableCell = { id: c.id, row: c.row, col: c.col };
    if (fragMap) {
      const frag = fragMap.get(c.id);
      if (frag instanceof Y.XmlFragment) {
        try {
          copy.contentJson = yXmlFragmentToProsemirrorJSON(frag);
        } catch {
          // leave undefined
        }
      }
    }
    return copy;
  });
  return {
    ...base,
    type: "table",
    rows,
    cols,
    colRatios,
    rowRatios,
    cells,
    style,
  };
}

function readElement(m: YElement): SlideElement {
  const type = m.get("type") as
    | "text"
    | "shape"
    | "image"
    | "table"
    | "chart";
  const base: BaseElement = {
    id: m.get("id") as ElementId,
    x: m.get("x") as number,
    y: m.get("y") as number,
    w: m.get("w") as number,
    h: m.get("h") as number,
    z: m.get("z") as number,
    rotation: m.get("rotation") as number | undefined,
    locked: m.get("locked") as boolean | undefined,
  };
  if (type === "table") {
    return readTableElement(m, base);
  }
  if (type === "chart") {
    const rawData = m.get("data") as ChartDataPoint[] | undefined;
    const data: ChartDataPoint[] = Array.isArray(rawData)
      ? rawData.map((p) => ({ id: p.id, label: p.label, value: p.value }))
      : [];
    const style = (m.get("style") as ChartStyle | undefined) ?? {};
    const chart: ChartElement = {
      ...base,
      type: "chart",
      chartKind: m.get("chartKind") as ChartKind,
      data,
      style: { ...style },
    };
    return chart;
  }
  if (type === "text") {
    const text = { ...(m.get("text") as TextElement["text"]) };
    const fragment = m.get("doc");
    if (fragment instanceof Y.XmlFragment) {
      try {
        text.contentJson = yXmlFragmentToProsemirrorJSON(fragment);
      } catch {
        // leave contentJson undefined
      }
    }
    const el: TextElement = { ...base, type, text };
    return el;
  }
  if (type === "shape") {
    const rawText = m.get("text") as TextElement["text"] | undefined;
    let shapeText: TextElement["text"] | undefined;
    if (rawText) {
      shapeText = { ...rawText };
      const fragment = m.get("doc");
      if (fragment instanceof Y.XmlFragment) {
        try {
          shapeText.contentJson = yXmlFragmentToProsemirrorJSON(fragment);
        } catch {
          // leave contentJson undefined on failure
        }
      }
    }
    const el: ShapeElement = {
      ...base,
      type,
      shape: m.get("shape") as ShapeElement["shape"],
      fill: m.get("fill") as string | undefined,
      stroke: m.get("stroke") as string | undefined,
      strokeWidth: m.get("strokeWidth") as number | undefined,
      radius: m.get("radius") as number | undefined,
      text: shapeText,
    };
    return el;
  }
  const rawCrop = m.get("crop") as ImageCrop | undefined;
  const el: ImageElement = {
    ...base,
    type,
    src: m.get("src") as string,
    alt: m.get("alt") as string | undefined,
    crop: rawCrop ? { ...rawCrop } : undefined,
  };
  return el;
}

function readSlide(m: YSlide): Slide {
  const elsArr = m.get("elements") as Y.Array<YElement>;
  return {
    id: m.get("id") as string,
    layoutId: m.get("layoutId") as string,
    background: m.get("background") as Slide["background"],
    notes: (m.get("notes") as string | undefined) || undefined,
    elements: elsArr.toArray().map(readElement),
  };
}

export function readDeck(doc: Y.Doc): Deck {
  const meta = doc.getMap<unknown>("meta");
  const slides = doc.getArray<YSlide>("slides");
  const comments = doc.getArray<YComment>("comments");
  const rawMaster = meta.get("master") as DeckMaster | undefined;
  const deckMeta: DeckMeta = {
    title: meta.get("title") as string,
    themeId: meta.get("themeId") as string,
    pageWidth: meta.get("pageWidth") as number,
    pageHeight: meta.get("pageHeight") as number,
    schemaVersion: meta.get("schemaVersion") as number,
    master:
      rawMaster &&
      (rawMaster.titleText ||
        rawMaster.footer ||
        rawMaster.showSlideNumber ||
        rawMaster.showDate)
        ? rawMaster
        : undefined,
  };
  return {
    id: meta.get("id") as string,
    meta: deckMeta,
    slides: slides.toArray().map(readSlide),
    comments: comments.toArray().map(readComment),
  };
}

export function findSlideYMap(doc: Y.Doc, slideId: string): YSlide | null {
  const slides = doc.getArray<YSlide>("slides");
  for (const s of slides) {
    if (s.get("id") === slideId) return s;
  }
  return null;
}

export function findSlideIndex(doc: Y.Doc, slideId: string): number {
  const slides = doc.getArray<YSlide>("slides");
  for (let i = 0; i < slides.length; i++) {
    if (slides.get(i).get("id") === slideId) return i;
  }
  return -1;
}

export function findElementYMap(
  slide: YSlide,
  elementId: ElementId,
): { el: YElement; index: number } | null {
  const els = slide.get("elements") as Y.Array<YElement>;
  for (let i = 0; i < els.length; i++) {
    const el = els.get(i);
    if (el.get("id") === elementId) return { el, index: i };
  }
  return null;
}

export function populateTextFragmentFromJson(yEl: YElement, contentJson: unknown): void {
  if (!contentJson || typeof contentJson !== "object") return;
  const fragment = yEl.get("doc");
  if (!(fragment instanceof Y.XmlFragment)) return;
  try {
    prosemirrorJSONToYXmlFragment(getTextSchema(), contentJson, fragment);
  } catch (err) {
    console.warn("[populateTextFragment] failed to hydrate text fragment", err);
  }
}

export function populateTableCellFragments(
  yEl: YElement,
  cellContent: Map<string, unknown>,
): void {
  const cellFragments = yEl.get("cellFragments");
  if (!(cellFragments instanceof Y.Map)) return;
  const schema = getTableCellSchema();
  cellFragments.forEach((fragment, cellId) => {
    if (!(fragment instanceof Y.XmlFragment)) return;
    const content =
      cellContent.get(cellId) ?? {
        type: "doc",
        content: [{ type: "paragraph" }],
      };
    try {
      prosemirrorJSONToYXmlFragment(schema, content, fragment);
    } catch (err) {
      console.warn("[populateTableCellFragments] failed for cell", cellId, err);
    }
  });
}

export function getTableCellYFragment(
  yEl: YElement,
  cellId: string,
): Y.XmlFragment | null {
  const cellFragments = yEl.get("cellFragments");
  if (!(cellFragments instanceof Y.Map)) return null;
  const frag = (cellFragments as Y.Map<unknown>).get(cellId);
  return frag instanceof Y.XmlFragment ? frag : null;
}

export function ensureTableCellFragment(
  yEl: YElement,
  cellId: string,
): Y.XmlFragment {
  let cellFragments = yEl.get("cellFragments");
  if (!(cellFragments instanceof Y.Map)) {
    cellFragments = new Y.Map<Y.XmlFragment>();
    yEl.set("cellFragments", cellFragments);
  }
  const map = cellFragments as Y.Map<Y.XmlFragment>;
  let frag = map.get(cellId);
  if (!(frag instanceof Y.XmlFragment)) {
    frag = new Y.XmlFragment();
    map.set(cellId, frag);
  }
  return frag;
}

export { slideToYMap, elementToYMap };
