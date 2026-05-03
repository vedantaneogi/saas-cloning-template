"use client";

import { useRef } from "react";
import CropRoundedIcon from "@mui/icons-material/CropRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { ImageCrop, ImageElement } from "../model/types";
import { fileToDataUrl } from "../utils/fileToDataUrl";
import { SizePositionPanel } from "./SizePositionPanel";
import styles from "../editor.module.css";

export function ImageFormatPanel({ element }: { element: ImageElement }) {
  const slide = useActiveSlide();
  const { selection, croppingElementId } = useEditorState();
  const { updateElement, startCropping, stopCropping } = useEditorActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slideId = selection.slideId ?? slide?.id ?? "";
  const isCropping = croppingElementId === element.id;
  const hasCrop =
    !!element.crop &&
    (element.crop.x !== 0 ||
      element.crop.y !== 0 ||
      element.crop.w !== 1 ||
      element.crop.h !== 1);

  const handleReplace = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      updateElement(slideId, element.id, {
        src: dataUrl,
        crop: { x: 0, y: 0, w: 1, h: 1 } as ImageCrop,
      });
    } catch (err) {
      console.error("Failed to read replacement image", err);
    }
  };

  const handleResetCrop = () => {
    if (!hasCrop || !element.crop) return;
    // Restoring to full image: recompute element geometry so the visible
    // rectangle expands back to the full source dimensions the user last
    // saw, then clear the crop.
    const fullW = Math.round(element.w / element.crop.w);
    const fullH = Math.round(element.h / element.crop.h);
    const fullX = Math.round(element.x - element.crop.x * fullW);
    const fullY = Math.round(element.y - element.crop.y * fullH);
    updateElement(slideId, element.id, {
      x: fullX,
      y: fullY,
      w: fullW,
      h: fullH,
      crop: { x: 0, y: 0, w: 1, h: 1 },
    });
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.toolbarButton} ${isCropping ? styles.toolbarButtonActive : ""}`}
        title={isCropping ? "Finish cropping" : "Crop image"}
        aria-label="Crop image"
        aria-pressed={isCropping}
        onClick={() => (isCropping ? stopCropping() : startCropping(element.id))}
      >
        <CropRoundedIcon fontSize="small" />
      </button>

      <button
        type="button"
        className={styles.toolbarButton}
        title="Reset crop"
        aria-label="Reset crop"
        disabled={!hasCrop}
        onClick={handleResetCrop}
      >
        <RestartAltRoundedIcon fontSize="small" />
      </button>

      <button
        type="button"
        className={styles.toolbarButton}
        title="Replace image"
        aria-label="Replace image"
        onClick={() => fileInputRef.current?.click()}
      >
        <SwapHorizRoundedIcon fontSize="small" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReplace(file);
          e.target.value = "";
        }}
      />

      <SizePositionPanel element={element} />
    </>
  );
}
