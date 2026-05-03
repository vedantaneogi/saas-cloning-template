import type { TextBlock } from "../model/types";

type Mark = { type: string; attrs?: Record<string, unknown> };

type PMNode = {
  type: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: PMNode[];
};

export type PptxTextRun = {
  text: string;
  options?: {
    bold?: boolean;
    italic?: boolean;
    underline?: { style: "sng" } | boolean;
    strike?: boolean;
    color?: string;
    fontSize?: number;
    fontFace?: string;
    hyperlink?: { url: string };
    breakLine?: boolean;
    align?: "left" | "center" | "right" | "justify";
    bullet?: boolean | { type: "bullet" | "number"; startAt?: number };
    indentLevel?: number;
  };
};

type ListContext = {
  kind: "bullet" | "ordered";
  level: number;
  pendingStart?: number;
};

const stripHash = (c: string | undefined): string | undefined =>
  c?.startsWith("#") ? c.slice(1) : c;

const isPMDoc = (value: unknown): value is PMNode => {
  if (!value || typeof value !== "object") return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
};

function runFromTextNode(node: PMNode, block: TextBlock): PptxTextRun {
  const marks = node.marks ?? [];
  const options: PptxTextRun["options"] = {};

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
      case "strong":
        options.bold = true;
        break;
      case "italic":
      case "em":
        options.italic = true;
        break;
      case "underline":
        options.underline = { style: "sng" };
        break;
      case "strike":
        options.strike = true;
        break;
      case "textStyle": {
        const color = mark.attrs?.color as string | undefined;
        const fontFamily = mark.attrs?.fontFamily as string | undefined;
        if (color) options.color = stripHash(color);
        if (fontFamily) options.fontFace = fontFamily;
        break;
      }
      case "link": {
        const href = mark.attrs?.href as string | undefined;
        if (href) options.hyperlink = { url: href };
        break;
      }
    }
  }

  if (!options.fontSize && block.fontSize) options.fontSize = block.fontSize;
  if (!options.fontFace && block.fontFamily) options.fontFace = block.fontFamily;
  if (!options.color) {
    const blockColor = stripHash(block.color);
    if (blockColor) options.color = blockColor;
  }

  return { text: node.text ?? "", options };
}

function collectRuns(
  node: PMNode,
  block: TextBlock,
  out: PptxTextRun[],
  isFirstParagraph: { value: boolean },
  listStack: ListContext[],
): void {
  if (node.type === "bulletList" || node.type === "orderedList") {
    const startRaw = node.attrs?.start;
    const pendingStart =
      node.type === "orderedList" &&
      typeof startRaw === "number" &&
      startRaw > 1
        ? startRaw
        : undefined;
    listStack.push({
      kind: node.type === "orderedList" ? "ordered" : "bullet",
      level: listStack.length,
      pendingStart,
    });
    for (const child of node.content ?? []) {
      collectRuns(child, block, out, isFirstParagraph, listStack);
    }
    listStack.pop();
    return;
  }

  if (node.type === "listItem") {
    for (const child of node.content ?? []) {
      collectRuns(child, block, out, isFirstParagraph, listStack);
    }
    return;
  }

  if (node.type === "paragraph" || node.type === "heading") {
    if (!isFirstParagraph.value) {
      out.push({ text: "", options: { breakLine: true } });
    }
    isFirstParagraph.value = false;
    const paragraphStart = out.length;
    const align = node.attrs?.textAlign as
      | "left"
      | "center"
      | "right"
      | "justify"
      | undefined;
    const children = node.content ?? [];
    for (const child of children) {
      collectRuns(child, block, out, isFirstParagraph, listStack);
    }

    const listCtx = listStack[listStack.length - 1];
    if (listCtx && out.length > paragraphStart) {
      // pptxgenjs 4.0.1 falls through when bullet={type:"bullet"}; use `true`
      // for the default bullet character. Ordered lists take the object form.
      const bullet: NonNullable<PptxTextRun["options"]>["bullet"] =
        listCtx.kind === "ordered"
          ? listCtx.pendingStart !== undefined
            ? { type: "number", startAt: listCtx.pendingStart }
            : { type: "number" }
          : true;
      if (listCtx.kind === "ordered" && listCtx.pendingStart !== undefined) {
        listCtx.pendingStart = undefined;
      }
      for (let i = paragraphStart; i < out.length; i++) {
        const run = out[i];
        run.options = {
          ...run.options,
          bullet,
          ...(listCtx.level > 0 ? { indentLevel: listCtx.level } : {}),
        };
      }
    }

    if (align && out.length) {
      const last = out[out.length - 1];
      last.options = { ...last.options, align };
    }
    return;
  }

  if (node.type === "text") {
    out.push(runFromTextNode(node, block));
    return;
  }

  if (node.type === "hardBreak") {
    out.push({ text: "", options: { breakLine: true } });
    return;
  }

  // doc / unknown container — walk children
  for (const child of node.content ?? []) {
    collectRuns(child, block, out, isFirstParagraph, listStack);
  }
}

/**
 * Convert ProseMirror JSON stored on a TextElement to pptxgenjs text runs.
 * Falls back to placeholder / empty string if no content is available.
 */
export function proseMirrorToPptxRuns(
  contentJson: unknown,
  block: TextBlock,
): PptxTextRun[] {
  if (!isPMDoc(contentJson)) {
    const fallback = block.placeholder ?? "";
    return [
      {
        text: fallback,
        options: {
          bold: false,
          color: stripHash(block.color),
          fontSize: block.fontSize,
          fontFace: block.fontFamily,
        },
      },
    ];
  }

  const runs: PptxTextRun[] = [];
  collectRuns(contentJson, block, runs, { value: true }, []);
  if (runs.length === 0) {
    return [{ text: "", options: {} }];
  }
  return runs;
}
