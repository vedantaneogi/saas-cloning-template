"use client";

import { useCallback } from "react";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { ImageElement } from "../model/types";
import { fileToDataUrl } from "../utils/fileToDataUrl";

type InsertPoint = { x: number; y: number } | null;

/**
 * Inserts an image element from a File/Blob. The file is read as a base64
 * data URL so the image survives page reloads (blob URLs do not — they're
 * tied to the current JS context). The image is loaded to read its natural
 * dimensions, then scaled to fit within 70% of the page (or centered at `at`
 * if provided — used by drop/paste to place near the cursor).
 */
export function useInsertImage() {
  const { deck } = useEditorState();
  const slide = useActiveSlide();
  const { addElement } = useEditorActions();

  return useCallback(
    async (file: File | Blob, at: InsertPoint = null) => {
      if (!slide) return;
      if (!file.type.startsWith("image/")) return;
      let dataUrl: string;
      try {
        dataUrl = await fileToDataUrl(file);
      } catch (err) {
        console.error("Failed to read inserted image", err);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const { pageWidth, pageHeight } = deck.meta;
        const maxW = pageWidth * 0.7;
        const maxH = pageHeight * 0.7;
        const ratio = Math.min(
          maxW / img.naturalWidth,
          maxH / img.naturalHeight,
          1,
        );
        const w = Math.max(40, Math.round(img.naturalWidth * ratio));
        const h = Math.max(40, Math.round(img.naturalHeight * ratio));
        const cx = at ? at.x : pageWidth / 2;
        const cy = at ? at.y : pageHeight / 2;
        const x = Math.max(0, Math.min(pageWidth - w, Math.round(cx - w / 2)));
        const y = Math.max(0, Math.min(pageHeight - h, Math.round(cy - h / 2)));
        const nextZ = slide.elements.length
          ? Math.max(...slide.elements.map((el) => el.z)) + 1
          : 1;
        const el: ImageElement = {
          id: `el-${crypto.randomUUID().slice(0, 8)}`,
          type: "image",
          src: dataUrl,
          x,
          y,
          w,
          h,
          z: nextZ,
        };
        addElement(slide.id, el);
      };
      img.src = dataUrl;
    },
    [addElement, deck.meta, slide],
  );
}
