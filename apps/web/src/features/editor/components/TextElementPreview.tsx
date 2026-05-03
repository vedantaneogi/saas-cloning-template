"use client";

/**
 * Static, read-only preview of a text element for slide thumbnails.
 *
 * Unlike {@link TextElementEditor}, this does NOT mount a Tiptap editor nor
 * bind the Collaboration extension to the element's Y.XmlFragment. That is
 * important because y-prosemirror's Collaboration extension is designed for
 * a single editor instance per fragment -- mounting it twice (once on the
 * canvas and once in the sidebar thumbnail) causes the bindings to fight
 * and can leave the canvas editor blank when navigating back to a slide.
 *
 * Instead we walk the Y.XmlFragment and render a minimal HTML projection,
 * observing deep changes so the thumbnail stays in sync as the user types.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as Y from "yjs";
import { useDocProvider } from "../state/EditorContext";
import type { SlideId, TextElement } from "../model/types";
import { resolveColor, resolveFontFamily, type Theme } from "../themes";
import styles from "../editor.module.css";

type Props = {
  element: TextElement;
  slideId: SlideId;
  theme: Theme;
};

function xmlTextToString(node: Y.XmlText): string {
  const deltas = node.toDelta() as Array<{ insert?: unknown }>;
  let out = "";
  for (const d of deltas) {
    if (typeof d.insert === "string") out += d.insert;
  }
  return out;
}

function renderNode(
  node: Y.XmlFragment | Y.XmlElement | Y.XmlText,
  key: number,
): ReactNode {
  if (node instanceof Y.XmlText) {
    return <Fragment key={key}>{xmlTextToString(node)}</Fragment>;
  }

  // Y.XmlElement extends Y.XmlFragment, so check Element first.
  if (node instanceof Y.XmlElement) {
    const children: ReactNode[] = [];
    node.forEach((child, index) => {
      children.push(renderNode(child, index));
    });
    const name = node.nodeName;
    switch (name) {
      case "paragraph":
        return <p key={key}>{children}</p>;
      case "heading": {
        const raw = node.getAttribute("level");
        const level = typeof raw === "number" ? raw : Number(raw) || 1;
        const clamped = Math.min(Math.max(level, 1), 6);
        const Tag = `h${clamped}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return <Tag key={key}>{children}</Tag>;
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
        return <span key={key}>{children}</span>;
    }
  }

  if (node instanceof Y.XmlFragment) {
    const children: ReactNode[] = [];
    node.forEach((child, index) => {
      children.push(renderNode(child, index));
    });
    return <Fragment key={key}>{children}</Fragment>;
  }

  return null;
}

function isFragmentEmpty(fragment: Y.XmlFragment): boolean {
  let empty = true;
  fragment.forEach((child) => {
    if (child instanceof Y.XmlText) {
      if (xmlTextToString(child).length > 0) empty = false;
    } else if (child instanceof Y.XmlElement) {
      if (!empty) return;
      if (child.length > 0) {
        let inner = false;
        child.forEach((grand) => {
          if (grand instanceof Y.XmlText && xmlTextToString(grand).length > 0) {
            inner = true;
          } else if (grand instanceof Y.XmlElement) {
            inner = true;
          }
        });
        if (inner) empty = false;
      }
    }
  });
  return empty;
}

export function TextElementPreview({ element, slideId, theme }: Props) {
  const provider = useDocProvider();
  const fragment = useMemo(
    () => provider.getTextFragment(slideId, element.id),
    [provider, slideId, element.id],
  );

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!fragment) return;
    const listener = () => setTick((v) => v + 1);
    fragment.observeDeep(listener);
    return () => fragment.unobserveDeep(listener);
  }, [fragment]);

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
    alignItems: "flex-start",
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

  const empty = !fragment || isFragmentEmpty(fragment);

  return (
    <div
      className={styles.textElement}
      style={style}
      data-preview="true"
      data-tick={tick}
    >
      <div className={styles.tiptapWrap}>
        <div className={styles.tiptapContent}>
          {empty ? (
            <span style={{ color: "currentColor", opacity: 0.55 }}>
              {text.placeholder ?? ""}
            </span>
          ) : (
            renderNode(fragment as Y.XmlFragment, 0)
          )}
        </div>
      </div>
    </div>
  );
}
