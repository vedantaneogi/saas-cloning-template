import {
  attr,
  childrenByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
  localName,
  parseXml,
} from "./pptxXml";
import { pptxColorToCss } from "./pptxUnits";
import { resolveRelTarget, type PptxZip, type RelsMap } from "./pptxZip";

const THEME_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
const LAYOUT_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";
const MASTER_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster";

export type ThemeContext = {
  themeColors: Map<string, string>;
  clrMap: Record<string, string>;
  layoutPartPath: string | null;
  masterPartPath: string | null;
};

function findRelTarget(rels: RelsMap, type: string): string | null {
  for (const rel of rels.values()) {
    if (rel.type === type) return rel.target;
  }
  return null;
}

export async function parseSlideContextChain(
  zip: PptxZip,
  slidePartPath: string,
  slideRels: RelsMap,
): Promise<ThemeContext> {
  const ctx: ThemeContext = {
    themeColors: new Map(),
    clrMap: {},
    layoutPartPath: null,
    masterPartPath: null,
  };

  const layoutRel = findRelTarget(slideRels, LAYOUT_REL);
  if (!layoutRel) return ctx;
  const layoutPath = resolveRelTarget(slidePartPath, layoutRel);
  ctx.layoutPartPath = layoutPath;

  const { readRels } = await import("./pptxZip");
  const layoutRels = await readRels(zip, layoutPath);
  const masterRel = findRelTarget(layoutRels, MASTER_REL);
  if (!masterRel) return ctx;
  const masterPath = resolveRelTarget(layoutPath, masterRel);
  ctx.masterPartPath = masterPath;

  const masterRels = await readRels(zip, masterPath);
  const themeRel = findRelTarget(masterRels, THEME_REL);
  if (themeRel) {
    const themePath = resolveRelTarget(masterPath, themeRel);
    ctx.themeColors = await parseThemeColors(zip, themePath);
  }

  const masterText = await zip.readText(masterPath);
  if (masterText) {
    const masterDoc = parseXml(masterText);
    const clrMapEl = firstDescendantByLocal(masterDoc.documentElement, "clrMap");
    if (clrMapEl) {
      for (let i = 0; i < clrMapEl.attributes.length; i++) {
        const a = clrMapEl.attributes[i];
        ctx.clrMap[a.name] = a.value;
      }
    }
  }

  return ctx;
}

async function parseThemeColors(
  zip: PptxZip,
  themePath: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const text = await zip.readText(themePath);
  if (!text) return out;
  const doc = parseXml(text);
  const scheme = firstDescendantByLocal(doc.documentElement, "clrScheme");
  if (!scheme) return out;
  for (let i = 0; i < scheme.children.length; i++) {
    const slot = scheme.children[i];
    const slotName = localName(slot);
    const srgb = firstChildByLocal(slot, "srgbClr");
    const sysClr = firstChildByLocal(slot, "sysClr");
    let hex: string | undefined;
    if (srgb) hex = pptxColorToCss(attr(srgb, "val"));
    else if (sysClr) {
      hex =
        pptxColorToCss(attr(sysClr, "lastClr")) ??
        (attr(sysClr, "val") === "window" ? "#ffffff" : undefined);
    }
    if (hex) out.set(slotName, hex);
  }
  return out;
}

/** Resolve a color node (<a:srgbClr> or <a:schemeClr>) to a css hex. */
export function resolveColorNode(
  node: Element | null,
  ctx: ThemeContext | null,
): string | undefined {
  if (!node) return undefined;
  const ln = localName(node);
  if (ln === "srgbClr") {
    return applyLumMods(pptxColorToCss(attr(node, "val")), node);
  }
  if (ln === "schemeClr" && ctx) {
    const ref = attr(node, "val");
    if (!ref) return undefined;
    const mapped = ctx.clrMap[ref] ?? ref;
    const hex = ctx.themeColors.get(mapped) ?? ctx.themeColors.get(ref);
    return applyLumMods(hex, node);
  }
  if (ln === "sysClr") {
    return applyLumMods(pptxColorToCss(attr(node, "lastClr")), node);
  }
  return undefined;
}

/** Find <a:solidFill> child under parent and resolve its color. */
export function resolveSolidFillColor(
  parent: Element | null,
  ctx: ThemeContext | null,
): string | undefined {
  if (!parent) return undefined;
  const solid = firstChildByLocal(parent, "solidFill");
  if (!solid) return undefined;
  for (let i = 0; i < solid.children.length; i++) {
    const c = solid.children[i];
    const out = resolveColorNode(c, ctx);
    if (out) return out;
  }
  return undefined;
}

function applyLumMods(
  hex: string | undefined,
  colorNode: Element,
): string | undefined {
  if (!hex) return undefined;
  const lumMod = firstChildByLocal(colorNode, "lumMod");
  const lumOff = firstChildByLocal(colorNode, "lumOff");
  const shade = firstChildByLocal(colorNode, "shade");
  const tint = firstChildByLocal(colorNode, "tint");
  if (!lumMod && !lumOff && !shade && !tint) return hex;

  const { r, g, b } = hexToRgb(hex);
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  if (lumMod) {
    const v = Number(attr(lumMod, "val")) / 100000;
    if (Number.isFinite(v)) {
      rr *= v;
      gg *= v;
      bb *= v;
    }
  }
  if (lumOff) {
    const v = Number(attr(lumOff, "val")) / 100000;
    if (Number.isFinite(v)) {
      rr += v;
      gg += v;
      bb += v;
    }
  }
  if (shade) {
    const v = Number(attr(shade, "val")) / 100000;
    if (Number.isFinite(v)) {
      rr *= v;
      gg *= v;
      bb *= v;
    }
  }
  if (tint) {
    const v = Number(attr(tint, "val")) / 100000;
    if (Number.isFinite(v)) {
      rr = rr + (1 - rr) * (1 - v);
      gg = gg + (1 - gg) * (1 - v);
      bb = bb + (1 - bb) * (1 - v);
    }
  }
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x * 255)));
  return rgbToHex(clamp(rr), clamp(gg), clamp(bb));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace(/^#/, "");
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Re-export for callers that iterate children by local name.
export { childrenByLocal };
