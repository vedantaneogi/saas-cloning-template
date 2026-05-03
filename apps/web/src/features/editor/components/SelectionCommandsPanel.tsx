"use client";

import { useState } from "react";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import AlignHorizontalLeftRoundedIcon from "@mui/icons-material/AlignHorizontalLeftRounded";
import AlignHorizontalCenterRoundedIcon from "@mui/icons-material/AlignHorizontalCenterRounded";
import AlignHorizontalRightRoundedIcon from "@mui/icons-material/AlignHorizontalRightRounded";
import AlignVerticalTopRoundedIcon from "@mui/icons-material/AlignVerticalTopRounded";
import AlignVerticalCenterRoundedIcon from "@mui/icons-material/AlignVerticalCenterRounded";
import AlignVerticalBottomRoundedIcon from "@mui/icons-material/AlignVerticalBottomRounded";
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import ViewStreamRoundedIcon from "@mui/icons-material/ViewStreamRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import AspectRatioRoundedIcon from "@mui/icons-material/AspectRatioRounded";
import FlipToFrontRoundedIcon from "@mui/icons-material/FlipToFrontRounded";
import FlipToBackRoundedIcon from "@mui/icons-material/FlipToBackRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import {
  useActiveSlide,
  useEditorActions,
} from "../state/EditorContext";
import {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  matchSize,
  type AlignTarget,
  type MatchSizeMode,
} from "../geometry/align";
import { Dropdown } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

export function SelectionCommandsPanel({
  selectedIds,
}: {
  selectedIds: string[];
}) {
  const slide = useActiveSlide();
  const { updateElements, setElementZ } = useEditorActions();
  const [alignOpen, setAlignOpen] = useState(false);

  if (!slide) return null;
  const targets: AlignTarget[] = selectedIds
    .map((id) => slide.elements.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined)
    .map((e) => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h }));

  if (targets.length === 0) return null;
  const single = targets.length === 1;
  const canDistribute = targets.length >= 3;
  const page = { pageWidth: 960, pageHeight: 540 };

  const runAlignH = (mode: "left" | "center" | "right") => {
    const updates = alignHorizontal(targets, mode, page);
    if (updates.length) updateElements(slide.id, updates);
  };
  const runAlignV = (mode: "top" | "middle" | "bottom") => {
    const updates = alignVertical(targets, mode, page);
    if (updates.length) updateElements(slide.id, updates);
  };
  const runDistH = () => {
    const updates = distributeHorizontal(targets);
    if (updates.length) updateElements(slide.id, updates);
  };
  const runDistV = () => {
    const updates = distributeVertical(targets);
    if (updates.length) updateElements(slide.id, updates);
  };
  const runMatchSize = (mode: MatchSizeMode) => {
    const updates = matchSize(targets, mode);
    if (updates.length) updateElements(slide.id, updates);
  };
  const canMatchSize = targets.length >= 2;

  return (
    <>
      <Dropdown
        open={alignOpen}
        onOpen={() => setAlignOpen(true)}
        onClose={() => setAlignOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title={single ? "Align to slide" : "Align"}
            aria-label="Align"
          >
            <FormatAlignCenterRoundedIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8, minWidth: 160 }}>
          <div className={styles.alignSection}>
            <div className={styles.alignSectionLabel}>Align horizontally</div>
            <div className={styles.alignRow}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runAlignH("left");
                  setAlignOpen(false);
                }}
                title="Left"
                aria-label="Align left"
              >
                <AlignHorizontalLeftRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runAlignH("center");
                  setAlignOpen(false);
                }}
                title="Center"
                aria-label="Align center"
              >
                <AlignHorizontalCenterRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runAlignH("right");
                  setAlignOpen(false);
                }}
                title="Right"
                aria-label="Align right"
              >
                <AlignHorizontalRightRoundedIcon fontSize="small" />
              </button>
            </div>
          </div>
          <div className={styles.alignSection}>
            <div className={styles.alignSectionLabel}>Align vertically</div>
            <div className={styles.alignRow}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runAlignV("top");
                  setAlignOpen(false);
                }}
                title="Top"
                aria-label="Align top"
              >
                <AlignVerticalTopRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runAlignV("middle");
                  setAlignOpen(false);
                }}
                title="Middle"
                aria-label="Align middle"
              >
                <AlignVerticalCenterRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runAlignV("bottom");
                  setAlignOpen(false);
                }}
                title="Bottom"
                aria-label="Align bottom"
              >
                <AlignVerticalBottomRoundedIcon fontSize="small" />
              </button>
            </div>
          </div>
          <div className={styles.alignSection}>
            <div className={styles.alignSectionLabel}>Distribute</div>
            <div className={styles.alignRow}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runDistH();
                  setAlignOpen(false);
                }}
                disabled={!canDistribute}
                title="Distribute horizontally"
                aria-label="Distribute horizontally"
              >
                <ViewColumnRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runDistV();
                  setAlignOpen(false);
                }}
                disabled={!canDistribute}
                title="Distribute vertically"
                aria-label="Distribute vertically"
              >
                <ViewStreamRoundedIcon fontSize="small" />
              </button>
            </div>
          </div>
          <div className={styles.alignSection}>
            <div className={styles.alignSectionLabel}>Match size</div>
            <div className={styles.alignRow}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runMatchSize("width");
                  setAlignOpen(false);
                }}
                disabled={!canMatchSize}
                title="Match width"
                aria-label="Match width"
              >
                <SwapHorizRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runMatchSize("height");
                  setAlignOpen(false);
                }}
                disabled={!canMatchSize}
                title="Match height"
                aria-label="Match height"
              >
                <SwapVertRoundedIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  runMatchSize("both");
                  setAlignOpen(false);
                }}
                disabled={!canMatchSize}
                title="Match size"
                aria-label="Match size"
              >
                <AspectRatioRoundedIcon fontSize="small" />
              </button>
            </div>
          </div>
        </div>
      </Dropdown>

      <div className={styles.toolbarGroup}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => single && setElementZ(slide.id, targets[0].id, "front")}
          disabled={!single}
          title="Bring to front"
          aria-label="Bring to front"
        >
          <FlipToFrontRoundedIcon fontSize="small" />
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => single && setElementZ(slide.id, targets[0].id, "forward")}
          disabled={!single}
          title="Bring forward"
          aria-label="Bring forward"
        >
          <KeyboardArrowUpRoundedIcon fontSize="small" />
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => single && setElementZ(slide.id, targets[0].id, "backward")}
          disabled={!single}
          title="Send backward"
          aria-label="Send backward"
        >
          <KeyboardArrowDownRoundedIcon fontSize="small" />
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => single && setElementZ(slide.id, targets[0].id, "back")}
          disabled={!single}
          title="Send to back"
          aria-label="Send to back"
        >
          <FlipToBackRoundedIcon fontSize="small" />
        </button>
      </div>
    </>
  );
}
