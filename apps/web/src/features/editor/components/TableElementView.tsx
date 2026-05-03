"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import * as Y from "yjs";
import { buildTableCellExtensions } from "../tiptap/extensions";
import {
  useDocProvider,
  useActiveEditorRegistry,
  useEditorActions,
} from "../state/EditorContext";
import { DEFAULT_TABLE_STYLE } from "../model/tableDefaults";
import type { ElementId, SlideId, TableCell, TableElement } from "../model/types";
import styles from "./tableElement.module.css";

type DataProps = {
  "data-element-id": string;
  "data-selected"?: "true";
};

type TableElementEditorProps = {
  element: TableElement;
  slideId: SlideId;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  onStartEditing?: (elementId: ElementId) => void;
  onMouseDown?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onContextMenu?: (e: ReactMouseEvent, elementId: ElementId) => void;
  dataProps?: DataProps;
};

function resolvedStyle(element: TableElement) {
  const s = element.style ?? {};
  return {
    headerEnabled: s.headerEnabled ?? DEFAULT_TABLE_STYLE.headerEnabled,
    headerFill: s.headerFill ?? DEFAULT_TABLE_STYLE.headerFill,
    headerBold: s.headerBold ?? DEFAULT_TABLE_STYLE.headerBold,
    zebraEnabled: s.zebraEnabled ?? DEFAULT_TABLE_STYLE.zebraEnabled,
    zebraFill: s.zebraFill ?? DEFAULT_TABLE_STYLE.zebraFill,
    borderColor: s.borderColor ?? DEFAULT_TABLE_STYLE.borderColor,
    borderWidth: s.borderWidth ?? DEFAULT_TABLE_STYLE.borderWidth,
    tableFill: s.tableFill ?? DEFAULT_TABLE_STYLE.tableFill,
  };
}

function wrapperStyle(element: TableElement): React.CSSProperties {
  return {
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  };
}

function gridTemplate(ratios: number[], min: string): string {
  if (!ratios.length) return "1fr";
  return ratios.map((r) => `minmax(${min}, ${Math.max(r, 0.001)}fr)`).join(" ");
}

function cssVars(element: TableElement): React.CSSProperties {
  const s = resolvedStyle(element);
  return {
    // @ts-expect-error — CSS custom properties
    "--tbl-header-fill": s.headerEnabled ? s.headerFill : "transparent",
    "--tbl-header-weight": s.headerEnabled && s.headerBold ? 700 : 400,
    "--tbl-zebra-fill": s.zebraFill,
    "--tbl-border-color": s.borderColor,
    "--tbl-border-w": `${s.borderWidth}px`,
    "--tbl-fill": s.tableFill,
    "--tbl-cols": gridTemplate(element.colRatios, "24px"),
    "--tbl-rows": gridTemplate(element.rowRatios, "24px"),
  };
}

function cellClass(
  element: TableElement,
  cell: TableCell,
  style: ReturnType<typeof resolvedStyle>,
): string {
  const isHeader = style.headerEnabled && cell.row === 0;
  const isZebra =
    style.zebraEnabled &&
    !isHeader &&
    (cell.row - (style.headerEnabled ? 1 : 0)) % 2 === 1;
  const classes = [styles.cell];
  if (isHeader) classes.push(styles.cellHeader);
  if (isZebra) classes.push(styles.cellZebra);
  void element;
  return classes.join(" ");
}

type TableCellEditorProps = {
  slideId: SlideId;
  tableId: ElementId;
  cell: TableCell;
  editing: boolean;
  selected: boolean;
  interactive: boolean;
  className: string;
  onFocusCell: (cellId: string) => void;
  onStopEditing: () => void;
};

function TableCellEditor({
  slideId,
  tableId,
  cell,
  editing,
  selected,
  interactive,
  className,
  onFocusCell,
  onStopEditing,
}: TableCellEditorProps) {
  const provider = useDocProvider();
  const { register, unregister } = useActiveEditorRegistry();

  const fragment = useMemo(
    () => provider.getTableCellFragment(slideId, tableId, cell.id),
    [provider, slideId, tableId, cell.id],
  );

  const extensions = useMemo(() => {
    if (!fragment) return [];
    return buildTableCellExtensions({ fragment });
  }, [fragment]);

  const editor = useEditor(
    {
      extensions,
      editable: editing && selected,
      immediatelyRender: false,
    },
    [fragment],
  );

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  // Empty fragment guard — y-prosemirror cannot bind to a totally empty
  // fragment, so seed a placeholder paragraph when the cell was created
  // mid-session (e.g. via addRow / addCol) and skipped hydrateDoc.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!editor || !fragment) return;
    if (seededRef.current) return;
    if (fragment.length === 0) {
      const wasEditable = editor.isEditable;
      if (!wasEditable) editor.setEditable(true);
      editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
      if (!wasEditable) editor.setEditable(false);
    }
    seededRef.current = true;
  }, [editor, fragment]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing && selected);
    if (editing && selected) editor.commands.focus();
  }, [editor, editing, selected]);

  useEffect(() => {
    if (!editor) return;
    const syncRegistry = () => {
      if (editor.isFocused) register(tableId, editor);
    };
    editor.on("focus", syncRegistry);
    editor.on("blur", () => {
      // Only unregister if nobody else re-registered in the meantime.
      // Defer so a sibling cell's focus handler can run first.
      queueMicrotask(() => {
        if (!editor.isFocused) unregister(tableId);
      });
    });
    return () => {
      editor.off("focus", syncRegistry);
      editor.off("blur");
    };
  }, [editor, register, unregister, tableId]);

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!interactive) return;
    if (editing) {
      onFocusCell(cell.id);
      e.stopPropagation();
    }
  };

  const handleDoubleClick = (e: ReactMouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onFocusCell(cell.id);
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape" && editing) {
      e.preventDefault();
      editor?.commands.blur();
      onStopEditing();
    }
  };

  return (
    <div
      className={className}
      data-cell-row={cell.row}
      data-cell-col={cell.col}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <EditorContent editor={editor} className={styles.cellContent} />
    </div>
  );
}

