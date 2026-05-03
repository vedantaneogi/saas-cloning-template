"use client";

/**
 * Text layer that lives inside a ShapeElement. Mirrors the TextElement
 * editor/preview split so lifecycle semantics (single Tiptap binding per
 * fragment, static thumbnail renderer) match what the codebase already
 * guarantees for standalone text elements.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import * as Y from "yjs";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { buildTextExtensions } from "../tiptap/extensions";
import {
  useActiveEditorRegistry,
  useDocProvider,
} from "../state/EditorContext";
import type {
  ElementId,
  ShapeElement,
  SlideId,
  TextBlock,
} from "../model/types";
import { resolveColor, resolveFontFamily, type Theme } from "../themes";
import styles from "../editor.module.css";

function textBlockStyle(
  text: TextBlock | undefined,
  theme: Theme,
): React.CSSProperties {
  const align = text?.align ?? "center";
  return {
    position: "absolute",
    inset: 0,
    padding: "8px 12px",
    boxSizing: "border-box",
    textAlign: align,
    fontSize: text?.fontSize ?? 16,
    color: resolveColor(text?.color, theme, theme.colors.body),
    fontFamily: resolveFontFamily(text?.fontFamily, theme),
    lineHeight: text?.lineHeight,
    display: "flex",
    alignItems: "center",
    justifyContent:
      align === "center"
        ? "center"
        : align === "right"
          ? "flex-end"
          : "flex-start",
  };
}

type InteractiveProps = {
  element: ShapeElement;
  slideId: SlideId;
  theme: Theme;
  selected: boolean;
  editing: boolean;
  onStartEditing?: (elementId: ElementId) => void;
};

export function ShapeTextLayer({
  element,
  slideId,
  theme,
  selected,
  editing,
  onStartEditing,
}: InteractiveProps) {
  const provider = useDocProvider();
  const { register, unregister } = useActiveEditorRegistry();

  const fragment = useMemo(
    () => provider.getTextFragment(slideId, element.id),
    [provider, slideId, element.id],
  );

  const extensions = useMemo(() => {
    if (!fragment) return [];
    return buildTextExtensions({
      fragment,
      placeholder: element.text?.placeholder ?? "Add text",
    });
  }, [fragment, element.text?.placeholder]);

  const editor = useEditor(
    {
      extensions,
      editable: editing,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: styles.tiptapContent,
        },
      },
    },
    [fragment],
  );

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) editor.commands.focus("end");
  }, [editor, editing]);

  useEffect(() => {
    if (!editor) return;
    if (selected) {
      register(element.id, editor);
      return () => unregister(element.id);
    }
  }, [editor, selected, element.id, register, unregister]);

  const handleDoubleClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    onStartEditing?.(element.id);
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (editing) {
      e.stopPropagation();
    }
  };

  return (
    <div
      className={editing ? styles.textElementEditing : undefined}
      style={{
        ...textBlockStyle(element.text, theme),
        cursor: editing ? "text" : "inherit",
        userSelect: editing ? "text" : "none",
        pointerEvents: editing ? "auto" : undefined,
      }}
      data-editing={editing ? "true" : undefined}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      <EditorContent editor={editor} className={styles.tiptapWrap} />
    </div>
  );
}

function xmlTextToString(node: Y.XmlText): string {
  const deltas = node.toDelta() as Array<{ insert?: unknown }>;
  let out = "";
  for (const d of deltas) if (typeof d.insert === "string") out += d.insert;
  return out;
}

function renderNode(
  node: Y.XmlFragment | Y.XmlElement | Y.XmlText,
  key: number,
): ReactNode {
  if (node instanceof Y.XmlText) {
    return <Fragment key={key}>{xmlTextToString(node)}</Fragment>;
  }
  if (node instanceof Y.XmlElement) {
    const children: ReactNode[] = [];
    node.forEach((child, i) => children.push(renderNode(child, i)));
    switch (node.nodeName) {
      case "paragraph":
        return <p key={key}>{children}</p>;
      case "hardBreak":
        return <br key={key} />;
      default:
        return <span key={key}>{children}</span>;
    }
  }
  if (node instanceof Y.XmlFragment) {
    const children: ReactNode[] = [];
    node.forEach((child, i) => children.push(renderNode(child, i)));
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
      if (child.length > 0) {
        child.forEach((g) => {
          if (g instanceof Y.XmlText && xmlTextToString(g).length > 0) {
            empty = false;
          } else if (g instanceof Y.XmlElement) {
            empty = false;
          }
        });
      }
    }
  });
  return empty;
}

type PreviewProps = {
  element: ShapeElement;
  slideId: SlideId;
  theme: Theme;
};

export function ShapeTextPreview({ element, slideId, theme }: PreviewProps) {
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

  const empty = !fragment || isFragmentEmpty(fragment);

  return (
    <div
      style={{
        ...textBlockStyle(element.text, theme),
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
      }}
      data-tick={tick}
    >
      <div className={styles.tiptapWrap}>
        <div className={styles.tiptapContent}>
          {empty ? null : renderNode(fragment as Y.XmlFragment, 0)}
        </div>
      </div>
    </div>
  );
}
