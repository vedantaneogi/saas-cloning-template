"use client";

import { useState } from "react";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { ElementId } from "../model/types";
import {
  formatUnit,
  unitLabel,
  unitToPx,
  type LengthUnit,
} from "../utils/units";
import { clampToSlide } from "../geometry/align";
import { Dropdown } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

type Field = "x" | "y" | "w" | "h";

const FIELD_LABEL: Record<Field, string> = {
  x: "X",
  y: "Y",
  w: "W",
  h: "H",
};

type SizedElement = {
  id: ElementId;
  x: number;
  y: number;
  w: number;
  h: number;
};

function NumberField({
  field,
  pxValue,
  unit,
  onCommit,
  minPx,
}: {
  field: Field;
  pxValue: number;
  unit: LengthUnit;
  onCommit: (px: number) => void;
  minPx?: number;
}) {
  const display = formatUnit(pxValue, unit);
  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    let px = unitToPx(n, unit);
    if (minPx !== undefined && px < minPx) px = minPx;
    if (Math.abs(px - pxValue) < 0.01) return;
    onCommit(px);
  };
  return (
    <label className={styles.sizePosField}>
      <span className={styles.sizePosFieldLabel}>{FIELD_LABEL[field]}</span>
      <input
        key={`${display}-${unit}`}
        type="number"
        inputMode="decimal"
        step="0.01"
        defaultValue={display}
        className={styles.sizePosInput}
        aria-label={`${FIELD_LABEL[field]} in ${unitLabel(unit)}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            (e.currentTarget as HTMLInputElement).value = display;
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        onBlur={(e) => commit(e.currentTarget.value)}
      />
      <span className={styles.sizePosFieldUnit}>{unitLabel(unit)}</span>
    </label>
  );
}

export function SizePositionPanel({ element }: { element: SizedElement }) {
  const slide = useActiveSlide();
  const { selection, deck } = useEditorState();
  const { updateElement } = useEditorActions();
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<LengthUnit>("cm");
  const [lockAspect, setLockAspect] = useState(false);

  const slideId = selection.slideId ?? slide?.id ?? "";
  const page = { pageWidth: deck.meta.pageWidth, pageHeight: deck.meta.pageHeight };

  const commit = (field: Field, px: number) => {
    if (!slideId) return;
    let next = { x: element.x, y: element.y, w: element.w, h: element.h };
    if (field === "x") next.x = px;
    else if (field === "y") next.y = px;
    else if (field === "w") {
      const nextW = Math.max(1, px);
      if (lockAspect && element.w > 0) {
        const ratio = element.h / element.w;
        next.w = nextW;
        next.h = Math.max(1, nextW * ratio);
      } else {
        next.w = nextW;
      }
    } else if (field === "h") {
      const nextH = Math.max(1, px);
      if (lockAspect && element.h > 0) {
        const ratio = element.w / element.h;
        next.h = nextH;
        next.w = Math.max(1, nextH * ratio);
      } else {
        next.h = nextH;
      }
    }
    const clamped = clampToSlide(next, page);
    updateElement(slideId, element.id, clamped);
  };

  const LockIcon = lockAspect ? LockRoundedIcon : LockOpenRoundedIcon;

  return (
    <Dropdown
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      trigger={
        <button
          type="button"
          className={`${styles.toolbarButton} ${open ? styles.toolbarButtonActive : ""}`}
          title="Size & position"
          aria-label="Size and position"
          aria-pressed={open}
        >
          <StraightenRoundedIcon fontSize="small" />
        </button>
      }
    >
      <div
        className={`${styles.popover} ${styles.sizePosPopover}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.sizePosHeader}>
          <span className={styles.sizePosTitle}>Size & position</span>
          <div
            className={styles.sizePosUnitToggle}
            role="tablist"
            aria-label="Units"
          >
            <button
              type="button"
              role="tab"
              aria-selected={unit === "cm"}
              className={`${styles.sizePosUnitButton} ${unit === "cm" ? styles.sizePosUnitButtonActive : ""}`}
              onClick={() => setUnit("cm")}
            >
              cm
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={unit === "in"}
              className={`${styles.sizePosUnitButton} ${unit === "in" ? styles.sizePosUnitButtonActive : ""}`}
              onClick={() => setUnit("in")}
            >
              in
            </button>
          </div>
        </div>

        <div className={styles.sizePosSection}>
          <div className={styles.sizePosSectionLabel}>Position</div>
          <div className={styles.sizePosGrid}>
            <NumberField
              field="x"
              pxValue={element.x}
              unit={unit}
              onCommit={(px) => commit("x", px)}
            />
            <NumberField
              field="y"
              pxValue={element.y}
              unit={unit}
              onCommit={(px) => commit("y", px)}
            />
          </div>
        </div>

        <div className={styles.sizePosSection}>
          <div className={styles.sizePosSectionRow}>
            <span className={styles.sizePosSectionLabel}>Size</span>
            <button
              type="button"
              className={`${styles.sizePosLockButton} ${lockAspect ? styles.sizePosLockButtonActive : ""}`}
              onClick={() => setLockAspect((v) => !v)}
              title={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
              aria-label="Lock aspect ratio"
              aria-pressed={lockAspect}
            >
              <LockIcon fontSize="inherit" />
            </button>
          </div>
          <div className={styles.sizePosGrid}>
            <NumberField
              field="w"
              pxValue={element.w}
              unit={unit}
              onCommit={(px) => commit("w", px)}
              minPx={1}
            />
            <NumberField
              field="h"
              pxValue={element.h}
              unit={unit}
              onCommit={(px) => commit("h", px)}
              minPx={1}
            />
          </div>
        </div>
      </div>
    </Dropdown>
  );
}
