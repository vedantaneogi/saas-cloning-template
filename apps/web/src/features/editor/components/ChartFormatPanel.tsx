"use client";

import { useState } from "react";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import AlignVerticalBottomOutlinedIcon from "@mui/icons-material/AlignVerticalBottomOutlined";
import AlignHorizontalLeftOutlinedIcon from "@mui/icons-material/AlignHorizontalLeftOutlined";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import TitleRoundedIcon from "@mui/icons-material/TitleRounded";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { ChartElement } from "../model/types";
import { Dropdown } from "./FormatPanelPrimitives";
import { ChartDataDialog } from "./ChartDataDialog";
import { PRESET_PALETTES } from "./charts/chartPalette";
import styles from "../editor.module.css";

type Props = { element: ChartElement };

export function ChartFormatPanel({ element }: Props) {
  const slide = useActiveSlide();
  const { selection } = useEditorState();
  const { updateChartStyle, setChartKind, updateElement } = useEditorActions();
  const slideId = selection.slideId ?? slide?.id ?? "";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);

  const style = element.style;
  const isPie = element.chartKind === "pie";
  const horizontal = style.orientation === "horizontal";
  const showLegend = style.showLegend ?? true;
  const showValues = style.showValues ?? false;

  return (
    <>
      <button
        type="button"
        className={styles.toolbarButton}
        title="Edit data"
        aria-label="Edit data"
        onClick={() => setDialogOpen(true)}
      >
        <EditOutlinedIcon fontSize="small" />
        <span style={{ marginLeft: 4, fontSize: 12 }}>Edit data</span>
      </button>

      <span className={styles.toolbarDivider} />

      <button
        type="button"
        className={`${styles.toolbarButton} ${isPie ? styles.toolbarButtonActive : ""}`}
        title="Pie chart"
        aria-label="Pie chart"
        aria-pressed={isPie}
        onClick={() => setChartKind(slideId, element.id, "pie")}
      >
        <PieChartOutlineOutlinedIcon fontSize="small" />
      </button>
      <button
        type="button"
        className={`${styles.toolbarButton} ${!isPie ? styles.toolbarButtonActive : ""}`}
        title="Bar chart"
        aria-label="Bar chart"
        aria-pressed={!isPie}
        onClick={() => setChartKind(slideId, element.id, "bar")}
      >
        <BarChartOutlinedIcon fontSize="small" />
      </button>

      {!isPie && (
        <>
          <span className={styles.toolbarDivider} />
          <button
            type="button"
            className={`${styles.toolbarButton} ${!horizontal ? styles.toolbarButtonActive : ""}`}
            title="Vertical bars"
            aria-label="Vertical bars"
            onClick={() =>
              updateChartStyle(slideId, element.id, { orientation: "vertical" })
            }
          >
            <AlignVerticalBottomOutlinedIcon fontSize="small" />
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${horizontal ? styles.toolbarButtonActive : ""}`}
            title="Horizontal bars"
            aria-label="Horizontal bars"
            onClick={() =>
              updateChartStyle(slideId, element.id, { orientation: "horizontal" })
            }
          >
            <AlignHorizontalLeftOutlinedIcon fontSize="small" />
          </button>
        </>
      )}

      <span className={styles.toolbarDivider} />

      <button
        type="button"
        className={`${styles.toolbarButton} ${showLegend ? styles.toolbarButtonActive : ""}`}
        title={showLegend ? "Hide legend" : "Show legend"}
        aria-label="Toggle legend"
        aria-pressed={showLegend}
        onClick={() =>
          updateChartStyle(slideId, element.id, { showLegend: !showLegend })
        }
      >
        <FormatListBulletedRoundedIcon fontSize="small" />
      </button>
      <button
        type="button"
        className={`${styles.toolbarButton} ${showValues ? styles.toolbarButtonActive : ""}`}
        title={showValues ? "Hide values" : "Show values"}
        aria-label="Toggle values"
        aria-pressed={showValues}
        onClick={() =>
          updateChartStyle(slideId, element.id, { showValues: !showValues })
        }
      >
        <TagRoundedIcon fontSize="small" />
      </button>

      <Dropdown
        open={paletteOpen}
        onOpen={() => setPaletteOpen(true)}
        onClose={() => setPaletteOpen(false)}
        trigger={
          <button
            type="button"
            className={styles.toolbarButton}
            title="Color palette"
            aria-label="Color palette"
          >
            <PaletteOutlinedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 180, padding: 8 }}>
          {Object.entries(PRESET_PALETTES).map(([name, colors]) => (
            <button
              key={name}
              type="button"
              className={styles.popoverItem}
              onClick={() => {
                updateChartStyle(slideId, element.id, { colors: [...colors] });
                setPaletteOpen(false);
              }}
            >
              <span className={styles.popoverItemRow}>
                <span style={{ display: "flex", gap: 2 }}>
                  {colors.slice(0, 5).map((c) => (
                    <span
                      key={c}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: c,
                      }}
                    />
                  ))}
                </span>
                <span style={{ marginLeft: 8 }}>{name}</span>
              </span>
            </button>
          ))}
        </div>
      </Dropdown>

      <Dropdown
        open={titleOpen}
        onOpen={() => setTitleOpen(true)}
        onClose={() => setTitleOpen(false)}
        trigger={
          <button
            type="button"
            className={`${styles.toolbarButton} ${style.title ? styles.toolbarButtonActive : ""}`}
            title="Chart title"
            aria-label="Chart title"
          >
            <TitleRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 220, padding: 8 }}>
          <input
            type="text"
            placeholder="Chart title"
            defaultValue={style.title ?? ""}
            onChange={(e) =>
              updateElement(slideId, element.id, {
                style: { ...style, title: e.target.value },
              })
            }
            style={{
              width: "100%",
              padding: "6px 8px",
              border: "1px solid #dadce0",
              borderRadius: 4,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </Dropdown>

      <ChartDataDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        slideId={slideId}
        chartId={element.id}
      />
    </>
  );
}