export function TableElementEditor({
  element,
  slideId,
  interactive,
  selected,
  editing,
  onStartEditing,
  onMouseDown,
  onContextMenu,
  dataProps,
}: TableElementEditorProps) {
  const { stopEditing } = useEditorActions();
  const style = resolvedStyle(element);

  const sortedCells = useMemo(() => {
    const copy = [...element.cells];
    copy.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    return copy;
  }, [element.cells]);

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!interactive) return;
    if (editing) {
      e.stopPropagation();
      return;
    }
    onMouseDown?.(e, element.id);
  };

  const handleDoubleClick = (e: ReactMouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onStartEditing?.(element.id);
  };

  const handleContextMenu = (e: ReactMouseEvent) => {
    if (!interactive) return;
    onContextMenu?.(e, element.id);
  };

  const focusCell = (cellId: string) => {
    void cellId;
    if (!editing) onStartEditing?.(element.id);
  };

  return (
    <div
      {...dataProps}
      className={styles.wrap}
      style={{ position: "absolute", ...wrapperStyle(element), ...cssVars(element) }}
      data-editing={editing ? "true" : undefined}
      data-interactive={interactive ? "true" : undefined}
      data-header={style.headerEnabled ? "on" : "off"}
      data-zebra={style.zebraEnabled ? "on" : "off"}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={styles.grid}>
        {sortedCells.map((cell) => (
          <TableCellEditor
            key={cell.id}
            slideId={slideId}
            tableId={element.id}
            cell={cell}
            editing={editing}
            selected={selected}
            interactive={interactive}
            className={cellClass(element, cell, style)}
            onFocusCell={focusCell}
            onStopEditing={stopEditing}
          />
        ))}
      </div>
    </div>
  );
}

type TableElementPreviewProps = {
  element: TableElement;
  dataProps?: DataProps;
  onMouseDown?: (e: ReactMouseEvent) => void;
  onContextMenu?: (e: ReactMouseEvent) => void;
};

export function TableElementPreview({
  element,
  dataProps,
  onMouseDown,
  onContextMenu,
}: TableElementPreviewProps) {
  const style = resolvedStyle(element);
  const sortedCells = useMemo(() => {
    const copy = [...element.cells];
    copy.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    return copy;
  }, [element.cells]);
  return (
    <div
      {...dataProps}
      className={styles.wrap}
      style={{ position: "absolute", ...wrapperStyle(element), ...cssVars(element) }}
      data-header={style.headerEnabled ? "on" : "off"}
      data-zebra={style.zebraEnabled ? "on" : "off"}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <div className={styles.grid}>
        {sortedCells.map((cell) => (
          <div key={cell.id} className={cellClass(element, cell, style)}>
            <div
              className={styles.cellContent}
              dangerouslySetInnerHTML={{
                __html: renderCellHtml(cell.contentJson),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCellHtml(contentJson: unknown): string {
  if (!contentJson || typeof contentJson !== "object") return "<p></p>";
  const root = contentJson as { content?: unknown[] };
  const paragraphs = Array.isArray(root.content) ? root.content : [];
  const out: string[] = [];
  for (const node of paragraphs) {
    if (!node || typeof node !== "object") continue;
    const n = node as { type?: string; content?: unknown[] };
    if (n.type !== "paragraph") continue;
    out.push(`<p>${renderInline(n.content)}</p>`);
  }
  return out.join("") || "<p></p>";
}

function renderInline(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const out: string[] = [];
  for (const node of content) {
    if (!node || typeof node !== "object") continue;
    const n = node as {
      type?: string;
      text?: string;
      marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    };
    if (n.type !== "text" || typeof n.text !== "string") continue;
    let html = escapeHtml(n.text);
    if (n.marks) {
      for (const mark of n.marks) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        else if (mark.type === "italic") html = `<em>${html}</em>`;
        else if (mark.type === "underline") html = `<u>${html}</u>`;
        else if (mark.type === "strike") html = `<s>${html}</s>`;
      }
    }
    out.push(html);
  }
  return out.join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Kept to satisfy the Y typings import.
void Y;
