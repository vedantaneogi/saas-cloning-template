"use client";

/**
 * Static, read-only thumbnail renderer used by the landing page.
 *
 * Unlike {@link SlideRenderer}, this has no dependency on DocProvider / Yjs —
 * it walks the persisted `text.contentJson` (ProseMirror JSON) for text and
 * renders shapes/images directly from the Slide JSON. That makes it safe to
 * mount outside the editor tree, one-per-card on the dashboard.
 */

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { computeArrow } from "../shapes/arrow-geometry";
import {
  getTheme,
  resolveBackground,
  resolveColor,
  resolveFontFamily,
  type Theme,
} from "../themes";
import type {
  ChartElement,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  TextElement,
} from "../model/types";
import styles from "../editor.module.css";
import { ChartElementView } from "./ChartElementView";

type PMNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: PMNode[];
};

function renderMarkedText(node: PMNode, key: number): ReactNode {
  let element: ReactNode = node.text ?? "";
  const marks = node.marks ?? [];
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "textStyle": {
        const attrs = mark.attrs ?? {};
        const style: React.CSSProperties = {};
        if (typeof attrs.color === "string") style.color = attrs.color;
        if (typeof attrs.fontFamily === "string")
          style.fontFamily = attrs.fontFamily;
        if (typeof attrs.fontSize === "string" || typeof attrs.fontSize === "number")
          style.fontSize = attrs.fontSize as string | number;
        element = <span style={style}>{element}</span>;
        break;
      }
      case "highlight": {
        const color = (mark.attrs?.color as string | undefined) ?? "#fef3c7";
        element = <mark style={{ background: color }}>{element}</mark>;
        break;
      }
      case "link":
        element = <span>{element}</span>;
        break;
    }
  }
  return <Fragment key={key}>{element}</Fragment>;
}

