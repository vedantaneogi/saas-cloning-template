import type { TextBlock } from "../model/types";
import {
  attr,
  childrenByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
  localName,
} from "./pptxXml";
import {
  pptxFontSizePt,
  pptxLineSpacingToMultiple,
} from "./pptxUnits";
import { resolveSolidFillColor, type ThemeContext } from "./parseTheme";

type Mark = { type: string; attrs?: Record<string, unknown> };

type PMNode = {
  type: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: PMNode[];
};

function mapAlign(
  v: string | null,
): "left" | "center" | "right" | "justify" | null {
  switch (v) {
    case "l":
      return "left";
    case "ctr":
      return "center";
    case "r":
      return "right";
    case "just":
      return "justify";
    default:
      return null;
  }
}

function readColorFromSolidFillParent(
  parent: Element,
  themeCtx: ThemeContext | null,
): string | undefined {
  return resolveSolidFillColor(parent, themeCtx);
}

function runMarks(
  rPr: Element | null,
  rels: Map<string, { target: string; type: string }>,
  themeCtx: ThemeContext | null,
): Mark[] {
  const marks: Mark[] = [];
  if (!rPr) return marks;
  if (attr(rPr, "b") === "1") marks.push({ type: "bold" });
  if (attr(rPr, "i") === "1") marks.push({ type: "italic" });
  const u = attr(rPr, "u");
  if (u && u !== "none") marks.push({ type: "underline" });
  const strike = attr(rPr, "strike");
  if (strike && strike !== "noStrike") marks.push({ type: "strike" });

  const color = readColorFromSolidFillParent(rPr, themeCtx);
  const latin = firstChildByLocal(rPr, "latin");
  const fontFamily = latin ? attr(latin, "typeface") ?? undefined : undefined;
  if (color || fontFamily) {
    const attrs: Record<string, unknown> = {};
    if (color) attrs.color = color;
    if (fontFamily) attrs.fontFamily = fontFamily;
    marks.push({ type: "textStyle", attrs });
  }

  const hlink = firstChildByLocal(rPr, "hlinkClick");
  if (hlink) {
    const rid = attr(hlink, "r:id");
    if (rid) {
      const rel = rels.get(rid);
      if (rel?.target) {
        marks.push({ type: "link", attrs: { href: rel.target } });
      }
    }
  }
  return marks;
}

type ListInfo = {
  kind: "ordered" | "bullet";
  level: number;
  startAt?: number;
};

function getListInfo(pPr: Element | null): ListInfo | null {
  if (!pPr) return null;
  const buAutoNum = firstChildByLocal(pPr, "buAutoNum");
  const buChar = firstChildByLocal(pPr, "buChar");
  const buNone = firstChildByLocal(pPr, "buNone");
  if (buNone) return null;
  if (!buAutoNum && !buChar) return null;

  const lvlRaw = attr(pPr, "lvl");
  const lvl = lvlRaw ? Math.max(0, parseInt(lvlRaw, 10) || 0) : 0;

  if (buAutoNum) {
    const startAtRaw = attr(buAutoNum, "startAt");
    const startAt = startAtRaw ? parseInt(startAtRaw, 10) : undefined;
    return {
      kind: "ordered",
      level: lvl,
      startAt: startAt && startAt > 1 ? startAt : undefined,
    };
  }
  return { kind: "bullet", level: lvl };
}

function paragraphToNode(
  p: Element,
  rels: Map<string, { target: string; type: string }>,
  firstDefaults: {
    align?: "left" | "center" | "right" | "justify";
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    lineHeight?: number;
    taken?: boolean;
  },
  themeCtx: ThemeContext | null,
  inheritedColor: string | undefined,
): PMNode {
  const pPr = firstChildByLocal(p, "pPr");
  const align = pPr ? mapAlign(attr(pPr, "algn")) : null;

  // Capture block-level defaults from the first paragraph / first run.
  if (!firstDefaults.taken) {
    if (align) firstDefaults.align = align;
    if (pPr) {
      const lnSpc = firstChildByLocal(pPr, "lnSpc");
      if (lnSpc) {
        const spcPct = firstChildByLocal(lnSpc, "spcPct");
        if (spcPct) {
          firstDefaults.lineHeight = pptxLineSpacingToMultiple(
            attr(spcPct, "val"),
          );
        }
      }
    }
  }

  const children: PMNode[] = [];

  for (let i = 0; i < p.children.length; i++) {
    const c = p.children[i];
    const ln = localName(c);
    if (ln === "r") {
      const rPr = firstChildByLocal(c, "rPr");
      const t = firstChildByLocal(c, "t");
      const text = t?.textContent ?? "";
      if (!firstDefaults.taken) {
        const sz = rPr ? pptxFontSizePt(attr(rPr, "sz")) : undefined;
        const color = rPr
          ? readColorFromSolidFillParent(rPr, themeCtx)
          : undefined;
        const latin = rPr ? firstChildByLocal(rPr, "latin") : null;
        const fontFamily = latin
          ? attr(latin, "typeface") ?? undefined
          : undefined;
        if (sz) firstDefaults.fontSize = sz;
        if (color) firstDefaults.color = color;
        else if (inheritedColor && !firstDefaults.color) {
          firstDefaults.color = inheritedColor;
        }
        if (fontFamily) firstDefaults.fontFamily = fontFamily;
        firstDefaults.taken = true;
      }
      if (text === "") continue;
      const marks = runMarks(rPr, rels, themeCtx);
      children.push({
        type: "text",
        text,
        ...(marks.length ? { marks } : {}),
      });
    } else if (ln === "br") {
      children.push({ type: "hardBreak" });
    } else if (ln === "fld") {
      const t = firstChildByLocal(c, "t");
      const text = t?.textContent ?? "";
      if (text) children.push({ type: "text", text });
    }
  }

  const attrs: Record<string, unknown> = {};
  if (align) attrs.textAlign = align;

  const node: PMNode = { type: "paragraph" };
  if (Object.keys(attrs).length) node.attrs = attrs;
  if (children.length) node.content = children;
  return node;
}

