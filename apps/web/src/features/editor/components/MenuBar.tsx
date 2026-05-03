"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import ArrowRightRoundedIcon from "@mui/icons-material/ArrowRightRounded";
import {
  MENU_CONFIG,
  isDivider,
  type MenuItem,
  type MenuNode,
} from "../model/menuConfig";
import styles from "./menuBar.module.css";

type ChildOpen = { idx: number; rect: DOMRect } | null;

export type MenuActions = Record<string, (payload?: unknown) => void>;

type DropdownProps = {
  items: MenuNode[];
  anchorRect: DOMRect;
  side: "bottom" | "right";
  onClose: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  actions?: MenuActions;
};

function Dropdown({
  items,
  anchorRect,
  side,
  onClose,
  onHoverIn,
  onHoverOut,
  actions,
}: DropdownProps) {
  const [openChild, setOpenChild] = useState<ChildOpen>(null);

  if (typeof document === "undefined") return null;

  const style: React.CSSProperties =
    side === "bottom"
      ? {
          position: "fixed",
          top: anchorRect.bottom,
          left: anchorRect.left,
        }
      : {
          position: "fixed",
          top: anchorRect.top - 6,
          left: anchorRect.right + 2,
        };

  const childItem =
    openChild && !isDivider(items[openChild.idx])
      ? (items[openChild.idx] as MenuItem)
      : null;

  const renderChild =
    childItem?.children?.find(
      (n): n is MenuItem => !isDivider(n) && typeof n.render === "function",
    ) ?? null;

  const renderCtx = {
    dispatch: (action: string, payload?: unknown) => {
      actions?.[action]?.(payload);
      onClose();
    },
    close: onClose,
  };

  return (
    <>
      {createPortal(
        <div
          className={styles.dropdown}
          style={style}
          role="menu"
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          {items.map((item, idx) => {
            if (isDivider(item)) {
              return <div key={`d-${idx}`} className={styles.divider} />;
            }
            const Icon = item.icon;
            const hasChildren = !!item.children?.length;
            const isOpen = openChild?.idx === idx;

            return (
              <button
                key={`${item.label}-${idx}`}
                type="button"
                role="menuitem"
                className={`${styles.item} ${isOpen ? styles.itemActive : ""}`}
                onMouseEnter={(e) => {
                  if (hasChildren) {
                    setOpenChild({
                      idx,
                      rect: e.currentTarget.getBoundingClientRect(),
                    });
                  } else {
                    setOpenChild(null);
                  }
                }}
                onClick={() => {
                  if (hasChildren) return;
                  if (item.action) {
                    const handler = actions?.[item.action];
                    if (handler) handler();
                  }
                  onClose();
                }}
              >
                <span className={styles.itemIcon}>
                  {Icon ? <Icon fontSize="small" /> : null}
                </span>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.badge && (
                  <span className={styles.itemBadge}>{item.badge}</span>
                )}
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
        </div>,
        document.body,
      )}
      {openChild &&
        childItem?.children &&
        (renderChild
          ? createPortal(
              <div
                className={styles.dropdown}
                style={{
                  position: "fixed",
                  top: openChild.rect.top - 6,
                  left: openChild.rect.right + 2,
                  maxWidth: "none",
                  width: "max-content",
                }}
                role="menu"
                onMouseEnter={onHoverIn}
                onMouseLeave={onHoverOut}
              >
                {renderChild.render?.(renderCtx)}
              </div>,
              document.body,
            )
          : (
              <Dropdown
                items={childItem.children}
                anchorRect={openChild.rect}
                side="right"
                onClose={onClose}
                onHoverIn={onHoverIn}
                onHoverOut={onHoverOut}
                actions={actions}
              />
            ))}
    </>
  );
}

type TopOpen = { idx: number; rect: DOMRect } | null;

export function MenuBar({
  actions,
  menuLabels,
}: {
  actions?: MenuActions;
  /** If provided, only top-level menus whose labels appear in this list are shown. */
  menuLabels?: string[];
} = {}) {
  const [open, setOpen] = useState<TopOpen>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menus = menuLabels
    ? MENU_CONFIG.filter((m) => menuLabels.includes(m.label))
    : MENU_CONFIG;

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(null), 300);
  };

  const close = () => {
    cancelClose();
    setOpen(null);
  };

  return (
    <>
      {open && <div className={styles.backdrop} onClick={close} />}
      <nav
        className={styles.menuRow}
        aria-label="Menu bar"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        {menus.map((menu, idx) => {
          const isOpen = open?.idx === idx;
          return (
            <button
              key={menu.label}
              type="button"
              className={`${styles.topItem} ${isOpen ? styles.topItemActive : ""}`}
              onMouseEnter={(e) => {
                cancelClose();
                if (open !== null) {
                  setOpen({
                    idx,
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }
              }}
              onClick={(e) => {
                cancelClose();
                if (isOpen) {
                  setOpen(null);
                } else {
                  setOpen({
                    idx,
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }
              }}
              aria-haspopup="menu"
              aria-expanded={isOpen}
            >
              {menu.label}
            </button>
          );
        })}
      </nav>
      {open && (
        <Dropdown
          items={menus[open.idx].children}
          anchorRect={open.rect}
          side="bottom"
          onClose={close}
          onHoverIn={cancelClose}
          onHoverOut={scheduleClose}
          actions={actions}
        />
      )}
    </>
  );
}
