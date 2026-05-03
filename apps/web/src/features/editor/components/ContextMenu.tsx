"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

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
import ArrowRightRoundedIcon from "@mui/icons-material/ArrowRightRounded";
import FlipToBackOutlinedIcon from "@mui/icons-material/FlipToBackOutlined";
import VerticalAlignTopOutlinedIcon from "@mui/icons-material/VerticalAlignTopOutlined";
import VerticalAlignBottomOutlinedIcon from "@mui/icons-material/VerticalAlignBottomOutlined";
import RotateLeftOutlinedIcon from "@mui/icons-material/RotateLeftOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import AlignHorizontalCenterOutlinedIcon from "@mui/icons-material/AlignHorizontalCenterOutlined";
import AlignVerticalCenterOutlinedIcon from "@mui/icons-material/AlignVerticalCenterOutlined";

import styles from "./menuBar.module.css";

type IconType = ComponentType<{ fontSize?: "small" | "inherit" | "medium" | "large" }>;

type Divider = { kind: "divider" };
type Item = {
  kind?: "item";
  label: string;
  icon?: IconType;
  shortcut?: string;
  disabled?: boolean;
  children?: ContextMenuNode[];
  onSelect?: () => void;
};

export type ContextMenuNode = Divider | Item;

const isDivider = (n: ContextMenuNode): n is Divider =>
  (n as Divider).kind === "divider";

const ORDER_ITEMS: ContextMenuNode[] = [
  { label: "Bring to front", icon: FlipToFrontOutlinedIcon, shortcut: "⌘+Shift+↑" },
  { label: "Bring forward", icon: VerticalAlignTopOutlinedIcon, shortcut: "⌘+↑" },
  { label: "Send backward", icon: VerticalAlignBottomOutlinedIcon, shortcut: "⌘+↓" },
  { label: "Send to back", icon: FlipToBackOutlinedIcon, shortcut: "⌘+Shift+↓" },
];

const ROTATE_ITEMS: ContextMenuNode[] = [
  { label: "Rotate clockwise 90°", icon: RotateRightOutlinedIcon },
  { label: "Rotate counter-clockwise 90°", icon: RotateLeftOutlinedIcon },
  { label: "Flip horizontally", icon: SwapHorizOutlinedIcon },
  { label: "Flip vertically", icon: SwapVertOutlinedIcon },
];

const CENTER_ITEMS: ContextMenuNode[] = [
  { label: "Horizontally", icon: AlignHorizontalCenterOutlinedIcon },
  { label: "Vertically", icon: AlignVerticalCenterOutlinedIcon },
];

export const DEFAULT_ELEMENT_MENU: ContextMenuNode[] = [
  { label: "Cut", icon: ContentCutOutlinedIcon, shortcut: "⌘X", disabled: true },
  { label: "Copy", icon: ContentCopyOutlinedIcon, shortcut: "⌘C", disabled: true },
  { label: "Paste", icon: ContentPasteOutlinedIcon, shortcut: "⌘V" },
  {
    label: "Paste without formatting",
    icon: ContentPasteOffOutlinedIcon,
    shortcut: "⌘+Shift+V",
  },
  { label: "Delete", icon: DeleteOutlineOutlinedIcon, disabled: true },
  { kind: "divider" },
  { label: "Alt text", icon: AccessibilityNewOutlinedIcon, shortcut: "⌘+Option+Y" },
  { kind: "divider" },
  { label: "Order", icon: FlipToFrontOutlinedIcon, children: ORDER_ITEMS },
  { label: "Rotate", icon: RotateRightOutlinedIcon, children: ROTATE_ITEMS },
  { label: "Center on page", icon: CenterFocusStrongOutlinedIcon, children: CENTER_ITEMS },
  { kind: "divider" },
  { label: "Comment", icon: AddCommentOutlinedIcon, shortcut: "⌘+Option+M" },
  { kind: "divider" },
  { label: "Link", icon: LinkOutlinedIcon, shortcut: "⌘K" },
  { kind: "divider" },
  { label: "Animate", icon: AnimationOutlinedIcon },
  { kind: "divider" },
  { label: "Format options", icon: FormatPaintOutlinedIcon },
  { kind: "divider" },
  { label: "Update in theme", icon: PaletteOutlinedIcon },
];

