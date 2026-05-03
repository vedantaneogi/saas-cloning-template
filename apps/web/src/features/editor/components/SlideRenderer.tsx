"use client";

/**
 * Single-source-of-truth slide renderer. Used by:
 *   - SlideCanvas (interactive mode, with selection + Moveable)
 *   - SlideSidebar (interactive=false, scaled via CSS transform)
 *   - Future: /present + /v/{token} viewer (interactive=false)
 *
 * Selection + drag/resize is handled externally. This component only assigns
 * `data-element-id` attributes and invokes `onElementMouseDown` — SlideCanvas
 * hydrates those into selection state and a Moveable target.
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import type {
  ChartElement,
  DeckMaster,
  ElementId,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  SlideId,
} from "../model/types";
import { TextElementEditor } from "./TextElementEditor";
import { TextElementPreview } from "./TextElementPreview";
import { ShapeTextLayer, ShapeTextPreview } from "./ShapeTextLayer";
import { TableElementEditor, TableElementPreview } from "./TableElementView";
import { ChartElementView } from "./ChartElementView";
import { computeArrow } from "../shapes/arrow-geometry";
import {
  getTheme,
  resolveBackground,
  resolveColor,
  type Theme,
} from "../themes";
import styles from "../editor.module.css";

type RendererProps = {
  slide: Slide;
  pageWidth: number;
  pageHeight: number;
  themeId?: string;
  master?: DeckMaster;
  slideNumber?: number;
  interactive?: boolean;
  selectedIds?: ElementId[];
  editingElementId?: ElementId | null;
  hiddenElementIds?: ElementId[];
  onElementMouseDown?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onBackgroundMouseDown?: (e: ReactMouseEvent) => void;
  onStartEditing?: (elementId: ElementId) => void;
  onImageDoubleClick?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onElementContextMenu?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onBackgroundContextMenu?: (e: ReactMouseEvent) => void;
};

export function SlideRenderer({
  slide,
  pageWidth,
  pageHeight,
  themeId,
  master,
  slideNumber,
  interactive = true,
  selectedIds,
  editingElementId,
  hiddenElementIds,
  onElementMouseDown,
  onBackgroundMouseDown,
  onStartEditing,
  onImageDoubleClick,
  onElementContextMenu,
  onBackgroundContextMenu,
}: RendererProps) {
  const theme = getTheme(themeId);
  const { css: bg } = resolveBackground(slide.background, theme);
  const selectedSet = new Set(selectedIds ?? []);
  const hiddenSet = new Set(hiddenElementIds ?? []);

  return (
    <div
      style={{
        position: "relative",
        width: pageWidth,
        height: pageHeight,
        background: bg,
        overflow: "hidden",
      }}
      onMouseDown={onBackgroundMouseDown}
      onContextMenu={onBackgroundContextMenu}
    >
      {master?.titleText && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: Math.max(10, pageWidth * 0.013),
            color: "rgba(0,0,0,0.22)",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
            fontFamily: theme.fonts.body,
            letterSpacing: "0.02em",
          }}
        >
          {master.titleText}
        </div>
      )}
      {slide.elements
        .slice()
        .sort((a, b) => a.z - b.z)
        .filter((el) => !hiddenSet.has(el.id))
        .map((el) => (
          <ElementView
            key={el.id}
            slideId={slide.id}
            element={el}
            theme={theme}
            interactive={interactive}
            selected={selectedSet.has(el.id)}
            editing={editingElementId === el.id}
            onMouseDown={onElementMouseDown}
            onStartEditing={onStartEditing}
            onImageDoubleClick={onImageDoubleClick}
            onContextMenu={onElementContextMenu}
          />
        ))}
      {(master?.footer || master?.showSlideNumber || master?.showDate) && (
        <MasterFooterBar
          master={master}
          theme={theme}
          pageWidth={pageWidth}
          slideNumber={slideNumber}
        />
      )}
    </div>
  );
}

function formatMasterDate(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return new Date().toDateString();
  }
}

function MasterFooterBar({
  master,
  theme,
  pageWidth,
  slideNumber,
}: {
  master: DeckMaster;
  theme: Theme;
  pageWidth: number;
  slideNumber?: number;
}) {
  const color = resolveColor("theme.muted", theme) ?? "#888";
  const fontSize = Math.max(9, pageWidth * 0.011);
  const height = Math.max(20, pageWidth * 0.029);
  const sideStyle = {
    minWidth: 0,
    padding: `0 ${Math.max(8, pageWidth * 0.012)}px`,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    flex: "0 0 auto" as const,
  };
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height,
        display: "flex",
        alignItems: "center",
        fontSize,
        color,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 9999,
        borderTop: "1px solid rgba(0,0,0,0.07)",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(2px)",
        fontFamily: theme.fonts.body,
      }}
    >
      <div style={{ ...sideStyle, textAlign: "left" }}>
        {master.showDate ? formatMasterDate() : ""}
      </div>
      <div
        style={{
          flex: 1,
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          padding: "0 8px",
        }}
      >
        {master.footer ?? ""}
      </div>
      <div style={{ ...sideStyle, textAlign: "right" }}>
        {master.showSlideNumber && slideNumber ? slideNumber : ""}
      </div>
    </div>
  );
}

function ElementView({
  slideId,
  element,
  theme,
  interactive,
  selected,
  editing,
  onMouseDown,
  onStartEditing,
  onImageDoubleClick,
  onContextMenu,
}: {
  slideId: SlideId;
  element: SlideElement;
  theme: Theme;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  onMouseDown?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onStartEditing?: (elementId: ElementId) => void;
  onImageDoubleClick?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onContextMenu?: (e: ReactMouseEvent, elementId: ElementId) => void;
}) {
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!interactive) return;
    onMouseDown?.(e, element.id);
  };
  const handleContextMenu = (e: ReactMouseEvent) => {
    if (!interactive) return;
    onContextMenu?.(e, element.id);
  };
  const handleImageDoubleClick = (e: ReactMouseEvent) => {
    if (!interactive) return;
    onImageDoubleClick?.(e, element.id);
  };
  const commonDataProps: DataProps = {
    "data-element-id": element.id,
    "data-selected": selected ? "true" : undefined,
    onMouseDown: handleMouseDown,
    onContextMenu: handleContextMenu,
  };

  switch (element.type) {
    case "text":
      // Non-interactive surfaces (thumbnails, presenter view, viewer) must
      // NOT mount a second Tiptap + Collaboration binding on the same
      // Y.XmlFragment as the canvas editor -- dual bindings cause the canvas
      // to render blank when the user returns to a slide after editing.
      if (!interactive) {
        return (
          <TextElementPreview element={element} slideId={slideId} theme={theme} />
        );
      }
      return (
        <TextElementEditor
          element={element}
          slideId={slideId}
          theme={theme}
          interactive={interactive}
          selected={selected}
          editing={editing}
          onStartEditing={onStartEditing}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
          dataProps={{
            "data-element-id": element.id,
            "data-selected": selected ? "true" : undefined,
          }}
        />
      );
    case "shape":
      return (
        <ShapeElementView
          element={element}
          slideId={slideId}
          theme={theme}
          interactive={interactive}
          selected={selected}
          editing={editing}
          onStartEditing={onStartEditing}
          dataProps={commonDataProps}
        />
      );
    case "image":
      return (
        <ImageElementView
          element={element}
          dataProps={commonDataProps}
          onDoubleClick={handleImageDoubleClick}
        />
      );
    case "table":
      if (!interactive) {
        return (
          <TableElementPreview
            element={element}
            dataProps={{
              "data-element-id": element.id,
              "data-selected": selected ? "true" : undefined,
            }}
          />
        );
      }
      return (
        <TableElementEditor
          element={element}
          slideId={slideId}
          interactive={interactive}
          selected={selected}
          editing={editing}
          onStartEditing={onStartEditing}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
          dataProps={{
            "data-element-id": element.id,
            "data-selected": selected ? "true" : undefined,
          }}
        />
      );
    case "chart":
      return (
        <ChartElementWrap
          element={element}
          interactive={interactive}
          dataProps={commonDataProps}
        />
      );
  }
}

function ChartElementWrap({
  element,
  interactive,
  dataProps,
}: {
  element: ChartElement;
  interactive: boolean;
  dataProps: DataProps;
}) {
  return (
    <div
      {...dataProps}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        cursor: "move",
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        background: "transparent",
      }}
    >
      <ChartElementView element={element} interactive={interactive} />
    </div>
  );
}

type DataProps = {
  "data-element-id": string;
  "data-selected"?: "true";
  onMouseDown: (e: ReactMouseEvent) => void;
  onContextMenu?: (e: ReactMouseEvent) => void;
};

function ShapeElementView({
  element,
  slideId,
  theme,
  interactive,
  selected,
  editing,
  onStartEditing,
  dataProps,
}: {
  element: ShapeElement;
  slideId: SlideId;
  theme: Theme;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  onStartEditing?: (elementId: ElementId) => void;
  dataProps: DataProps;
}) {
  const {
    shape,
    fill: rawFill = "transparent",
    stroke: rawStroke = shape === "line" || shape === "arrow" ? "theme.body" : "transparent",
    strokeWidth = shape === "line" || shape === "arrow" ? 2 : 0,
    radius = 0,
  } = element;
  const fill = rawFill === "transparent" ? "transparent" : resolveColor(rawFill, theme) ?? "transparent";
  const stroke = rawStroke === "transparent" ? "transparent" : resolveColor(rawStroke, theme) ?? "transparent";
  const common = {
    position: "absolute" as const,
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    cursor: "move",
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  };
  const hasText = element.text !== undefined;
  const textLayer = hasText ? (
    interactive ? (
      <ShapeTextLayer
        element={element}
        slideId={slideId}
        theme={theme}
        selected={selected}
        editing={editing}
        onStartEditing={onStartEditing}
      />
    ) : (
      <ShapeTextPreview element={element} slideId={slideId} theme={theme} />
    )
  ) : null;
  if (shape === "rect") {
    return (
      <div
        {...dataProps}
        style={{
          ...common,
          background: fill,
          border:
            strokeWidth && stroke !== "transparent"
              ? `${strokeWidth}px solid ${stroke}`
              : undefined,
          borderRadius: radius,
        }}
      >
        {textLayer}
      </div>
    );
  }
  if (shape === "ellipse") {
    return (
      <div
        {...dataProps}
        style={{
          ...common,
          background: fill,
          border:
            strokeWidth && stroke !== "transparent"
              ? `${strokeWidth}px solid ${stroke}`
              : undefined,
          borderRadius: "50%",
        }}
      >
        {textLayer}
      </div>
    );
  }
  if (shape === "arrow") {
    const arrow = computeArrow(element.w, Math.max(element.h, 2), strokeWidth || 2);
    const color = stroke === "transparent" ? theme.colors.body : stroke;
    return (
      <svg
        {...dataProps}
        style={{ ...common, overflow: "visible" }}
        width={element.w}
        height={Math.max(element.h, 2)}
        viewBox={`0 0 ${element.w} ${Math.max(element.h, 2)}`}
        preserveAspectRatio="none"
      >
        <line
          x1={arrow.shaftX1}
          y1={arrow.shaftY1}
          x2={arrow.shaftX2}
          y2={arrow.shaftY2}
          stroke={color}
          strokeWidth={strokeWidth || 2}
          strokeLinecap="round"
        />
        <path d={arrow.head} fill={color} stroke={color} strokeWidth={0} />
      </svg>
    );
  }
  return (
    <svg
      {...dataProps}
      style={{ ...common, overflow: "visible" }}
      width={element.w}
      height={Math.max(element.h, 2)}
      viewBox={`0 0 ${element.w} ${Math.max(element.h, 2)}`}
      preserveAspectRatio="none"
    >
      <line
        x1={0}
        y1={Math.max(element.h, 2) / 2}
        x2={element.w}
        y2={Math.max(element.h, 2) / 2}
        stroke={stroke === "transparent" ? theme.colors.body : stroke}
        strokeWidth={strokeWidth || 2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageElementView({
  element,
  dataProps,
  onDoubleClick,
}: {
  element: ImageElement;
  dataProps: DataProps;
  onDoubleClick?: (e: ReactMouseEvent) => void;
}) {
  const crop = element.crop;
  const hasCrop =
    !!crop &&
    (crop.x !== 0 || crop.y !== 0 || crop.w !== 1 || crop.h !== 1);

  if (!hasCrop) {
    return (
      <img
        {...dataProps}
        onDoubleClick={onDoubleClick}
        src={element.src}
        alt={element.alt ?? ""}
        draggable={false}
        style={{
          position: "absolute",
          left: element.x,
          top: element.y,
          width: element.w,
          height: element.h,
          objectFit: "fill",
          cursor: "move",
          transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        }}
      />
    );
  }

  const fullW = element.w / crop.w;
  const fullH = element.h / crop.h;
  return (
    <div
      {...dataProps}
      onDoubleClick={onDoubleClick}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        overflow: "hidden",
        cursor: "move",
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      }}
    >
      <img
        src={element.src}
        alt={element.alt ?? ""}
        draggable={false}
        style={{
          position: "absolute",
          left: -crop.x * fullW,
          top: -crop.y * fullH,
          width: fullW,
          height: fullH,
          maxWidth: "none",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
