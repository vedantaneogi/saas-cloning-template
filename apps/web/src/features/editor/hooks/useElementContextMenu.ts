"use client";

import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type { ContextMenuNode } from "../components/ContextMenu";
import type { DeckMeta, ElementId, SlideElement, SlideId } from "../model/types";
import type { ElementPatch, ZDirection } from "../yjs/provider";

import ContentCutOutlinedIcon from "@mui/icons-material/ContentCutOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ContentPasteOutlinedIcon from "@mui/icons-material/ContentPasteOutlined";
import ContentPasteOffOutlinedIcon from "@mui/icons-material/ContentPasteOffOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AccessibilityNewOutlinedIcon from "@mui/icons-material/AccessibilityNewOutlined";
import FlipToFrontOutlinedIcon from "@mui/icons-material/FlipToFrontOutlined";
import RotateRightOutlinedIcon from "@mui/icons-material/RotateRightOutlined";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import AnimationOutlinedIcon from "@mui/icons-material/AnimationOutlined";
import FormatPaintOutlinedIcon from "@mui/icons-material/FormatPaintOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import FlipToBackOutlinedIcon from "@mui/icons-material/FlipToBackOutlined";
import VerticalAlignTopOutlinedIcon from "@mui/icons-material/VerticalAlignTopOutlined";
import VerticalAlignBottomOutlinedIcon from "@mui/icons-material/VerticalAlignBottomOutlined";
import RotateLeftOutlinedIcon from "@mui/icons-material/RotateLeftOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import AlignHorizontalCenterOutlinedIcon from "@mui/icons-material/AlignHorizontalCenterOutlined";
import AlignVerticalCenterOutlinedIcon from "@mui/icons-material/AlignVerticalCenterOutlined";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import IndeterminateCheckBoxOutlinedIcon from "@mui/icons-material/IndeterminateCheckBoxOutlined";

// Module-level clipboard — survives re-renders, cleared on page unload
let clipboard: SlideElement | null = null;

type Actions = {
  addElement: (slideId: SlideId, el: SlideElement) => void;
  updateElement: (slideId: SlideId, id: ElementId, patch: ElementPatch) => void;
  deleteElement: (slideId: SlideId, id: ElementId) => void;
  setElementZ: (slideId: SlideId, id: ElementId, dir: ZDirection) => void;
  selectElements: (slideId: SlideId, ids: ElementId[]) => void;
  insertTableRow?: (slideId: SlideId, id: ElementId, afterRow: number) => void;
  insertTableColumn?: (slideId: SlideId, id: ElementId, afterCol: number) => void;
  deleteTableRow?: (slideId: SlideId, id: ElementId, row: number) => void;
  deleteTableColumn?: (slideId: SlideId, id: ElementId, col: number) => void;
};

export function useElementContextMenu(
  slideId: SlideId | null,
  selectedElements: SlideElement[],
  meta: DeckMeta,
  actions: Actions,
  editor: Editor | null = null,
): ContextMenuNode[] {
  return useMemo(() => {
    if (!slideId || selectedElements.length === 0) return [];

    const el = selectedElements[0];
    const hasClipboard = clipboard !== null;

    if (el.type === "table") {
      return buildTableContextMenu(slideId, el, actions);
    }

    const cut = () => {
      clipboard = { ...el };
      actions.deleteElement(slideId, el.id);
    };

    const copy = () => {
      clipboard = { ...el };
    };

    const paste = () => {
      if (!clipboard) return;
      const newEl: SlideElement = {
        ...clipboard,
        id: `el-${crypto.randomUUID().slice(0, 8)}`,
        x: clipboard.x + 20,
        y: clipboard.y + 20,
      };
      actions.addElement(slideId, newEl);
    };

    const pasteNoFormat = () => paste();

    const del = () => actions.deleteElement(slideId, el.id);

    const rotateBy = (deg: number) => {
      const current = el.rotation ?? 0;
      actions.updateElement(slideId, el.id, {
        rotation: ((current + deg) % 360 + 360) % 360,
      });
    };

    const centerH = () => {
      actions.updateElement(slideId, el.id, {
        x: Math.round((meta.pageWidth - el.w) / 2),
      });
    };

    const centerV = () => {
      actions.updateElement(slideId, el.id, {
        y: Math.round((meta.pageHeight - el.h) / 2),
      });
    };

    const addLink = () => {
      const url = window.prompt("Enter link URL:", "https://");
      if (!url) return;
      // Link stored as alt text on images; placeholder for text/shape
      if (el.type === "image") {
        actions.updateElement(slideId, el.id, { alt: url } as ElementPatch);
      }
    };

    return [
      { label: "Cut", icon: ContentCutOutlinedIcon, shortcut: "⌘X", onSelect: cut },
      { label: "Copy", icon: ContentCopyOutlinedIcon, shortcut: "⌘C", onSelect: copy },
      {
        label: "Paste",
        icon: ContentPasteOutlinedIcon,
        shortcut: "⌘V",
        disabled: !hasClipboard,
        onSelect: paste,
      },
      {
        label: "Paste without formatting",
        icon: ContentPasteOffOutlinedIcon,
        shortcut: "⌘+Shift+V",
        disabled: !hasClipboard,
        onSelect: pasteNoFormat,
      },
      { label: "Delete", icon: DeleteOutlineOutlinedIcon, onSelect: del },
      { kind: "divider" as const },
      { label: "Alt text", icon: AccessibilityNewOutlinedIcon, shortcut: "⌘+Option+Y" },
      { kind: "divider" as const },
      {
        label: "Order",
        icon: FlipToFrontOutlinedIcon,
        children: [
          {
            label: "Bring to front",
            icon: FlipToFrontOutlinedIcon,
            shortcut: "⌘+Shift+↑",
            onSelect: () => actions.setElementZ(slideId, el.id, "front"),
          },
          {
            label: "Bring forward",
            icon: VerticalAlignTopOutlinedIcon,
            shortcut: "⌘+↑",
            onSelect: () => actions.setElementZ(slideId, el.id, "forward"),
          },
          {
            label: "Send backward",
            icon: VerticalAlignBottomOutlinedIcon,
            shortcut: "⌘+↓",
            onSelect: () => actions.setElementZ(slideId, el.id, "backward"),
          },
          {
            label: "Send to back",
            icon: FlipToBackOutlinedIcon,
            shortcut: "⌘+Shift+↓",
            onSelect: () => actions.setElementZ(slideId, el.id, "back"),
          },
        ],
      },
      {
        label: "Rotate",
        icon: RotateRightOutlinedIcon,
        children: [
          {
            label: "Rotate clockwise 90°",
            icon: RotateRightOutlinedIcon,
            onSelect: () => rotateBy(90),
          },
          {
            label: "Rotate counter-clockwise 90°",
            icon: RotateLeftOutlinedIcon,
            onSelect: () => rotateBy(-90),
          },
          { label: "Flip horizontally", icon: SwapHorizOutlinedIcon },
          { label: "Flip vertically", icon: SwapVertOutlinedIcon },
        ],
      },
      {
        label: "Center on page",
        icon: CenterFocusStrongOutlinedIcon,
        children: [
          {
            label: "Horizontally",
            icon: AlignHorizontalCenterOutlinedIcon,
            onSelect: centerH,
          },
          {
            label: "Vertically",
            icon: AlignVerticalCenterOutlinedIcon,
            onSelect: centerV,
          },
        ],
      },
      { kind: "divider" as const },
      { label: "Comment", icon: AddCommentOutlinedIcon, shortcut: "⌘+Option+M" },
      { kind: "divider" as const },
      { label: "Link", icon: LinkOutlinedIcon, shortcut: "⌘K", onSelect: addLink },
      { kind: "divider" as const },
      { label: "Animate", icon: AnimationOutlinedIcon },
      { kind: "divider" as const },
      { label: "Format options", icon: FormatPaintOutlinedIcon },
      { kind: "divider" as const },
      { label: "Update in theme", icon: PaletteOutlinedIcon },
    ];
  }, [slideId, selectedElements, meta, actions, editor]);
}

