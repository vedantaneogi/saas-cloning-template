"use client";

import { useState } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {
  useActiveSlide,
  useActiveTheme,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import { LAYOUTS } from "../layouts";
import { Dropdown } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

const THUMB_W = 96;
const THUMB_H = 54;

export function LayoutPicker() {
  const slide = useActiveSlide();
  const { deck } = useEditorState();
  const theme = useActiveTheme();
  const { applyLayout } = useEditorActions();
  const [open, setOpen] = useState(false);

  if (!slide) return null;

  const { pageWidth, pageHeight } = deck.meta;

  return (
    <Dropdown
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      trigger={
        <button
          type="button"
          className={styles.toolbarButton}
          aria-label="Layout"
          title="Layout"
        >
          Layout
        </button>
      }
    >
      <div
        className={styles.popover}
        style={{
          minWidth: 260,
          padding: 8,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {LAYOUTS.map((layout) => {
          const active = slide.layoutId === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              className={styles.popoverItem}
              style={{
                padding: 6,
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                border: active
                  ? "2px solid #1a73e8"
                  : "2px solid transparent",
              }}
              onClick={() => {
                const elements = layout.build(pageWidth, pageHeight);
                applyLayout(slide.id, layout.id, elements);
                setOpen(false);
              }}
              aria-pressed={active}
            >
              <LayoutThumbnail layoutId={layout.id} themeBg={theme.colors.background} />
              <span
                style={{
                  fontSize: 12,
                  color: "#202124",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {active ? (
                  <CheckRoundedIcon sx={{ fontSize: 14, color: "#1a73e8" }} />
                ) : null}
                {layout.name}
              </span>
            </button>
          );
        })}
      </div>
    </Dropdown>
  );
}

function LayoutThumbnail({
  layoutId,
  themeBg,
}: {
  layoutId: string;
  themeBg: string;
}) {
  const barColor = "#c7c9cc";
  const box = {
    width: THUMB_W,
    height: THUMB_H,
    background: themeBg,
    border: "1px solid #dadce0",
    borderRadius: 4,
    position: "relative" as const,
    overflow: "hidden",
  };
  const bar = (style: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    background: barColor,
    borderRadius: 2,
    ...style,
  });

  if (layoutId === "blank") {
    return <div style={box} />;
  }
  if (layoutId === "title") {
    return (
      <div style={box}>
        <span style={bar({ left: 10, right: 10, top: 16, height: 8 })} />
        <span style={bar({ left: 22, right: 22, top: 30, height: 4, opacity: 0.6 })} />
      </div>
    );
  }
  if (layoutId === "titleContent") {
    return (
      <div style={box}>
        <span style={bar({ left: 6, right: 6, top: 6, height: 6 })} />
        <span style={bar({ left: 6, right: 6, top: 18, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 6, right: 6, top: 24, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 6, right: 6, top: 30, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 6, right: 36, top: 36, height: 3, opacity: 0.6 })} />
      </div>
    );
  }
  if (layoutId === "twoColumn") {
    return (
      <div style={box}>
        <span style={bar({ left: 6, right: 6, top: 6, height: 6 })} />
        <span style={bar({ left: 6, width: 38, top: 18, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 6, width: 38, top: 24, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 6, width: 30, top: 30, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 52, width: 38, top: 18, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 52, width: 38, top: 24, height: 3, opacity: 0.6 })} />
        <span style={bar({ left: 52, width: 30, top: 30, height: 3, opacity: 0.6 })} />
      </div>
    );
  }
  if (layoutId === "imageCaption") {
    return (
      <div style={box}>
        <span style={bar({ left: 6, right: 6, top: 6, height: 5 })} />
        <span
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: 16,
            bottom: 10,
            background: "rgba(60, 64, 67, 0.12)",
            borderRadius: 3,
          }}
        />
      </div>
    );
  }
  return <div style={box} />;
}
