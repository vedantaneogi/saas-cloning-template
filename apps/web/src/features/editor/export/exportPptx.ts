import type {
  Deck,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  TableElement,
  TextElement,
} from "../model/types";
import { resolveColor, resolveFontFamily, type Theme } from "../themes";
import { proseMirrorToPptxRuns } from "./proseMirrorToPptxRuns";
import { renderTableElement } from "./renderTable";
import { renderChartElement } from "./renderChart";

const PX_PER_INCH = 96;
const pxToIn = (px: number): number => px / PX_PER_INCH;

const stripHash = (c: string | undefined): string | undefined =>
  c?.startsWith("#") ? c.slice(1) : c;

type ShapeName = "rect" | "roundRect" | "ellipse" | "line";

function mapShape(el: ShapeElement): ShapeName {
  switch (el.shape) {
    case "rect":
      return el.radius && el.radius > 0 ? "roundRect" : "rect";
    case "ellipse":
      return "ellipse";
    case "line":
    case "arrow":
      return "line";
  }
}

async function urlToDataUrl(src: string): Promise<string> {
  const res = await fetch(src, { mode: "cors" });
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function resolveBackgroundForPptx(
  slide: Slide,
  theme: Theme,
): { color?: string; data?: string; path?: string } {
  const bg = slide.background;
  if (bg.kind === "solid") {
    const color = resolveColor(bg.color, theme) ?? theme.colors.background;
    return { color: stripHash(color) };
  }
  if (bg.kind === "theme") {
    return { color: stripHash(theme.colors.background) };
  }
  // image
  return { path: bg.src };
}

type PptxSlide = {
  addText: (text: unknown, options: unknown) => unknown;
  addShape: (shapeName: string, options: unknown) => unknown;
  addImage: (options: unknown) => unknown;
  addTable: (rows: unknown, options: unknown) => unknown;
  addChart: (chartType: string, data: unknown, options: unknown) => unknown;
  background: unknown;
};

type PptxDoc = {
  defineLayout: (layout: { name: string; width: number; height: number }) => void;
  layout: string;
  addSlide: () => PptxSlide;
  writeFile: (props: { fileName: string }) => Promise<string>;
};

async function renderTextElement(
  slide: PptxSlide,
  el: TextElement,
  theme: Theme,
): Promise<void> {
  const block = el.text;
  const runs = proseMirrorToPptxRuns(block.contentJson, {
    ...block,
    color: resolveColor(block.color, theme),
    fontFamily: resolveFontFamily(block.fontFamily, theme),
  });
  const align = block.align ?? "left";
  const options: Record<string, unknown> = {
    x: pxToIn(el.x),
    y: pxToIn(el.y),
    w: pxToIn(el.w),
    h: pxToIn(el.h),
    align,
    valign: "top",
    isTextBox: true,
    margin: 0,
    fontSize: block.fontSize ?? 18,
    color: stripHash(resolveColor(block.color, theme)) ?? stripHash(theme.colors.body),
  };
  const fontFace = resolveFontFamily(block.fontFamily, theme);
  if (fontFace) options.fontFace = fontFace.split(",")[0].trim().replace(/['"]/g, "");
  if (el.rotation) options.rotate = el.rotation;
  if (block.lineHeight) options.lineSpacingMultiple = block.lineHeight;
  slide.addText(runs, options);
}

function renderShapeElement(
  slide: PptxSlide,
  el: ShapeElement,
  theme: Theme,
): void {
  const shapeName = mapShape(el);
  const fillColor = stripHash(resolveColor(el.fill, theme));
  const strokeColor = stripHash(resolveColor(el.stroke, theme));
  const options: Record<string, unknown> = {
    x: pxToIn(el.x),
    y: pxToIn(el.y),
    w: pxToIn(el.w),
    h: pxToIn(el.h),
  };
  if (fillColor && el.shape !== "line" && el.shape !== "arrow") {
    options.fill = { color: fillColor };
  }
  if (strokeColor || el.strokeWidth) {
    const line: Record<string, unknown> = {};
    if (strokeColor) line.color = strokeColor;
    if (el.strokeWidth) line.width = el.strokeWidth;
    if (el.shape === "arrow") line.endArrowType = "triangle";
    options.line = line;
  } else if (el.shape === "arrow") {
    options.line = { color: "000000", width: 2, endArrowType: "triangle" };
  }
  if (shapeName === "roundRect" && el.radius) {
    const minSide = Math.min(el.w, el.h);
    const normalized = Math.max(0, Math.min(0.5, el.radius / minSide));
    options.rectRadius = normalized;
  }
  if (el.rotation) options.rotate = el.rotation;

  // Shapes with inline text: inject the same run-based content we produce for
  // text elements so pptxgenjs renders the text inside the shape frame.
  const textBlock = el.text;
  const hasText =
    !!textBlock &&
    el.shape !== "line" &&
    el.shape !== "arrow" &&
    !!textBlock.contentJson;
  if (hasText && textBlock) {
    const runs = proseMirrorToPptxRuns(textBlock.contentJson, {
      ...textBlock,
      color: resolveColor(textBlock.color, theme),
      fontFamily: resolveFontFamily(textBlock.fontFamily, theme),
    });
    options.text = runs;
    options.align = textBlock.align ?? "center";
    options.valign = "middle";
    options.fontSize = textBlock.fontSize ?? 16;
    options.color =
      stripHash(resolveColor(textBlock.color, theme)) ??
      stripHash(theme.colors.body);
    const fontFace = resolveFontFamily(textBlock.fontFamily, theme);
    if (fontFace) {
      options.fontFace = fontFace.split(",")[0].trim().replace(/['"]/g, "");
    }
    if (textBlock.lineHeight) options.lineSpacingMultiple = textBlock.lineHeight;
    options.margin = 4;
  }

  slide.addShape(shapeName, options);
}

async function renderImageElement(
  slide: PptxSlide,
  el: ImageElement,
): Promise<void> {
  const options: Record<string, unknown> = {
    x: pxToIn(el.x),
    y: pxToIn(el.y),
    w: pxToIn(el.w),
    h: pxToIn(el.h),
  };
  if (el.rotation) options.rotate = el.rotation;

  let src = el.src;
  // pptxgenjs reads images via XHR. blob: URLs, object URLs and cross-origin
  // http(s) sources all fail that path, so normalize anything that isn't
  // already a data: URL by fetching it into a data URL first.
  if (!src.startsWith("data:")) {
    try {
      src = await urlToDataUrl(src);
    } catch (err) {
      console.error("PPTX export: could not load image", el.src, err);
      return;
    }
  }
  options.data = src;

  // Crop: stored as normalized fractions (0..1) of the source image. pptxgenjs
  // `sizing: { type: 'crop', w, h, x, y }` expects the visible crop size in
  // inches (matching the element's w/h) plus top/left crop offsets in inches
  // on the *unscaled* source. We approximate by scaling the element box up to
  // the implied full-source size, so the crop math is consistent.
  if (el.crop) {
    const { x, y, w, h } = el.crop;
    if (w > 0 && h > 0 && (x !== 0 || y !== 0 || w !== 1 || h !== 1)) {
      const sourceWIn = pxToIn(el.w) / w;
      const sourceHIn = pxToIn(el.h) / h;
      options.sizing = {
        type: "crop",
        w: pxToIn(el.w),
        h: pxToIn(el.h),
        x: x * sourceWIn,
        y: y * sourceHIn,
      };
    }
  }
  slide.addImage(options);
}

function renderTableElementWrap(slide: PptxSlide, el: TableElement): void {
  renderTableElement(slide, el);
}

async function renderElement(
  slide: PptxSlide,
  el: SlideElement,
  theme: Theme,
): Promise<void> {
  if (el.type === "text") return renderTextElement(slide, el, theme);
  if (el.type === "shape") return renderShapeElement(slide, el, theme);
  if (el.type === "image") return renderImageElement(slide, el);
  if (el.type === "table") return renderTableElementWrap(slide, el);
  if (el.type === "chart") return renderChartElement(slide, el);
}

const PPTXGENJS_SCRIPT_SRC = "/vendor/pptxgen.bundle.js";

/**
 * Load pptxgenjs via a browser `<script>` tag. We dodge the webpack bundler
 * because pptxgenjs's ES entry imports `node:fs` unconditionally; Next.js's
 * server compile can't resolve that scheme. The pre-built browser UMD bundle
 * ships with the package and we serve it from `public/vendor/`.
 */
function loadPptxGenJS(): Promise<new () => PptxDoc> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("pptxgenjs is client-only"));
  }
  const w = window as unknown as {
    PptxGenJS?: new () => PptxDoc;
    __pptxGenJSLoading?: Promise<new () => PptxDoc>;
  };
  if (w.PptxGenJS) return Promise.resolve(w.PptxGenJS);
  if (w.__pptxGenJSLoading) return w.__pptxGenJSLoading;
  w.__pptxGenJSLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PPTXGENJS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (w.PptxGenJS) resolve(w.PptxGenJS);
      else reject(new Error("pptxgenjs loaded but global not found"));
    };
    script.onerror = () =>
      reject(new Error(`Failed to load ${PPTXGENJS_SCRIPT_SRC}`));
    document.head.appendChild(script);
  });
  return w.__pptxGenJSLoading;
}