function renderPMNode(node: PMNode, key: number): ReactNode {
  if (node.type === "text") return renderMarkedText(node, key);
  const children = (node.content ?? []).map((c, i) => renderPMNode(c, i));
  const style: React.CSSProperties = {};
  const align = node.attrs?.textAlign;
  if (typeof align === "string") style.textAlign = align as React.CSSProperties["textAlign"];

  switch (node.type) {
    case "doc":
      return <Fragment key={key}>{children}</Fragment>;
    case "paragraph":
      return <p key={key} style={style}>{children}</p>;
    case "heading": {
      const rawLevel = node.attrs?.level;
      const level = typeof rawLevel === "number" ? rawLevel : Number(rawLevel) || 1;
      const clamped = Math.min(Math.max(level, 1), 6);
      const Tag = `h${clamped}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Tag key={key} style={style}>{children}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

function isPMNode(json: unknown): json is PMNode {
  return (
    !!json &&
    typeof json === "object" &&
    typeof (json as PMNode).type === "string"
  );
}

function isPMEmpty(json: PMNode): boolean {
  if (!json.content || json.content.length === 0) return true;
  for (const block of json.content) {
    if (block.type === "text" && (block.text ?? "").length > 0) return false;
    if (block.content && block.content.length > 0) {
      if (!isPMEmpty(block)) return false;
    }
  }
  return true;
}

function StaticTextElement({
  element,
  theme,
}: {
  element: TextElement;
  theme: Theme;
}) {
  const { text } = element;
  const align = text.align ?? "left";
  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    textAlign: align,
    fontSize: text.fontSize,
    color: resolveColor(text.color, theme, theme.colors.body),
    fontFamily: resolveFontFamily(text.fontFamily, theme),
    lineHeight: text.lineHeight,
    display: "flex",
    alignItems: "center",
    justifyContent:
      align === "center"
        ? "center"
        : align === "right"
          ? "flex-end"
          : "flex-start",
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    userSelect: "none",
    pointerEvents: "none",
    overflow: "hidden",
  };

  const contentJson = isPMNode(text.contentJson) ? text.contentJson : null;
  const empty = !contentJson || isPMEmpty(contentJson);

  return (
    <div className={styles.textElement} style={style}>
      <div className={styles.tiptapWrap}>
        <div className={styles.tiptapContent}>
          {empty ? (
            <span style={{ color: "currentColor", opacity: 0.55 }}>
              {text.placeholder ?? ""}
            </span>
          ) : (
            renderPMNode(contentJson, 0)
          )}
        </div>
      </div>
    </div>
  );
}

function StaticShape({ element, theme }: { element: ShapeElement; theme: Theme }) {
  const {
    shape,
    fill: rawFill = "transparent",
    stroke: rawStroke = shape === "line" || shape === "arrow" ? "theme.body" : "transparent",
    strokeWidth = shape === "line" || shape === "arrow" ? 2 : 0,
    radius = 0,
  } = element;
  const fill = rawFill === "transparent" ? "transparent" : resolveColor(rawFill, theme) ?? "transparent";
  const stroke = rawStroke === "transparent" ? "transparent" : resolveColor(rawStroke, theme) ?? "transparent";
  const common: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    pointerEvents: "none",
  };
  if (shape === "rect") {
    return (
      <div
        style={{
          ...common,
          background: fill,
          border:
            strokeWidth && stroke !== "transparent"
              ? `${strokeWidth}px solid ${stroke}`
              : undefined,
          borderRadius: radius,
        }}
      />
    );
  }
  if (shape === "ellipse") {
    return (
      <div
        style={{
          ...common,
          background: fill,
          border:
            strokeWidth && stroke !== "transparent"
              ? `${strokeWidth}px solid ${stroke}`
              : undefined,
          borderRadius: "50%",
        }}
      />
    );
  }
  if (shape === "arrow") {
    const arrow = computeArrow(element.w, Math.max(element.h, 2), strokeWidth || 2);
    const color = stroke === "transparent" ? theme.colors.body : stroke;
    return (
      <svg
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

function StaticImage({ element }: { element: ImageElement }) {
  const crop = element.crop;
  const hasCrop =
    !!crop && (crop.x !== 0 || crop.y !== 0 || crop.w !== 1 || crop.h !== 1);
  const base: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    pointerEvents: "none",
    userSelect: "none",
  };
  if (!hasCrop) {
    return (
      <img
        src={element.src}
        alt={element.alt ?? ""}
        draggable={false}
        style={{ ...base, objectFit: "fill" }}
      />
    );
  }
  const fullW = element.w / crop.w;
  const fullH = element.h / crop.h;
  return (
    <div style={{ ...base, overflow: "hidden" }}>
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
        }}
      />
    </div>
  );
}

function StaticChart({ element }: { element: ChartElement }) {
  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
      }}
    >
      <ChartElementView element={element} interactive={false} />
    </div>
  );
}

function renderElement(element: SlideElement, theme: Theme): ReactNode {
  switch (element.type) {
    case "text":
      return <StaticTextElement key={element.id} element={element} theme={theme} />;
    case "shape":
      return <StaticShape key={element.id} element={element} theme={theme} />;
    case "image":
      return <StaticImage key={element.id} element={element} />;
    case "chart":
      return <StaticChart key={element.id} element={element} />;
  }
}

type Props = {
  slide: Slide | null | undefined;
  pageWidth: number;
  pageHeight: number;
  themeId?: string;
};

export function SlideThumbnail({ slide, pageWidth, pageHeight, themeId }: Props) {
  const theme = getTheme(themeId);
  const { css: bg } = slide
    ? resolveBackground(slide.background, theme)
    : { css: theme.colors.background };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0 && pageWidth > 0) setScale(w / pageWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        aspectRatio: `${pageWidth} / ${pageHeight}`,
        overflow: "hidden",
        background: bg,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: pageWidth,
          height: pageHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: bg,
        }}
      >
        {slide?.elements
          ?.slice()
          .sort((a, b) => a.z - b.z)
          .map((el) => renderElement(el, theme))}
      </div>
    </div>
  );
}
