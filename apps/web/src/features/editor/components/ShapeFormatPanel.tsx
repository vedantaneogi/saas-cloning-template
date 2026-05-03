"use client";

import { useState } from "react";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import FormatColorFillOutlinedIcon from "@mui/icons-material/FormatColorFillOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import BorderAllOutlinedIcon from "@mui/icons-material/BorderAllOutlined";
import BorderStyleOutlinedIcon from "@mui/icons-material/BorderStyleOutlined";
import RoundedCornerOutlinedIcon from "@mui/icons-material/RoundedCornerOutlined";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { ShapeElement } from "../model/types";
import { Dropdown, ColorGrid } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

const FILL_COLORS = [
  "transparent", "#ffffff", "#f1f3f4", "#bdc1c6", "#9aa0a6",
  "#a8c7fa", "#aecbfa", "#c58af9", "#fdcfe8", "#f28b82",
  "#fbbc04", "#fdd663", "#ccff90", "#a7ffeb", "#cbf0f8",
];

const STROKE_COLORS = [
  "transparent", "#202124", "#5f6368", "#9aa0a6", "#ffffff",
  "#d93025", "#ea8600", "#188038", "#1a73e8", "#8430ce",
];

const STROKE_WEIGHTS = [0, 1, 2, 3, 4, 6, 8, 12];

const DASH_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

export function ShapeFormatPanel({ element }: { element: ShapeElement }) {
  const slide = useActiveSlide();
  const { selection } = useEditorState();
  const { updateElement } = useEditorActions();

  const slideId = selection.slideId ?? slide?.id ?? "";

  const fill = element.fill ?? "transparent";
  const stroke = element.stroke ?? "transparent";
  const strokeWidth = element.strokeWidth ?? 0;
  const radius = element.radius ?? 0;
  const isLinear = element.shape === "line" || element.shape === "arrow";

  const setFill = (v: string) => updateElement(slideId, element.id, { fill: v });
  const setStroke = (v: string) => updateElement(slideId, element.id, { stroke: v });
  const setStrokeWidth = (v: number) =>
    updateElement(slideId, element.id, { strokeWidth: v });
  const setRadius = (v: number) =>
    updateElement(slideId, element.id, { radius: Math.max(0, v) });

  const [fillOpen, setFillOpen] = useState(false);
  const [strokeOpen, setStrokeOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);

  return (
    <>
      {!isLinear ? (
        <Dropdown
          open={fillOpen}
          onOpen={() => setFillOpen(true)}
          onClose={() => setFillOpen(false)}
          trigger={
            <button
              className={styles.toolbarButton}
              title="Fill color"
              aria-label="Fill color"
            >
              <span className={styles.textColorStack}>
                <FormatColorFillOutlinedIcon fontSize="small" />
                <span
                  className={styles.textColorUnderline}
                  style={{ background: fill === "transparent" ? "#fff" : fill }}
                />
              </span>
            </button>
          }
        >
          <div className={styles.popover} style={{ padding: 8 }}>
            <ColorGrid
              colors={FILL_COLORS}
              onSelect={(c) => {
                setFill(c);
                setFillOpen(false);
              }}
            />
          </div>
        </Dropdown>
      ) : null}

      <Dropdown
        open={strokeOpen}
        onOpen={() => setStrokeOpen(true)}
        onClose={() => setStrokeOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Border color"
            aria-label="Border color"
          >
            <span className={styles.textColorStack}>
              <BorderColorOutlinedIcon fontSize="small" />
              <span
                className={styles.textColorUnderline}
                style={{ background: stroke === "transparent" ? "#fff" : stroke }}
              />
            </span>
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8 }}>
          <ColorGrid
            colors={STROKE_COLORS}
            onSelect={(c) => {
              setStroke(c);
              setStrokeOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <Dropdown
        open={weightOpen}
        onOpen={() => setWeightOpen(true)}
        onClose={() => setWeightOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Border weight"
            aria-label="Border weight"
          >
            <BorderAllOutlinedIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 120 }}>
          {STROKE_WEIGHTS.map((w) => (
            <button
              key={w}
              type="button"
              className={styles.popoverItem}
              onClick={() => {
                setStrokeWidth(w);
                setWeightOpen(false);
              }}
            >
              <span className={styles.weightRow}>
                <span className={styles.weightLabel}>{w === 0 ? "None" : `${w}px`}</span>
                {w > 0 ? (
                  <span
                    className={styles.weightSample}
                    style={{ borderTopWidth: Math.min(w, 6) }}
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </Dropdown>

      <Dropdown
        open={dashOpen}
        onOpen={() => setDashOpen(true)}
        onClose={() => setDashOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Border dash"
            aria-label="Border dash"
          >
            <BorderStyleOutlinedIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 120 }}>
          {DASH_STYLES.map((d) => (
            <button
              key={d.value}
              type="button"
              className={styles.popoverItem}
              onClick={() => setDashOpen(false)}
              title="Dash styles render in Phase 6"
            >
              {d.label}
            </button>
          ))}
        </div>
      </Dropdown>

      {element.shape === "rect" ? (
        <Dropdown
          open={radiusOpen}
          onOpen={() => setRadiusOpen(true)}
          onClose={() => setRadiusOpen(false)}
          trigger={
            <button
              className={styles.toolbarButton}
              title="Corner radius"
              aria-label="Corner radius"
            >
              <RoundedCornerOutlinedIcon fontSize="small" />
              <ArrowDropDownRoundedIcon fontSize="small" />
            </button>
          }
        >
          <div className={styles.popover} style={{ padding: 10, minWidth: 180 }}>
            <div className={styles.sliderRow}>
              <input
                type="range"
                min={0}
                max={Math.max(40, Math.floor(Math.min(element.w, element.h) / 2))}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                aria-label="Corner radius"
              />
              <span className={styles.sliderValue}>{radius}px</span>
            </div>
          </div>
        </Dropdown>
      ) : null}
    </>
  );
}
