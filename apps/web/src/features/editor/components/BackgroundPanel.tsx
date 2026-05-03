"use client";

import { useRef, useState } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import {
  useActiveSlide,
  useActiveTheme,
  useEditorActions,
} from "../state/EditorContext";
import type { SlideBackground } from "../model/types";
import { fileToDataUrl } from "../utils/fileToDataUrl";
import { Dropdown } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

const SOLID_PRESETS = [
  "#ffffff",
  "#f8f9fa",
  "#f1f3f4",
  "#e8eaed",
  "#dadce0",
  "#202124",
  "#1f1f2e",
  "#0d3b55",
  "#5c2b1a",
  "#0b84a5",
  "#1a73e8",
  "#e76f51",
  "#f6bf26",
  "#188038",
  "#8430ce",
];

export function BackgroundPanel() {
  const slide = useActiveSlide();
  const theme = useActiveTheme();
  const { setSlideBackground } = useEditorActions();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!slide) return null;

  const bg = slide.background;
  const isTheme = bg.kind === "theme";
  const isSolid = bg.kind === "solid";
  const isImage = bg.kind === "image";
  const currentColor = isSolid ? bg.color : null;

  const apply = (next: SlideBackground) => {
    setSlideBackground(slide.id, next);
  };

  const handleImageFile = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      apply({ kind: "image", src: dataUrl });
    } catch (err) {
      console.error("Failed to read background image", err);
    }
  };

  const previewSwatch = (() => {
    if (isSolid) return bg.color;
    if (isTheme) return theme.colors.background;
    return theme.colors.surface;
  })();

  return (
    <Dropdown
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      trigger={
        <button
          type="button"
          className={styles.toolbarButton}
          aria-label="Background"
          title="Background"
        >
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background:
                isImage && bg.kind === "image"
                  ? `center / cover no-repeat url("${bg.src}")`
                  : previewSwatch,
              border: "1px solid rgba(0, 0, 0, 0.12)",
              display: "inline-block",
            }}
          />
          <span style={{ marginLeft: 6 }}>Background</span>
        </button>
      }
    >
      <div
        className={styles.popover}
        style={{ minWidth: 240, padding: 10 }}
      >
        <div style={labelStyle}>Background</div>

        <button
          type="button"
          className={styles.popoverItem}
          style={rowStyle}
          onClick={() => {
            apply({ kind: "theme" });
            setOpen(false);
          }}
        >
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: theme.colors.background,
              border: "1px solid rgba(0, 0, 0, 0.12)",
            }}
          />
          <span style={{ flex: 1 }}>Theme default</span>
          {isTheme ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : null}
        </button>

        <div style={{ ...labelStyle, marginTop: 8 }}>Solid colors</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 22px)",
            gap: 6,
            padding: "4px 8px 8px 8px",
          }}
        >
          {SOLID_PRESETS.map((c) => {
            const selected = isSolid && currentColor === c;
            return (
              <button
                key={c}
                type="button"
                className={styles.colorSwatch}
                style={{
                  background: c,
                  outline: selected ? "2px solid #1a73e8" : undefined,
                  outlineOffset: selected ? 1 : undefined,
                }}
                aria-label={`Solid ${c}`}
                aria-pressed={selected}
                onClick={() => apply({ kind: "solid", color: c })}
              />
            );
          })}
        </div>

        <div style={{ ...labelStyle, marginTop: 4 }}>Image</div>
        <button
          type="button"
          className={styles.popoverItem}
          style={rowStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageOutlinedIcon sx={{ fontSize: 18 }} />
          <span style={{ flex: 1 }}>
            {isImage ? "Replace image…" : "Upload image…"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          className={styles.popoverItem}
          style={{
            ...rowStyle,
            marginTop: 4,
            color: "#5f6368",
          }}
          onClick={() => {
            apply({ kind: "solid", color: "#ffffff" });
            setOpen(false);
          }}
          disabled={isSolid && currentColor === "#ffffff"}
        >
          <RestartAltRoundedIcon sx={{ fontSize: 18 }} />
          Reset to white
        </button>
      </div>
    </Dropdown>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#5f6368",
  padding: "4px 8px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 8px",
  borderRadius: 6,
};