/**
 * Build a PowerPoint file from a deck and trigger a browser download.
 */
export async function exportDeckAsPptx(deck: Deck, theme: Theme): Promise<void> {
  const PptxGenJS = await loadPptxGenJS();
  const pres = new PptxGenJS();

  const widthIn = pxToIn(deck.meta.pageWidth);
  const heightIn = pxToIn(deck.meta.pageHeight);
  pres.defineLayout({ name: "DECK", width: widthIn, height: heightIn });
  pres.layout = "DECK";

  const master = deck.meta.master;
  const exportDate = master?.showDate
    ? (() => {
        try {
          return new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          return new Date().toDateString();
        }
      })()
    : "";

  for (let slideIdx = 0; slideIdx < deck.slides.length; slideIdx++) {
    const slideData = deck.slides[slideIdx];
    const slide = pres.addSlide();
    slide.background = resolveBackgroundForPptx(slideData, theme);

    const sorted = [...slideData.elements].sort((a, b) => a.z - b.z);
    for (const el of sorted) {
      try {
        await renderElement(slide, el, theme);
      } catch (err) {
        // Keep the export going even if a single element fails.
        console.error("PPTX export: failed to render element", el.id, err);
      }
    }

    const footerColor = stripHash(theme.colors.muted) ?? "888888";
    const footerH = 0.28;
    const footerY = heightIn - footerH;
    const sideW = widthIn * 0.22;

    if (master?.footer) {
      slide.addText(master.footer, {
        x: sideW,
        y: footerY,
        w: widthIn - sideW * 2,
        h: footerH,
        align: "center",
        valign: "middle",
        fontSize: 9,
        color: footerColor,
        isTextBox: true,
        margin: 0,
      });
    }
    if (master?.showDate && exportDate) {
      slide.addText(exportDate, {
        x: 0.1,
        y: footerY,
        w: sideW,
        h: footerH,
        align: "left",
        valign: "middle",
        fontSize: 9,
        color: footerColor,
        isTextBox: true,
        margin: 0,
      });
    }
    if (master?.showSlideNumber) {
      slide.addText(String(slideIdx + 1), {
        x: widthIn - sideW - 0.1,
        y: footerY,
        w: sideW,
        h: footerH,
        align: "right",
        valign: "middle",
        fontSize: 9,
        color: footerColor,
        isTextBox: true,
        margin: 0,
      });
    }
  }

  const fileName = `${deck.meta.title?.trim() || "Untitled"}.pptx`;
  await pres.writeFile({ fileName });
}
