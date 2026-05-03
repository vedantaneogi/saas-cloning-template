import type { ChartElement, ChartKind, ChartStyle } from "../model/types";
import {
  DEFAULT_CHART_PALETTE,
  newChartPointId,
} from "../model/chartDefaults";
import {
  attr,
  childrenByLocal,
  descendantsByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
  localName,
  parseXml,
} from "./pptxXml";
import { emuToPx, pptxColorToCss, pptxRotToDeg } from "./pptxUnits";
import {
  resolveRelTarget,
  type PptxZip,
  type RelsMap,
} from "./pptxZip";

type Rescale = (n: number, axis: "x" | "y") => number;

const CHART_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";

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

/**
 * Detect which chart type appears under `<c:plotArea>`. We accept plain and
 * 3-D variants of pie/bar — they round-trip to our 2-D renderer either way.
 */
function detectChartKind(
  plotArea: Element,
): { kind: ChartKind; chartEl: Element } | null {
  for (let i = 0; i < plotArea.children.length; i++) {
    const child = plotArea.children[i];
    const ln = localName(child);
    if (ln === "pieChart" || ln === "pie3DChart" || ln === "doughnutChart") {
      return { kind: "pie", chartEl: child };
    }
    if (ln === "barChart" || ln === "bar3DChart") {
      return { kind: "bar", chartEl: child };
    }
  }
  return null;
}

function readBarDir(barChart: Element): "vertical" | "horizontal" {
  const barDir = firstChildByLocal(barChart, "barDir");
  const val = barDir ? attr(barDir, "val") : null;
  // "bar" = horizontal, "col" = vertical. Default "col".
  return val === "bar" ? "horizontal" : "vertical";
}

/**
 * Read ordered list of string values from a `<c:cat>` or `<c:val>` cache.
 * PPTX stores each point as `<c:pt idx="N"><c:v>text</c:v></c:pt>` inside a
 * `<c:strCache>` / `<c:numCache>`. Indices can be sparse — we fill gaps with
 * empty strings so the array aligns with the other series axis.
 */
function readPointCache(
  container: Element | null,
  cacheLocalName: "strCache" | "numCache",
): string[] {
  if (!container) return [];
  const cache =
    firstChildByLocal(container, cacheLocalName) ??
    // Some producers (including Keynote) only emit the ref's inline strRef/numRef
    // with a nested cache — fall back to descendant lookup.
    firstDescendantByLocal(container, cacheLocalName);
  if (!cache) return [];
  const pts = childrenByLocal(cache, "pt");
  const out: string[] = [];
  for (const pt of pts) {
    const idxStr = attr(pt, "idx");
    const idx = idxStr != null ? Number(idxStr) : out.length;
    const v = firstChildByLocal(pt, "v");
    const text = v?.textContent ?? "";
    if (Number.isFinite(idx) && idx >= 0) {
      while (out.length < idx) out.push("");
      out[idx] = text;
    } else {
      out.push(text);
    }
  }
  return out;
}

function readCategories(ser: Element): string[] {
  const cat = firstChildByLocal(ser, "cat");
  if (!cat) return [];
  // Categories live in either <c:strRef> (text) or <c:numRef> (numeric).
  const strRef = firstChildByLocal(cat, "strRef");
  if (strRef) return readPointCache(strRef, "strCache");
  const numRef = firstChildByLocal(cat, "numRef");
  if (numRef) return readPointCache(numRef, "numCache");
  // Inline literal form: <c:strLit> / <c:numLit> — rare but legal.
  const strLit = firstChildByLocal(cat, "strLit");
  if (strLit) return readPointCache(strLit, "strCache");
  const numLit = firstChildByLocal(cat, "numLit");
  if (numLit) return readPointCache(numLit, "numCache");
  return [];
}

function readValues(ser: Element): number[] {
  const val = firstChildByLocal(ser, "val");
  if (!val) return [];
  const numRef = firstChildByLocal(val, "numRef");
  if (numRef) return readPointCache(numRef, "numCache").map(toNum);
  const numLit = firstChildByLocal(val, "numLit");
  if (numLit) return readPointCache(numLit, "numCache").map(toNum);
  return [];
}

function toNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Per-slice / per-bar color overrides. Slice colors are encoded as
 * `<c:dPt><c:idx val="N"/><c:spPr><a:solidFill><a:srgbClr val="RRGGBB"/>…`.
 * We produce a colors[] array aligned with the data array; when a slice has
 * no override we fall back to `DEFAULT_CHART_PALETTE` at that index.
 */
function readSliceColors(ser: Element, pointCount: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < pointCount; i++) {
    colors.push(DEFAULT_CHART_PALETTE[i % DEFAULT_CHART_PALETTE.length]);
  }
  const dPts = childrenByLocal(ser, "dPt");
  for (const dPt of dPts) {
    const idxEl = firstChildByLocal(dPt, "idx");
    const idx = idxEl ? Number(attr(idxEl, "val") ?? "-1") : -1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= pointCount) continue;
    const spPr = firstChildByLocal(dPt, "spPr");
    if (!spPr) continue;
    const solidFill = firstChildByLocal(spPr, "solidFill");
    if (!solidFill) continue;
    const srgb = firstChildByLocal(solidFill, "srgbClr");
    const hex = srgb ? attr(srgb, "val") : null;
    const css = pptxColorToCss(hex);
    if (css) colors[idx] = css;
  }
  return colors;
}