type Submenu = {
  parent: HTMLElement;
  items: ContextMenuNode[];
} | null;

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuNode[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [submenu, setSubmenu] = useState<Submenu>(null);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth - 8) {
      nx = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (y + rect.height > window.innerHeight - 8) {
      ny = Math.max(8, window.innerHeight - rect.height - 8);
    }
    setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className={styles.backdrop} onMouseDown={onClose} onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }} />
      <div
        ref={rootRef}
        className={styles.dropdown}
        role="menu"
        style={{ position: "fixed", top: pos.y, left: pos.x, zIndex: 1000 }}
      >
        {items.map((item, idx) => {
          if (isDivider(item)) {
            return <div key={`d-${idx}`} className={styles.divider} />;
          }
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;
          const disabled = !!item.disabled;
          return (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              role="menuitem"
              aria-disabled={disabled || undefined}
              className={`${styles.item} ${disabled ? styles.itemDisabled : ""}`}
              onMouseEnter={(e) => {
                if (hasChildren && !disabled) {
                  setSubmenu({
                    parent: e.currentTarget,
                    items: item.children as ContextMenuNode[],
                  });
                } else {
                  setSubmenu(null);
                }
              }}
              onClick={() => {
                if (disabled) return;
                if (hasChildren) return;
                item.onSelect?.();
                onClose();
              }}
            >
              <span className={styles.itemIcon}>
                {Icon ? <Icon fontSize="small" /> : null}
              </span>
              <span className={styles.itemLabel}>{item.label}</span>
              {item.shortcut && (
                <span className={styles.itemShortcut}>{item.shortcut}</span>
              )}
              {hasChildren && (
                <ArrowRightRoundedIcon
                  fontSize="small"
                  className={styles.itemArrow}
                />
              )}
            </button>
          );
        })}
      </div>
      {submenu && (
        <Submenu
          items={submenu.items}
          anchor={submenu.parent.getBoundingClientRect()}
          onClose={onClose}
        />
      )}
    </>,
    document.body,
  );
}

function Submenu({
  items,
  anchor,
  onClose,
}: {
  items: ContextMenuNode[];
  anchor: DOMRect;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: anchor.right + 2, y: anchor.top - 6 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    let nx = anchor.right + 2;
    let ny = anchor.top - 6;
    if (nx + rect.width > window.innerWidth - 8) {
      nx = Math.max(8, anchor.left - rect.width - 2);
    }
    if (ny + rect.height > window.innerHeight - 8) {
      ny = Math.max(8, window.innerHeight - rect.height - 8);
    }
    setPos({ x: nx, y: ny });
  }, [anchor]);

  return (
    <div
      ref={ref}
      className={styles.dropdown}
      role="menu"
      style={{ position: "fixed", top: pos.y, left: pos.x, zIndex: 1001 }}
    >
      {items.map((item, idx) => {
        if (isDivider(item)) {
          return <div key={`d-${idx}`} className={styles.divider} />;
        }
        const Icon = item.icon;
        const disabled = !!item.disabled;
        return (
          <button
            key={`${item.label}-${idx}`}
            type="button"
            role="menuitem"
            aria-disabled={disabled || undefined}
            className={`${styles.item} ${disabled ? styles.itemDisabled : ""}`}
            onClick={() => {
              if (disabled) return;
              item.onSelect?.();
              onClose();
            }}
          >
            <span className={styles.itemIcon}>
              {Icon ? <Icon fontSize="small" /> : null}
            </span>
            <span className={styles.itemLabel}>{item.label}</span>
            {item.shortcut && (
              <span className={styles.itemShortcut}>{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
