import type { SlideElement } from "../model/types";

/**
 * Module-level clipboard shared between keyboard shortcuts and the menu bar.
 * Not system-clipboard integrated — elements are cloned in memory.
 */
let buffer: SlideElement[] = [];

export const editorClipboard = {
  set(elements: SlideElement[]): void {
    buffer = elements.map((el) => JSON.parse(JSON.stringify(el)) as SlideElement);
  },
  get(): SlideElement[] {
    return buffer.map((el) => JSON.parse(JSON.stringify(el)) as SlideElement);
  },
  size(): number {
    return buffer.length;
  },
  clear(): void {
    buffer = [];
  },
};
