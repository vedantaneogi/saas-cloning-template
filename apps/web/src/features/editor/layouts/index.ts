/**
 * Slide layout presets.
 *
 * A layout is a pure template: `build(pageWidth, pageHeight)` produces a
 * fresh array of `SlideElement`s that seed a new slide (or replace an
 * existing slide's elements when the user picks a layout).
 *
 * Element IDs are freshly minted per call so the same preset can safely
 * seed many slides. Colors/fonts use theme tokens ("theme.title", etc.)
 * so the layout follows the deck theme automatically.
 */

import type { SlideElement, TextElement } from "../model/types";

export type LayoutId =
  | "blank"
  | "title"
  | "titleContent"
  | "twoColumn"
  | "imageCaption";

export type LayoutPreset = {
  id: LayoutId;
  name: string;
  build: (pageWidth: number, pageHeight: number) => SlideElement[];
};

function newElId(prefix: string): string {
  return `el-${prefix}-${crypto.randomUUID().slice(0, 6)}`;
}

function titleText(
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  opts: Partial<TextElement["text"]> = {},
): TextElement {
  return {
    id: newElId("title"),
    type: "text",
    x,
    y,
    w,
    h,
    z,
    text: {
      align: "center",
      fontSize: 48,
      color: "theme.title",
      fontFamily: "theme.heading",
      placeholder: "Click to add title",
      ...opts,
    },
  };
}

function bodyText(
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  opts: Partial<TextElement["text"]> = {},
): TextElement {
  return {
    id: newElId("body"),
    type: "text",
    x,
    y,
    w,
    h,
    z,
    text: {
      align: "left",
      fontSize: 20,
      color: "theme.body",
      fontFamily: "theme.body",
      placeholder: "Click to add text",
      ...opts,
    },
  };
}

export const LAYOUTS: LayoutPreset[] = [
  {
    id: "blank",
    name: "Blank",
    build: () => [],
  },
  {
    id: "title",
    name: "Title",
    build: (pw, ph) => [
      titleText(
        Math.round(pw * 0.08),
        Math.round(ph * 0.32),
        Math.round(pw * 0.84),
        Math.round(ph * 0.2),
        1,
        { fontSize: 56, placeholder: "Presentation title" },
      ),
      bodyText(
        Math.round(pw * 0.08),
        Math.round(ph * 0.58),
        Math.round(pw * 0.84),
        Math.round(ph * 0.12),
        2,
        {
          align: "center",
          fontSize: 22,
          color: "theme.muted",
          placeholder: "Subtitle",
        },
      ),
    ],
  },
  {
    id: "titleContent",
    name: "Title + Content",
    build: (pw, ph) => [
      titleText(
        Math.round(pw * 0.06),
        Math.round(ph * 0.08),
        Math.round(pw * 0.88),
        Math.round(ph * 0.16),
        1,
        { align: "left", fontSize: 40 },
      ),
      bodyText(
        Math.round(pw * 0.06),
        Math.round(ph * 0.3),
        Math.round(pw * 0.88),
        Math.round(ph * 0.58),
        2,
      ),
    ],
  },
  {
    id: "twoColumn",
    name: "Two columns",
    build: (pw, ph) => {
      const gutter = Math.round(pw * 0.04);
      const colW = Math.round((pw * 0.88 - gutter) / 2);
      const startX = Math.round(pw * 0.06);
      return [
        titleText(
          startX,
          Math.round(ph * 0.08),
          Math.round(pw * 0.88),
          Math.round(ph * 0.16),
          1,
          { align: "left", fontSize: 40 },
        ),
        bodyText(
          startX,
          Math.round(ph * 0.3),
          colW,
          Math.round(ph * 0.58),
          2,
          { placeholder: "First column" },
        ),
        bodyText(
          startX + colW + gutter,
          Math.round(ph * 0.3),
          colW,
          Math.round(ph * 0.58),
          3,
          { placeholder: "Second column" },
        ),
      ];
    },
  },
  {
    id: "imageCaption",
    name: "Caption",
    build: (pw, ph) => {
      const startX = Math.round(pw * 0.06);
      return [
        titleText(
          startX,
          Math.round(ph * 0.08),
          Math.round(pw * 0.88),
          Math.round(ph * 0.14),
          1,
          { align: "left", fontSize: 36, placeholder: "Caption title" },
        ),
        bodyText(
          startX,
          Math.round(ph * 0.26),
          Math.round(pw * 0.88),
          Math.round(ph * 0.62),
          2,
          {
            align: "center",
            fontSize: 18,
            color: "theme.muted",
            placeholder: "Add an image or text to fill this area",
          },
        ),
      ];
    },
  },
];

export function getLayout(id: string | undefined | null): LayoutPreset {
  if (!id) return LAYOUTS[0];
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
