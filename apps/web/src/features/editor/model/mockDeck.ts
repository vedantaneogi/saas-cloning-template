import type { Deck } from "./types";

export const DEFAULT_PAGE_WIDTH = 960;
export const DEFAULT_PAGE_HEIGHT = 540;

export function createMockDeck(id: string): Deck {
  return {
    id,
    meta: {
      title: "Untitled presentation",
      themeId: "default",
      pageWidth: DEFAULT_PAGE_WIDTH,
      pageHeight: DEFAULT_PAGE_HEIGHT,
      schemaVersion: 1,
    },
    slides: [
      {
        id: "slide-1",
        layoutId: "title",
        background: { kind: "theme" },
        elements: [
          {
            id: "el-title",
            type: "text",
            x: 80,
            y: 170,
            w: 800,
            h: 130,
            z: 1,
            text: {
              align: "center",
              fontSize: 48,
              color: "theme.title",
              fontFamily: "theme.heading",
              placeholder: "Click to add title",
            },
          },
          {
            id: "el-subtitle",
            type: "text",
            x: 80,
            y: 330,
            w: 800,
            h: 60,
            z: 2,
            text: {
              align: "center",
              fontSize: 22,
              color: "theme.muted",
              fontFamily: "theme.body",
              placeholder: "Click to add subtitle",
            },
          },
        ],
      },
    ],
  };
}
