"use client";

import { useRef, useState } from "react";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PostAddOutlinedIcon from "@mui/icons-material/PostAddOutlined";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import FormatPaintOutlinedIcon from "@mui/icons-material/FormatPaintOutlined";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import NorthWestRoundedIcon from "@mui/icons-material/NorthWestRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import InterestsOutlinedIcon from "@mui/icons-material/InterestsOutlined";
import HorizontalRuleRoundedIcon from "@mui/icons-material/HorizontalRuleRounded";
import RectangleOutlinedIcon from "@mui/icons-material/RectangleOutlined";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import ArrowRightAltRoundedIcon from "@mui/icons-material/ArrowRightAltRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
  useUndoState,
} from "../state/EditorContext";
import type {
  ChartElement,
  ChartKind,
  ImageElement,
  ShapeElement,
  ShapeKind,
  TableElement,
  TextElement,
} from "../model/types";
import { TextFormatPanel } from "./TextFormatPanel";
import { ShapeFormatPanel } from "./ShapeFormatPanel";
import { ImageFormatPanel } from "./ImageFormatPanel";
import { TableFormatPanel } from "./TableFormatPanel";
import { TableCellFormatPanel } from "./TableCellFormatPanel";
import { ChartFormatPanel } from "./ChartFormatPanel";
import { SelectionCommandsPanel } from "./SelectionCommandsPanel";
import { SizePositionPanel } from "./SizePositionPanel";
import { BackgroundPanel } from "./BackgroundPanel";
import { LayoutPicker } from "./LayoutPicker";
import { ThemePicker } from "./ThemePicker";
import { Dropdown } from "./FormatPanelPrimitives";
import { useInsertImage } from "../hooks/useInsertImage";
import { useInsertChart } from "../hooks/useInsertChart";
import styles from "../editor.module.css";

const SHAPE_OPTIONS: { kind: ShapeKind; label: string; Icon: React.ElementType }[] = [
  { kind: "rect", label: "Rectangle", Icon: RectangleOutlinedIcon },
  { kind: "ellipse", label: "Ellipse", Icon: CircleOutlinedIcon },
];

const LINE_OPTIONS: { kind: ShapeKind; label: string; Icon: React.ElementType }[] = [
  { kind: "line", label: "Line", Icon: HorizontalRuleRoundedIcon },
  { kind: "arrow", label: "Arrow", Icon: ArrowRightAltRoundedIcon },
];

const CHART_OPTIONS: { kind: ChartKind; label: string; Icon: React.ElementType }[] = [
  { kind: "bar", label: "Bar chart", Icon: BarChartOutlinedIcon },
  { kind: "pie", label: "Pie chart", Icon: PieChartOutlineOutlinedIcon },
];