/**
 * Group paragraphs into ProseMirror `orderedList` / `bulletList` / `listItem`
 * structures based on PPTX `buAutoNum` / `buChar` + `lvl` metadata. Consecutive
 * paragraphs that share kind + level stay in the same list; level increases
 * open nested lists inside the preceding listItem.
 */
function groupIntoLists(
  items: { node: PMNode; list: ListInfo | null }[],
): PMNode[] {
  const root: PMNode[] = [];
  const stack: { node: PMNode; level: number; kind: "ordered" | "bullet" }[] =
    [];

  for (const item of items) {
    if (!item.list) {
      stack.length = 0;
      root.push(item.node);
      continue;
    }

    // Close deeper lists, or same-level lists of a different kind.
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.level > item.list.level) {
        stack.pop();
        continue;
      }
      if (top.level === item.list.level && top.kind !== item.list.kind) {
        stack.pop();
        continue;
      }
      break;
    }

    // Open new list(s) until the top of the stack matches the target.
    while (
      stack.length === 0 ||
      stack[stack.length - 1].level < item.list.level
    ) {
      const top = stack[stack.length - 1];
      const newLevel = top ? top.level + 1 : 0;
      const atTarget = newLevel === item.list.level;
      const kind = item.list.kind;
      const listAttrs: Record<string, unknown> = {};
      if (
        atTarget &&
        kind === "ordered" &&
        item.list.startAt !== undefined
      ) {
        listAttrs.start = item.list.startAt;
      }
      const newList: PMNode = {
        type: kind === "ordered" ? "orderedList" : "bulletList",
        ...(Object.keys(listAttrs).length ? { attrs: listAttrs } : {}),
        content: [],
      };
      if (!top) {
        root.push(newList);
      } else {
        const parentItems = top.node.content ?? [];
        const lastItem = parentItems[parentItems.length - 1];
        if (lastItem && lastItem.type === "listItem") {
          (lastItem.content ??= []).push(newList);
        } else {
          parentItems.push({ type: "listItem", content: [newList] });
          top.node.content = parentItems;
        }
      }
      stack.push({ node: newList, level: newLevel, kind });
    }

    const top = stack[stack.length - 1];
    (top.node.content ??= []).push({
      type: "listItem",
      content: [item.node],
    });
  }

  return root;
}

export type InheritedTextDefaults = {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: "left" | "center" | "right" | "justify";
};

export function parseTextFrame(
  txBody: Element,
  rels: Map<string, { target: string; type: string }>,
  themeCtx: ThemeContext | null = null,
  inherited: InheritedTextDefaults | null = null,
): { block: Partial<TextBlock>; contentJson: PMNode } {
  const paragraphs = childrenByLocal(txBody, "p");
  const firstDefaults: {
    align?: "left" | "center" | "right" | "justify";
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    lineHeight?: number;
    taken?: boolean;
  } = {};

  if (inherited) {
    if (inherited.align) firstDefaults.align = inherited.align;
    if (inherited.fontSize) firstDefaults.fontSize = inherited.fontSize;
    if (inherited.fontFamily) firstDefaults.fontFamily = inherited.fontFamily;
    if (inherited.color) firstDefaults.color = inherited.color;
  }

  // lstStyle can carry inherited defaults — use as fallback for fontSize/color.
  const lstStyle = firstChildByLocal(txBody, "lstStyle");
  if (lstStyle) {
    const lvl1 = firstChildByLocal(lstStyle, "lvl1pPr");
    if (lvl1) {
      const defRPr = firstChildByLocal(lvl1, "defRPr");
      if (defRPr) {
        const sz = pptxFontSizePt(attr(defRPr, "sz"));
        if (sz) firstDefaults.fontSize = sz;
        const color = readColorFromSolidFillParent(defRPr, themeCtx);
        if (color) firstDefaults.color = color;
        const latin = firstChildByLocal(defRPr, "latin");
        if (latin) {
          const tf = attr(latin, "typeface");
          if (tf) firstDefaults.fontFamily = tf;
        }
      }
    }
  }

  const content: PMNode[] =
    paragraphs.length === 0
      ? [{ type: "paragraph" }]
      : groupIntoLists(
          paragraphs.map((p) => ({
            node: paragraphToNode(
              p,
              rels,
              firstDefaults,
              themeCtx,
              inherited?.color,
            ),
            list: getListInfo(firstChildByLocal(p, "pPr")),
          })),
        );

  const block: Partial<TextBlock> = {};
  if (firstDefaults.align) block.align = firstDefaults.align;
  if (firstDefaults.fontSize) block.fontSize = firstDefaults.fontSize;
  if (firstDefaults.fontFamily) block.fontFamily = firstDefaults.fontFamily;
  if (firstDefaults.color) block.color = firstDefaults.color;
  if (firstDefaults.lineHeight) block.lineHeight = firstDefaults.lineHeight;

  return {
    block,
    contentJson: { type: "doc", content },
  };
}

/**
 * `<a:r>` runs can appear outside of a `<a:p>` in some producers; also used
 * as a tiny helper to detect whether a txBody has any visible text at all.
 */
export function txBodyHasText(txBody: Element): boolean {
  const t = firstDescendantByLocal(txBody, "t");
  return (t?.textContent ?? "").trim().length > 0;
}
