"use client";

import type { ReactElement, ReactNode } from "react";
import styles from "../editor.module.css";

export function Dropdown({
  open,
  onOpen,
  onClose,
  trigger,
  children,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  trigger: ReactElement;
  children: ReactNode;
}) {
  return (
    <div className={styles.dropdownWrap}>
      <span onClick={open ? onClose : onOpen}>{trigger}</span>
      {open ? (
        <>
          <div className={styles.dropdownBackdrop} onClick={onClose} />
          <div className={styles.dropdownPopover}>{children}</div>
        </>
      ) : null}
    </div>
  );
}

export function ColorGrid({
  colors,
  onSelect,
}: {
  colors: string[];
  onSelect: (c: string) => void;
}) {
  return (
    <div className={styles.colorGrid}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.colorSwatch}
          style={{
            background: c === "transparent" ? "#fff" : c,
            border: c === "transparent" ? "2px solid #c4c7c5" : undefined,
          }}
          onClick={() => onSelect(c)}
          aria-label={`Color ${c}`}
        >
          {c === "transparent" ? (
            <span className={styles.colorSwatchSlash} aria-hidden>
              ╱
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