function buildTableContextMenu(
  slideId: SlideId,
  el: SlideElement,
  actions: Actions,
): ContextMenuNode[] {
  if (el.type !== "table") return [];
  const tableId = el.id;
  const lastRow = Math.max(0, (el.rows ?? 1) - 1);
  const lastCol = Math.max(0, (el.cols ?? 1) - 1);
  const canDeleteRow = (el.rows ?? 1) > 1;
  const canDeleteCol = (el.cols ?? 1) > 1;
  const ready =
    !!actions.insertTableRow &&
    !!actions.insertTableColumn &&
    !!actions.deleteTableRow &&
    !!actions.deleteTableColumn;
  const equalizeRows = () => {
    const n = el.rows ?? 0;
    if (n > 0) {
      actions.updateElement(slideId, tableId, {
        rowRatios: Array.from({ length: n }, () => 1),
      });
    }
  };
  const equalizeCols = () => {
    const n = el.cols ?? 0;
    if (n > 0) {
      actions.updateElement(slideId, tableId, {
        colRatios: Array.from({ length: n }, () => 1),
      });
    }
  };
  return [
    {
      label: "Insert row above",
      icon: AddBoxOutlinedIcon,
      disabled: !ready,
      onSelect: () => actions.insertTableRow?.(slideId, tableId, -1),
    },
    {
      label: "Insert row below",
      icon: AddBoxOutlinedIcon,
      disabled: !ready,
      onSelect: () => actions.insertTableRow?.(slideId, tableId, lastRow),
    },
    {
      label: "Insert column left",
      icon: ViewColumnOutlinedIcon,
      disabled: !ready,
      onSelect: () => actions.insertTableColumn?.(slideId, tableId, -1),
    },
    {
      label: "Insert column right",
      icon: ViewColumnOutlinedIcon,
      disabled: !ready,
      onSelect: () => actions.insertTableColumn?.(slideId, tableId, lastCol),
    },
    { kind: "divider" as const },
    {
      label: "Delete last row",
      icon: IndeterminateCheckBoxOutlinedIcon,
      disabled: !ready || !canDeleteRow,
      onSelect: () => actions.deleteTableRow?.(slideId, tableId, lastRow),
    },
    {
      label: "Delete last column",
      icon: IndeterminateCheckBoxOutlinedIcon,
      disabled: !ready || !canDeleteCol,
      onSelect: () => actions.deleteTableColumn?.(slideId, tableId, lastCol),
    },
    {
      label: "Delete table",
      icon: DeleteOutlineOutlinedIcon,
      onSelect: () => actions.deleteElement(slideId, tableId),
    },
    { kind: "divider" as const },
    {
      label: "Distribute rows",
      icon: TableRowsOutlinedIcon,
      onSelect: equalizeRows,
    },
    {
      label: "Distribute columns",
      icon: ViewColumnOutlinedIcon,
      onSelect: equalizeCols,
    },
    { kind: "divider" as const },
    {
      label: "Table properties",
      icon: FormatPaintOutlinedIcon,
      onSelect: () => actions.selectElements(slideId, [tableId]),
    },
  ];
}