export function Toolbar() {
  const { tool, zoom, selection, pendingShapeKind, editingElementId } = useEditorState();
  const { setTool, addSlide, undo, redo } = useEditorActions();
  const { canUndo, canRedo } = useUndoState();
  const slide = useActiveSlide();
  const insertImage = useInsertImage();
  const insertChart = useInsertChart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shapeOpen, setShapeOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);

  const selectedElements =
    slide && selection.slideId === slide.id
      ? selection.elementIds
          .map((id) => slide.elements.find((e) => e.id === id))
          .filter((e): e is NonNullable<typeof e> => e !== undefined)
      : [];
  const selectedTextElement: TextElement | null =
    selectedElements.length === 1 && selectedElements[0].type === "text"
      ? (selectedElements[0] as TextElement)
      : null;
  const selectedShapeElement: ShapeElement | null =
    selectedElements.length === 1 && selectedElements[0].type === "shape"
      ? (selectedElements[0] as ShapeElement)
      : null;
  const selectedImageElement: ImageElement | null =
    selectedElements.length === 1 && selectedElements[0].type === "image"
      ? (selectedElements[0] as ImageElement)
      : null;
  const selectedTableElement: TableElement | null =
    selectedElements.length === 1 && selectedElements[0].type === "table"
      ? (selectedElements[0] as TableElement)
      : null;
  const selectedChartElement: ChartElement | null =
    selectedElements.length === 1 && selectedElements[0].type === "chart"
      ? (selectedElements[0] as ChartElement)
      : null;
  const selectedIds = selectedElements.map((e) => e.id);

  const shapeToolActive = tool === "shape";
  const lineToolActive = tool === "line";
  const activeShapeIcon =
    shapeToolActive && pendingShapeKind === "ellipse"
      ? CircleOutlinedIcon
      : shapeToolActive && pendingShapeKind === "rect"
        ? RectangleOutlinedIcon
        : InterestsOutlinedIcon;
  const ShapeIcon = activeShapeIcon;
  const activeLineIcon =
    lineToolActive && pendingShapeKind === "arrow"
      ? ArrowRightAltRoundedIcon
      : HorizontalRuleRoundedIcon;
  const LineIcon = activeLineIcon;

  return (
    <div className={styles.toolbarWrap}>
      <div className={styles.toolbar}>
        <button className={styles.toolbarButton} aria-label="Search the menus">
          <SearchRoundedIcon fontSize="small" />
        </button>
        <button
          className={styles.toolbarButton}
          aria-label="New slide"
          title="New slide"
          onClick={addSlide}
        >
          <AddRoundedIcon fontSize="small" />
        </button>
        <button className={styles.toolbarButton} aria-label="Insert with AI">
          <PostAddOutlinedIcon fontSize="small" />
        </button>

        <span className={styles.toolbarDivider} />

        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            aria-label="Undo"
            title="Undo"
            onClick={undo}
            disabled={!canUndo}
          >
            <UndoRoundedIcon fontSize="small" />
          </button>
          <button
            className={styles.toolbarButton}
            aria-label="Redo"
            title="Redo"
            onClick={redo}
            disabled={!canRedo}
          >
            <RedoRoundedIcon fontSize="small" />
          </button>
        </div>

        <button className={styles.toolbarButton} aria-label="Print">
          <PrintOutlinedIcon fontSize="small" />
        </button>
        <button className={styles.toolbarButton} aria-label="Paint format">
          <FormatPaintOutlinedIcon fontSize="small" />
        </button>
        <button className={styles.toolbarButton} aria-label="Zoom">
          <ZoomInRoundedIcon fontSize="small" />
        </button>

        <button type="button" className={styles.zoomPill} aria-label="Zoom level">
          <span>{zoom === "fit" ? "Fit" : `${zoom}%`}</span>
          <ArrowDropDownRoundedIcon fontSize="small" />
        </button>

        <span className={styles.toolbarDivider} />

        <div className={styles.toolbarGroup}>
          <button
            className={`${styles.toolbarButton} ${tool === "select" ? styles.toolbarButtonActive : ""}`}
            onClick={() => setTool("select", null)}
            aria-pressed={tool === "select"}
            aria-label="Select"
            title="Select"
          >
            <NorthWestRoundedIcon fontSize="small" />
          </button>
          <button
            className={`${styles.toolbarButton} ${tool === "text" ? styles.toolbarButtonActive : ""}`}
            onClick={() => setTool("text", null)}
            aria-pressed={tool === "text"}
            aria-label="Text box"
            title="Text box"
          >
            <TextFieldsRoundedIcon fontSize="small" />
          </button>

          <Dropdown
            open={shapeOpen}
            onOpen={() => setShapeOpen(true)}
            onClose={() => setShapeOpen(false)}
            trigger={
              <button
                className={`${styles.toolbarButton} ${shapeToolActive ? styles.toolbarButtonActive : ""}`}
                aria-pressed={shapeToolActive}
                aria-label="Shape"
                title="Shape"
              >
                <ShapeIcon fontSize="small" />
                <ArrowDropDownRoundedIcon fontSize="small" />
              </button>
            }
          >
            <div className={styles.popover} style={{ minWidth: 140 }}>
              {SHAPE_OPTIONS.map(({ kind, label, Icon }) => (
                <button
                  key={kind}
                  type="button"
                  className={styles.popoverItem}
                  onClick={() => {
                    setTool("shape", kind);
                    setShapeOpen(false);
                  }}
                >
                  <span className={styles.popoverItemRow}>
                    <Icon fontSize="small" />
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Dropdown>

          <Dropdown
            open={lineOpen}
            onOpen={() => setLineOpen(true)}
            onClose={() => setLineOpen(false)}
            trigger={
              <button
                className={`${styles.toolbarButton} ${lineToolActive ? styles.toolbarButtonActive : ""}`}
                aria-pressed={lineToolActive}
                aria-label="Line"
                title="Line"
              >
                <LineIcon fontSize="small" />
                <ArrowDropDownRoundedIcon fontSize="small" />
              </button>
            }
          >
            <div className={styles.popover} style={{ minWidth: 140 }}>
              {LINE_OPTIONS.map(({ kind, label, Icon }) => (
                <button
                  key={kind}
                  type="button"
                  className={styles.popoverItem}
                  onClick={() => {
                    setTool("line", kind);
                    setLineOpen(false);
                  }}
                >
                  <span className={styles.popoverItemRow}>
                    <Icon fontSize="small" />
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Dropdown>

          <button
            type="button"
            className={styles.toolbarButton}
            aria-label="Insert image"
            title="Insert image"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageOutlinedIcon fontSize="small" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) insertImage(file);
              e.target.value = "";
            }}
          />

          <Dropdown
            open={chartOpen}
            onOpen={() => setChartOpen(true)}
            onClose={() => setChartOpen(false)}
            trigger={
              <button
                className={styles.toolbarButton}
                aria-label="Insert chart"
                title="Insert chart"
              >
                <InsertChartOutlinedIcon fontSize="small" />
                <ArrowDropDownRoundedIcon fontSize="small" />
              </button>
            }
          >
            <div className={styles.popover} style={{ minWidth: 160 }}>
              {CHART_OPTIONS.map(({ kind, label, Icon }) => (
                <button
                  key={kind}
                  type="button"
                  className={styles.popoverItem}
                  onClick={() => {
                    insertChart(kind);
                    setChartOpen(false);
                  }}
                >
                  <span className={styles.popoverItemRow}>
                    <Icon fontSize="small" />
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Dropdown>
        </div>

        <button className={styles.toolbarButton} aria-label="Add comment">
          <AddCommentOutlinedIcon fontSize="small" />
        </button>

        <span className={styles.toolbarDivider} />

        {selectedTextElement ? (
          <>
            <TextFormatPanel element={selectedTextElement} />
            <span className={styles.toolbarDivider} />
            <SizePositionPanel element={selectedTextElement} />
            <SelectionCommandsPanel selectedIds={selectedIds} />
          </>
        ) : selectedShapeElement ? (
          <>
            <ShapeFormatPanel element={selectedShapeElement} />
            <span className={styles.toolbarDivider} />
            <SizePositionPanel element={selectedShapeElement} />
            <SelectionCommandsPanel selectedIds={selectedIds} />
          </>
        ) : selectedImageElement ? (
          <>
            <ImageFormatPanel element={selectedImageElement} />
            <span className={styles.toolbarDivider} />
            <SelectionCommandsPanel selectedIds={selectedIds} />
          </>
        ) : selectedTableElement ? (
          <>
            <TableFormatPanel element={selectedTableElement} />
            {editingElementId === selectedTableElement.id && (
              <>
                <span className={styles.toolbarDivider} />
                <TableCellFormatPanel />
              </>
            )}
            <span className={styles.toolbarDivider} />
            <SizePositionPanel element={selectedTableElement} />
            <SelectionCommandsPanel selectedIds={selectedIds} />
          </>
        ) : selectedChartElement ? (
          <>
            <ChartFormatPanel element={selectedChartElement} />
            <span className={styles.toolbarDivider} />
            <SizePositionPanel element={selectedChartElement} />
            <SelectionCommandsPanel selectedIds={selectedIds} />
          </>
        ) : selectedIds.length > 1 ? (
          <SelectionCommandsPanel selectedIds={selectedIds} />
        ) : (
          <>
            <BackgroundPanel />
            <span className={styles.toolbarDivider} />

            <LayoutPicker />
            <span className={styles.toolbarDivider} />

            <ThemePicker />
            <span className={styles.toolbarDivider} />

            <button className={styles.toolbarButton}>Transition</button>
          </>
        )}

        <div className={styles.toolbarSpacer} />

        <button className={styles.toolbarButton} aria-label="Cursor options">
          <NorthWestRoundedIcon fontSize="small" />
          <ArrowDropDownRoundedIcon fontSize="small" />
        </button>
        <button className={styles.toolbarButton} aria-label="Collapse toolbar">
          <ExpandLessRoundedIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
}