/**
 * Extract a plain-text chart title from `<c:title><c:tx><c:rich>…`.
 * PPTX titles are rich ProseMirror-ish; we flatten because our ChartStyle.title
 * is a single string field.
 */
function readTitle(chart: Element): string | undefined {
  const title = firstChildByLocal(chart, "title");
  if (!title) return undefined;
  const autoTitleDeleted = firstChildByLocal(chart, "autoTitleDeleted");
  if (autoTitleDeleted && attr(autoTitleDeleted, "val") === "1") {
    return undefined;
  }
  const tx = firstChildByLocal(title, "tx");
  if (!tx) return undefined;
  const rich = firstChildByLocal(tx, "rich");
  if (rich) {
    const texts = descendantsByLocal(rich, "t");
    const joined = texts.map((t) => t.textContent ?? "").join("").trim();
    return joined.length ? joined : undefined;
  }
  // Fallback: strRef → strCache
  const strRef = firstChildByLocal(tx, "strRef");
  if (strRef) {
    const cache = firstChildByLocal(strRef, "strCache");
    const pt = cache ? firstChildByLocal(cache, "pt") : null;
    const v = pt ? firstChildByLocal(pt, "v") : null;
    const t = v?.textContent?.trim();
    return t && t.length ? t : undefined;
  }
  return undefined;
}

/**
 * Parse a `<p:graphicFrame>` whose `<c:chart>` reference points to a chart XML
 * part, and return a native ChartElement. Only pie and bar charts with a
 * single series are supported; anything else returns null so the caller can
 * fall back to the existing skip-report path.
 */
export async function parseGraphicFrameChart(
  graphicFrame: Element,
  rels: RelsMap,
  zip: PptxZip,
  slidePartPath: string,
  rescale: Rescale,
  zIndex: number,
  idGen: () => string,
): Promise<ChartElement | null> {
  // 1. Find the <c:chart r:id="..."> reference.
  const chartRef = firstDescendantByLocal(graphicFrame, "chart");
  if (!chartRef) return null;
  const rid = attr(chartRef, "r:id") ?? attr(chartRef, "id");
  if (!rid) return null;
  const rel = rels.get(rid);
  if (!rel) return null;
  // Accept the standard chart relationship type. Some producers emit slightly
  // different schemas (e.g. `.../relationships/chartEx` for extended charts);
  // we only support the classic `/chart` rel here.
  if (rel.type && rel.type !== CHART_REL_TYPE && !rel.type.endsWith("/chart")) {
    return null;
  }

  // 2. Load the chart XML part.
  const chartPartPath = resolveRelTarget(slidePartPath, rel.target);
  const chartText = await zip.readText(chartPartPath);
  if (!chartText) return null;

  let chartDoc: Document;
  try {
    chartDoc = parseXml(chartText);
  } catch {
    return null;
  }

  // chartSpace > chart > plotArea
  const chartSpace = chartDoc.documentElement;
  const chart = firstChildByLocal(chartSpace, "chart");
  if (!chart) return null;
  const plotArea = firstChildByLocal(chart, "plotArea");
  if (!plotArea) return null;

  // 3. Detect kind.
  const detected = detectChartKind(plotArea);
  if (!detected) return null;
  const { kind, chartEl } = detected;

  // 4. First series only — P0 supports single-series charts, same as export.
  const firstSer = firstChildByLocal(chartEl, "ser");
  if (!firstSer) return null;

  const labels = readCategories(firstSer);
  const values = readValues(firstSer);

  const pointCount = Math.max(labels.length, values.length);
  if (pointCount === 0) return null;

  const colors = readSliceColors(firstSer, pointCount);

  // 5. Build ChartElement.data — pad the shorter axis so label/value arrays
  //    stay aligned.
  const data = Array.from({ length: pointCount }, (_, i) => ({
    id: newChartPointId(),
    label: labels[i] ?? "",
    value: toNum(values[i] != null ? String(values[i]) : "0"),
  }));

  const orientation: "vertical" | "horizontal" =
    kind === "bar" ? readBarDir(chartEl) : "vertical";

  const legendEl = firstChildByLocal(chart, "legend");
  const showLegend = legendEl != null;

  // Value labels: <c:dLbls><c:showVal val="1"/></c:dLbls> at series level.
  const dLbls = firstChildByLocal(firstSer, "dLbls");
  const showVal = dLbls ? firstChildByLocal(dLbls, "showVal") : null;
  const showPercent = dLbls ? firstChildByLocal(dLbls, "showPercent") : null;
  const showValues =
    (showVal ? attr(showVal, "val") === "1" : false) ||
    (showPercent ? attr(showPercent, "val") === "1" : false);

  const title = readTitle(chart);

  const { x, y, w, h, rotation } = readGraphicFrameGeometry(
    graphicFrame,
    rescale,
  );

  const style: ChartStyle = {
    colors,
    showLegend,
    showValues,
    orientation,
    ...(title ? { title } : {}),
  };

  const element: ChartElement = {
    id: idGen(),
    type: "chart",
    x,
    y,
    w,
    h,
    z: zIndex,
    chartKind: kind,
    data,
    style,
  };
  if (rotation !== undefined) element.rotation = rotation;
  return element;
}

