"use client";

/**
 * Crop overlay for image elements. Rendered in page coordinates inside the
 * scaled slide inner. Shows the full (uncropped) source image dimmed behind a
 * bright "crop rectangle" that the user can resize via 8 handles. On commit
 * we both update `element.crop` (normalized 0..1) and rewrite the element's
 * x/y/w/h so the slide element shrinks to the new crop — matching Google
 * Slides behavior where cropping reclaims empty space around the image.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ImageCrop, ImageElement } from "../model/types";

type HandleKey = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type HandleDef = {
  key: HandleKey;
  xFn: (l: number, w: number) => number;
  yFn: (t: number, h: number) => number;
  cursor: CSSProperties["cursor"];
};

const HANDLES: HandleDef[] = [
  { key: "nw", xFn: (l) => l, yFn: (t) => t, cursor: "nwse-resize" },
  { key: "n", xFn: (l, w) => l + w / 2, yFn: (t) => t, cursor: "ns-resize" },
  { key: "ne", xFn: (l, w) => l + w, yFn: (t) => t, cursor: "nesw-resize" },
  { key: "e", xFn: (l, w) => l + w, yFn: (t, h) => t + h / 2, cursor: "ew-resize" },
  { key: "se", xFn: (l, w) => l + w, yFn: (t, h) => t + h, cursor: "nwse-resize" },
  { key: "s", xFn: (l, w) => l + w / 2, yFn: (t, h) => t + h, cursor: "ns-resize" },
  { key: "sw", xFn: (l) => l, yFn: (t, h) => t + h, cursor: "nesw-resize" },
  { key: "w", xFn: (l) => l, yFn: (t, h) => t + h / 2, cursor: "ew-resize" },
];

const MIN_CROP = 0.05;

export type CropCommit = {
  x: number;
  y: number;
  w: number;
  h: number;
  crop: ImageCrop;
};

export function ImageCropOverlay({
  element,
  scale,
  onCommit,
  onCancel,
}: {
  element: ImageElement;
  scale: number;
  onCommit: (next: CropCommit) => void;
  onCancel: () => void;
}) {
  const initialCrop: ImageCrop = element.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const [localCrop, setLocalCrop] = useState<ImageCrop>(initialCrop);

  const fullW = element.w / initialCrop.w;
  const fullH = element.h / initialCrop.h;
  const fullLeft = element.x - initialCrop.x * fullW;
  const fullTop = element.y - initialCrop.y * fullH;

  const commit = useCallback(
    (crop: ImageCrop) => {
      onCommit({
        x: Math.round(fullLeft + crop.x * fullW),
        y: Math.round(fullTop + crop.y * fullH),
        w: Math.max(2, Math.round(crop.w * fullW)),
        h: Math.max(2, Math.round(crop.h * fullH)),
        crop,
      });
    },
    [fullLeft, fullTop, fullW, fullH, onCommit],
  );

  const latestCropRef = useRef(localCrop);
  latestCropRef.current = localCrop;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        commit(latestCropRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, onCancel]);

  const handlePointerDown = (handle: HandleKey) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startCrop = latestCropRef.current;
    const startClient = { x: e.clientX, y: e.clientY };

    const onMove = (ev: PointerEvent) => {
      const dxImg = (ev.clientX - startClient.x) / scale / fullW;
      const dyImg = (ev.clientY - startClient.y) / scale / fullH;
      const next: ImageCrop = { ...startCrop };
      if (handle.includes("w")) {
        const newX = Math.max(
          0,
          Math.min(startCrop.x + dxImg, startCrop.x + startCrop.w - MIN_CROP),
        );
        next.w = startCrop.w + (startCrop.x - newX);
        next.x = newX;
      }
      if (handle.includes("e")) {
        next.w = Math.max(
          MIN_CROP,
          Math.min(1 - startCrop.x, startCrop.w + dxImg),
        );
      }
      if (handle.includes("n")) {
        const newY = Math.max(
          0,
          Math.min(startCrop.y + dyImg, startCrop.y + startCrop.h - MIN_CROP),
        );
        next.h = startCrop.h + (startCrop.y - newY);
        next.y = newY;
      }
      if (handle.includes("s")) {
        next.h = Math.max(
          MIN_CROP,
          Math.min(1 - startCrop.y, startCrop.h + dyImg),
        );
      }
      setLocalCrop(next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const cropLeft = fullLeft + localCrop.x * fullW;
  const cropTop = fullTop + localCrop.y * fullH;
  const cropW = localCrop.w * fullW;
  const cropH = localCrop.h * fullH;

  return (
    <>
      {/* Backdrop — click outside commits the current crop */}
      <div
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) commit(latestCropRef.current);
        }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 100,
          background: "transparent",
        }}
      />
      {/* Dimmed full image */}
      <img
        src={element.src}
        alt={element.alt ?? ""}
        draggable={false}
        style={{
          position: "absolute",
          left: fullLeft,
          top: fullTop,
          width: fullW,
          height: fullH,
          opacity: 0.45,
          pointerEvents: "none",
          zIndex: 101,
          maxWidth: "none",
          userSelect: "none",
        }}
      />
      {/* Bright crop window (full-intensity image clipped to crop rect) */}
      <div
        style={{
          position: "absolute",
          left: cropLeft,
          top: cropTop,
          width: cropW,
          height: cropH,
          overflow: "hidden",
          outline: "2px solid #1a73e8",
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.8)",
          zIndex: 102,
          pointerEvents: "none",
        }}
      >
        <img
          src={element.src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: -localCrop.x * fullW,
            top: -localCrop.y * fullH,
            width: fullW,
            height: fullH,
            maxWidth: "none",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>
      {/* 8 handles */}
      {HANDLES.map(({ key, xFn, yFn, cursor }) => {
        const size = 12;
        const x = xFn(cropLeft, cropW) - size / 2;
        const y = yFn(cropTop, cropH) - size / 2;
        return (
          <div
            key={key}
            role="slider"
            aria-label={`Crop ${key}`}
            onPointerDown={handlePointerDown(key)}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              background: "#1a73e8",
              border: "2px solid #fff",
              borderRadius: 2,
              cursor,
              zIndex: 103,
              touchAction: "none",
            }}
          />
        );
      })}
    </>
  );
}
