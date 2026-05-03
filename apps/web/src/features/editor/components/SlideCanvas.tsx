"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Moveable from "react-moveable";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ImageSearchOutlinedIcon from "@mui/icons-material/ImageSearchOutlined";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import OndemandVideoOutlinedIcon from "@mui/icons-material/OndemandVideoOutlined";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import {
  useActiveEditor,
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import { SlideRenderer } from "./SlideRenderer";
import { ContextMenu } from "./ContextMenu";
import { useElementContextMenu } from "../hooks/useElementContextMenu";
import { ImageCropOverlay } from "./ImageCropOverlay";
import { useInsertImage } from "../hooks/useInsertImage";
import type {
  ElementId,
  ImageElement,
  ShapeKind,
  SlideElement,
  TextElement,
} from "../model/types";
import {
  CommentComposerPopup,
  SlideCommentsRail,
} from "../comments";
import commentStyles from "../comments/comments.module.css";
import styles from "../editor.module.css";
import { tableMinSize } from "../utils/tableDims";
import { clampToSlide } from "../geometry/align";

const RULER_THICKNESS = 20;
const UNITS = 10;
// Right reserved space for the floating right rail. Must match the
// padding-right values on .canvasArea / .canvasScroll in editor.module.css.
const RIGHT_RAIL_RESERVE = 72;
// Extra right reserve when the comment composer is open so the 320px
// popup + gap fits without overflow and the slide visibly shifts left.
const COMMENT_COMPOSER_RESERVE = 360;

type RulerProps = {
  orientation: "horizontal" | "vertical";
  pageStart: number;
  pageSize: number;
  scale: number;
  viewportSize: number;
  offset: number;
  rightReserve?: number;
};

function Ruler({
  orientation,
  pageStart,
  pageSize,
  scale,
  viewportSize,
  offset,
  rightReserve = RIGHT_RAIL_RESERVE,
}: RulerProps) {
  const isH = orientation === "horizontal";
  const labels = Array.from({ length: UNITS - 1 }, (_, i) => i + 1);
  const minorPerMajor = 5;
  const minorTicks: number[] = [];
  for (let i = 1; i < UNITS * minorPerMajor; i++) {
    if (i % minorPerMajor !== 0) minorTicks.push(i);
  }

  const containerStyle: CSSProperties = isH
    ? {
        position: "absolute",
        top: 0,
        left: offset,
        right: rightReserve,
        height: RULER_THICKNESS,
        background: "#f9fafd",
        zIndex: 3,
        pointerEvents: "none",
        overflow: "hidden",
      }
    : {
        position: "absolute",
        top: offset,
        left: 0,
        bottom: 0,
        width: RULER_THICKNESS,
        background: "#f9fafd",
        zIndex: 3,
        pointerEvents: "none",
        overflow: "hidden",
      };

  const scaledSize = pageSize * scale;

  const baselineStyle: CSSProperties = isH
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 1,
        background: "rgba(60, 64, 67, 0.35)",
      }
    : {
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: 1,
        background: "rgba(60, 64, 67, 0.35)",
      };

  return (
    <div aria-hidden style={containerStyle}>
      <span style={baselineStyle} />
      {minorTicks.map((i) => {
        const pos = pageStart + (i / (UNITS * minorPerMajor)) * scaledSize;
        const isHalf = i % minorPerMajor === Math.floor(minorPerMajor / 2);
        const len = isHalf ? 6 : 4;
        return (
          <span
            key={`m-${i}`}
            style={
              isH
                ? {
                    position: "absolute",
                    left: pos,
                    bottom: 0,
                    width: 1,
                    height: len,
                    background: "rgba(60, 64, 67, 0.28)",
                  }
                : {
                    position: "absolute",
                    top: pos,
                    right: 0,
                    height: 1,
                    width: len,
                    background: "rgba(60, 64, 67, 0.28)",
                  }
            }
          />
        );
      })}
      {labels.map((t) => {
        const pos = pageStart + (t / UNITS) * scaledSize;
        if (pos < 0 || pos > viewportSize) return null;
        return (
          <span
            key={`tick-${t}`}
            style={
              isH
                ? {
                    position: "absolute",
                    left: pos,
                    bottom: 0,
                    width: 1,
                    height: 8,
                    background: "rgba(60, 64, 67, 0.45)",
                  }
                : {
                    position: "absolute",
                    top: pos,
                    right: 0,
                    height: 1,
                    width: 8,
                    background: "rgba(60, 64, 67, 0.45)",
                  }
            }
          />
        );
      })}
      {labels.map((t) => {
        const pos = pageStart + (t / UNITS) * scaledSize;
        if (pos < 0 || pos > viewportSize) return null;
        return (
          <span
            key={`l-${t}`}
            style={
              isH
                ? {
                    position: "absolute",
                    left: pos + 3,
                    top: 2,
                    fontSize: 10,
                    color: "rgba(60, 64, 67, 0.55)",
                    lineHeight: 1,
                  }
                : {
                    position: "absolute",
                    top: pos + 3,
                    left: 2,
                    fontSize: 10,
                    color: "rgba(60, 64, 67, 0.55)",
                    lineHeight: 1,
                  }
            }
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}

function RightRail() {
  return (
    <aside className={styles.rightRail} aria-label="Sidebar tools">
      <div className={styles.rightRailPill}>
        <button type="button" className={styles.railIconButton} aria-label="Layout picker">
          <GridViewOutlinedIcon sx={{ fontSize: 22 }} />
        </button>
        <button type="button" className={styles.railIconButton} aria-label="Layers">
          <LayersOutlinedIcon sx={{ fontSize: 22 }} />
        </button>
        <button type="button" className={styles.railIconButton} aria-label="Image search">
          <ImageSearchOutlinedIcon sx={{ fontSize: 22 }} />
        </button>
        <button type="button" className={styles.railIconButton} aria-label="Files">
          <FolderOpenRoundedIcon sx={{ fontSize: 22 }} />
        </button>
      </div>
      <button type="button" className={styles.railCircleButton} aria-label="Media and AI">
        <span className={styles.railCircleInner}>
          <OndemandVideoOutlinedIcon sx={{ fontSize: 22 }} />
          <AutoAwesomeRoundedIcon
            sx={{ fontSize: 12, position: "absolute", top: -2, right: -4 }}
            className={styles.railCircleSparkle}
          />
        </span>
      </button>
    </aside>
  );
}

type ElementInitialState = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

export function SlideCanvas() {
  const {
    deck,
    zoom,
    selection,
    tool,
    pendingShapeKind,
    editingElementId,
    croppingElementId,
    commentComposer,
    commentsPanelOpen,
    readOnly,
  } = useEditorState();
  const slide = useActiveSlide();
  const {
    selectElements,
    updateElement,
    updateElements,
    addElement,
    deleteElement,
    setElementZ,
    setTool,
    setZoom,
    startEditing,
    stopEditing,
    startCropping,
    stopCropping,
    insertTableRow,
    insertTableColumn,
    deleteTableRow,
    deleteTableColumn,
  } = useEditorActions();
  const insertImage = useInsertImage();

  const areaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const [fitScale, setFitScale] = useState(1);
  const [slideEl, setSlideEl] = useState<HTMLDivElement | null>(null);
  const [slideRect, setSlideRect] = useState({ left: 0, top: 0 });
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 });
  const [drawingPreview, setDrawingPreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    kind: ShapeKind;
  } | null>(null);
  const drawingRef = useRef<{ cleanup: () => void } | null>(null);
  useEffect(() => () => drawingRef.current?.cleanup(), []);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { pageWidth, pageHeight } = deck.meta;

  const selectedIds = slide && selection.slideId === slide.id ? selection.elementIds : [];
  const selectedElements = slide
    ? slide.elements.filter((el) => selectedIds.includes(el.id))
    : [];
  const activeEditor = useActiveEditor();
  const contextMenuItems = useElementContextMenu(
    slide?.id ?? null,
    selectedElements,
    deck.meta,
    {
      addElement,
      updateElement,
      deleteElement,
      setElementZ,
      selectElements,
      insertTableRow,
      insertTableColumn,
      deleteTableRow,
      deleteTableColumn,
    },
    activeEditor,
  );

  const isComposingHere =
    !!slide && commentComposer?.slideId === slide.id;
  const slideHasUnresolvedComments =
    !!slide &&
    !!deck.comments?.some((c) => c.slideId === slide.id && !c.resolvedAt);
  const showCanvasComments = !commentsPanelOpen;
  const needsCommentReserve =
    isComposingHere || (showCanvasComments && slideHasUnresolvedComments);
  const composerReserve = needsCommentReserve ? COMMENT_COMPOSER_RESERVE : 0;

  useLayoutEffect(() => {
    function compute() {
      const el = areaRef.current;
      if (!el) return;
      const availableW =
        el.clientWidth - RULER_THICKNESS - 64 - composerReserve;
      const availableH = el.clientHeight - RULER_THICKNESS - 64;
      const s = Math.min(availableW / pageWidth, availableH / pageHeight, 1.5);
      setFitScale(Math.max(0.2, s));
    }
    compute();
    const ro = new ResizeObserver(compute);
    if (areaRef.current) ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, [pageWidth, pageHeight, composerReserve]);

  const scale = zoom === "fit" ? fitScale : zoom / 100;

  // Non-passive wheel listener so we can preventDefault on Ctrl/Cmd+wheel
  // (browsers force React's onWheel to passive). Anchors zoom at the cursor
  // by adjusting scrollLeft/Top so the point under the pointer stays put.
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const currentScale = zoom === "fit" ? fitScale : zoom / 100;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextScale = Math.min(4, Math.max(0.1, currentScale * factor));
      const nextZoom = Math.round(nextScale * 100);
      const rect = scroll.getBoundingClientRect();
      const px = e.clientX - rect.left + scroll.scrollLeft;
      const py = e.clientY - rect.top + scroll.scrollTop;
      const ratio = nextScale / currentScale;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        scroll.scrollLeft = px * ratio - (e.clientX - rect.left);
        scroll.scrollTop = py * ratio - (e.clientY - rect.top);
      });
    };
    scroll.addEventListener("wheel", handler, { passive: false });
    return () => scroll.removeEventListener("wheel", handler);
  }, [zoom, fitScale, setZoom]);

  useLayoutEffect(() => {
    function track() {
      const area = areaRef.current;
      if (!area || !slideEl) return;
      const a = area.getBoundingClientRect();
      const s = slideEl.getBoundingClientRect();
      setSlideRect({ left: s.left - a.left, top: s.top - a.top });
      setAreaSize({ w: area.clientWidth, h: area.clientHeight });
    }
    track();
    const area = areaRef.current;
    const scroll = scrollRef.current;
    const ro = new ResizeObserver(track);
    if (area) ro.observe(area);
    if (slideEl) ro.observe(slideEl);
    scroll?.addEventListener("scroll", track);
    return () => {
      ro.disconnect();
      scroll?.removeEventListener("scroll", track);
    };
  }, [slideEl, scale, pageWidth, pageHeight]);

  // Targets are derived from the DOM, so we must re-query AFTER commit. A
  // useMemo here runs during render — before React attaches newly-created
  // elements — which is why Moveable would miss freshly-drawn shapes until
  // the next selection change. Keying on slide.elements + croppingElementId
  // ensures we re-query when elements mount/unmount (cropping hides an
  // element via hiddenElementIds so we need to re-bind when it returns).
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const slideElementsKey = slide?.elements.map((e) => e.id).join(",") ?? "";
  useLayoutEffect(() => {
    if (!slideEl || selectedIds.length === 0) {
      setTargets((prev) => (prev.length ? [] : prev));
      return;
    }
    const next = selectedIds
      .map((id) => slideEl.querySelector<HTMLElement>(`[data-element-id="${id}"]`))
      .filter((el): el is HTMLElement => el !== null);
    setTargets((prev) => {
      if (prev.length !== next.length) return next;
      for (let i = 0; i < prev.length; i++) if (prev[i] !== next[i]) return next;
      return prev;
    });
  }, [slideEl, selectedIds, slideElementsKey, croppingElementId]);

  // Signature of currently-selected elements' geometry. Whenever the persisted
  // position/size/rotation of a selected element changes (e.g. after a drag or
  // resize is committed), this string changes, and we force Moveable to
  // re-measure its targets so the control box tracks the element.
  const selectedGeometrySignature = useMemo(() => {
    if (!slide) return "";
    return selectedIds
      .map((id) => {
        const el = slide.elements.find((e) => e.id === id);
        return el
          ? `${el.id}:${el.x},${el.y},${el.w},${el.h},${el.rotation ?? 0}`
          : `${id}:missing`;
      })
      .join("|");
  }, [slide, selectedIds]);

  useLayoutEffect(() => {
    moveableRef.current?.updateRect();
    // Depend on targets too, since re-selection changes which elements are
    // being tracked, and on scale because zoom changes affect layout.
  }, [selectedGeometrySignature, targets, scale]);

  const guidelineElements = useMemo(() => {
    if (!slideEl || !slide) return [] as HTMLElement[];
    const selectedSet = new Set(selectedIds);
    return slide.elements
      .filter((el) => !selectedSet.has(el.id))
      .map((el) =>
        slideEl.querySelector<HTMLElement>(`[data-element-id="${el.id}"]`),
      )
      .filter((el): el is HTMLElement => el !== null);
  }, [slideEl, slide, selectedIds]);

  const initialStateRef = useRef<Map<ElementId, ElementInitialState>>(new Map());

  const captureInitialState = useCallback(() => {
    if (!slide) return;
    const map = new Map<ElementId, ElementInitialState>();
    for (const id of selectedIds) {
      const el = slide.elements.find((e) => e.id === id);
      if (el) {
        map.set(id, {
          x: el.x,
          y: el.y,
          w: el.w,
          h: el.h,
          rotation: el.rotation ?? 0,
        });
      }
    }
    initialStateRef.current = map;
  }, [slide, selectedIds]);

  const handleElementMouseDown = useCallback(
    (e: ReactMouseEvent, elementId: ElementId) => {
      if (!slide) return;
      e.stopPropagation();
      const multi = e.shiftKey || e.metaKey;
      const already = selectedIds.includes(elementId);
      let nextIds: ElementId[];
      if (multi) {
        nextIds = already
          ? selectedIds.filter((id) => id !== elementId)
          : [...selectedIds, elementId];
      } else {
        nextIds = already ? selectedIds : [elementId];
      }
      selectElements(slide.id, nextIds);
    },
    [slide, selectedIds, selectElements],
  );

  const handleElementContextMenu = useCallback(
    (e: ReactMouseEvent, elementId: ElementId) => {
      if (!slide) return;
      e.preventDefault();
      e.stopPropagation();
      if (!selectedIds.includes(elementId)) {
        selectElements(slide.id, [elementId]);
      }
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [slide, selectedIds, selectElements],
  );

  const handleImageDoubleClick = useCallback(
    (e: ReactMouseEvent, elementId: ElementId) => {
      if (!slide) return;
      e.stopPropagation();
      startCropping(elementId);
    },
    [slide, startCropping],
  );

  const pageCoordsFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!slideEl) return null;
      const rect = slideEl.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [slideEl, scale],
  );

  const handleCanvasDragOver = useCallback((e: ReactDragEvent) => {
    if (Array.from(e.dataTransfer.items).some((i) => i.kind === "file")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleCanvasDrop = useCallback(
    (e: ReactDragEvent) => {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      e.preventDefault();
      const point = pageCoordsFromClient(e.clientX, e.clientY);
      for (const file of files) {
        insertImage(file, point);
      }
    },
    [insertImage, pageCoordsFromClient],
  );

  // Clipboard paste — native `paste` event at the window level. Skip when a
  // text element is being edited so Tiptap's own paste handler wins for
  // text/HTML paste inside a text box. Images pasted outside editing go to
  // the slide canvas.
  useEffect(() => {
    if (readOnly) return;
    const onPaste = (e: ClipboardEvent) => {
      if (editingElementId) return;
      if (!e.clipboardData) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find(
        (i) => i.kind === "file" && i.type.startsWith("image/"),
      );
      if (!imageItem) return;
      const blob = imageItem.getAsFile();
      if (!blob) return;
      e.preventDefault();
      insertImage(blob);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editingElementId, insertImage, readOnly]);

  const handleBackgroundMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (!slide) return;
      if (editingElementId) {
        stopEditing();
      }
      if (tool === "text") {
        e.preventDefault();
        const bgRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const capturedScale = scale;
        const toPage = (clientX: number, clientY: number) => ({
          x: (clientX - bgRect.left) / capturedScale,
          y: (clientY - bgRect.top) / capturedScale,
        });
        const start = toPage(e.clientX, e.clientY);
        const slideId = slide.id;
        const existingZ = slide.elements.length
          ? Math.max(...slide.elements.map((el) => el.z))
          : 0;

        setDrawingPreview({ x: start.x, y: start.y, w: 0, h: 0, kind: "rect" });

        const onMove = (ev: MouseEvent) => {
          const cur = toPage(ev.clientX, ev.clientY);
          setDrawingPreview({
            x: Math.min(start.x, cur.x),
            y: Math.min(start.y, cur.y),
            w: Math.abs(cur.x - start.x),
            h: Math.abs(cur.y - start.y),
            kind: "rect",
          });
        };

        const onUp = (ev: MouseEvent) => {
          drawingRef.current?.cleanup();
          drawingRef.current = null;
          setDrawingPreview(null);

          const cur = toPage(ev.clientX, ev.clientY);
          const dx = cur.x - start.x;
          const dy = cur.y - start.y;
          const dragDist = Math.hypot(dx, dy);
          const defaultW = 240;
          const defaultH = 60;

          let geom: { x: number; y: number; w: number; h: number };
          if (dragDist < 4) {
            geom = {
              x: Math.max(0, Math.round(start.x - defaultW / 2)),
              y: Math.max(0, Math.round(start.y - defaultH / 2)),
              w: defaultW,
              h: defaultH,
            };
          } else {
            geom = {
              x: Math.round(Math.max(0, Math.min(start.x, cur.x))),
              y: Math.round(Math.max(0, Math.min(start.y, cur.y))),
              w: Math.round(Math.max(40, Math.abs(dx))),
              h: Math.round(Math.max(24, Math.abs(dy))),
            };
          }

          const el: TextElement = {
            id: `el-${crypto.randomUUID().slice(0, 8)}`,
            ...geom,
            z: existingZ + 1,
            type: "text",
            text: {
              align: "left",
              fontSize: 18,
              color: "theme.body",
              fontFamily: "theme.body",
              placeholder: "Click to add text",
            },
          };

          addElement(slideId, el);
          setTool("select", null);
          startEditing(el.id);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        drawingRef.current = {
          cleanup: () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          },
        };
        return;
      }
      if (tool === "shape" || tool === "line") {
        e.preventDefault();
        const kind: ShapeKind =
          pendingShapeKind ?? (tool === "shape" ? "rect" : "line");
        const isLinear = kind === "line" || kind === "arrow";
        const bgRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const capturedScale = scale;
        const toPage = (clientX: number, clientY: number) => ({
          x: (clientX - bgRect.left) / capturedScale,
          y: (clientY - bgRect.top) / capturedScale,
        });
        const start = toPage(e.clientX, e.clientY);
        const slideId = slide.id;
        const existingZ = slide.elements.length
          ? Math.max(...slide.elements.map((el) => el.z))
          : 0;

        setDrawingPreview({ x: start.x, y: start.y, w: 0, h: 0, kind });

        const onMove = (ev: MouseEvent) => {
          const cur = toPage(ev.clientX, ev.clientY);
          setDrawingPreview({
            x: Math.min(start.x, cur.x),
            y: Math.min(start.y, cur.y),
            w: Math.abs(cur.x - start.x),
            h: Math.abs(cur.y - start.y),
            kind,
          });
        };

        const onUp = (ev: MouseEvent) => {
          drawingRef.current?.cleanup();
          drawingRef.current = null;
          setDrawingPreview(null);

          const cur = toPage(ev.clientX, ev.clientY);
          const dx = cur.x - start.x;
          const dy = cur.y - start.y;
          const dragDist = Math.hypot(dx, dy);
          const base = {
            id: `el-${crypto.randomUUID().slice(0, 8)}`,
            z: existingZ + 1,
          };

          let el: SlideElement;
          if (dragDist < 4) {
            const defaultW = isLinear ? 160 : 120;
            const defaultH = kind === "arrow" ? 24 : isLinear ? 2 : 80;
            const geom = {
              x: Math.max(0, Math.round(start.x - defaultW / 2)),
              y: Math.max(0, Math.round(start.y - defaultH / 2)),
              w: defaultW,
              h: defaultH,
            };
            el = isLinear
              ? {
                  ...base,
                  ...geom,
                  type: "shape",
                  shape: kind,
                  stroke: "theme.body",
                  strokeWidth: 2,
                }
              : {
                  ...base,
                  ...geom,
                  type: "shape",
                  shape: kind,
                  fill: "theme.accentSoft",
                  text: {
                    align: "center",
                    fontSize: 16,
                    color: "theme.body",
                    fontFamily: "theme.body",
                    placeholder: "Add text",
                  },
                };
          } else if (isLinear) {
            const length = dragDist;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const strokeH = kind === "arrow" ? 24 : 2;
            const midX = (start.x + cur.x) / 2;
            const midY = (start.y + cur.y) / 2;
            el = {
              ...base,
              x: Math.round(midX - length / 2),
              y: Math.round(midY - strokeH / 2),
              w: Math.round(length),
              h: strokeH,
              rotation: Math.round(angle),
              type: "shape",
              shape: kind,
              stroke: "theme.body",
              strokeWidth: 2,
            };
          } else {
            el = {
              ...base,
              x: Math.round(Math.max(0, Math.min(start.x, cur.x))),
              y: Math.round(Math.max(0, Math.min(start.y, cur.y))),
              w: Math.round(Math.max(4, Math.abs(dx))),
              h: Math.round(Math.max(4, Math.abs(dy))),
              type: "shape",
              shape: kind,
              fill: "theme.accentSoft",
              text: {
                align: "center",
                fontSize: 16,
                color: "theme.body",
                fontFamily: "theme.body",
                placeholder: "Add text",
              },
            };
          }

          addElement(slideId, el);
          setTool("select", null);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        drawingRef.current = {
          cleanup: () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          },
        };
        return;
      }
      if (selectedIds.length) selectElements(slide.id, []);
    },
    [
      slide,
      tool,
      pendingShapeKind,
      scale,
      selectedIds.length,
      addElement,
      setTool,
      selectElements,
      editingElementId,
      stopEditing,
      startEditing,
    ],
  );

  const areaWidth = areaSize.w;
  const areaHeight = areaSize.h;

  const croppingElement: ImageElement | null =
    slide && croppingElementId
      ? ((slide.elements.find(
          (el) => el.id === croppingElementId && el.type === "image",
        ) ?? null) as ImageElement | null)
      : null;

  return (
    <div
      ref={areaRef}
      className={styles.canvasArea}
      onDragOver={readOnly ? undefined : handleCanvasDragOver}
      onDrop={readOnly ? undefined : handleCanvasDrop}
      style={
        composerReserve
          ? { paddingRight: RIGHT_RAIL_RESERVE + composerReserve }
          : undefined
      }
    >
      <div
        ref={scrollRef}
        className={styles.canvasScroll}
        style={
          composerReserve
            ? { right: RIGHT_RAIL_RESERVE + composerReserve }
            : undefined
        }
      >
      <div className={styles.canvasInner}>
        <div
          ref={setSlideEl}
          className={`${styles.slide}${
            slide && commentComposer?.slideId === slide.id
              ? ` ${commentStyles.slideCommentingOutline}`
              : ""
          }`}
          style={{
            width: pageWidth * scale,
            height: pageHeight * scale,
            cursor:
              tool === "shape" || tool === "line"
                ? "crosshair"
                : tool === "text"
                  ? "text"
                  : undefined,
          }}
        >
          <div
            style={{
              width: pageWidth,
              height: pageHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
          {slide ? (
            <SlideRenderer
              slide={slide}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              themeId={deck.meta.themeId}
              master={deck.meta.master}
              slideNumber={deck.slides.findIndex((s) => s.id === slide.id) + 1}
              selectedIds={readOnly ? [] : selectedIds}
              editingElementId={editingElementId}
              hiddenElementIds={croppingElementId ? [croppingElementId] : undefined}
              onElementMouseDown={readOnly ? undefined : handleElementMouseDown}
              onBackgroundMouseDown={
                readOnly ? undefined : handleBackgroundMouseDown
              }
              onStartEditing={readOnly ? undefined : startEditing}
              onImageDoubleClick={readOnly ? undefined : handleImageDoubleClick}
              onElementContextMenu={
                readOnly ? undefined : handleElementContextMenu
              }
            />
          ) : null}
          {croppingElement ? (
            <ImageCropOverlay
              element={croppingElement}
              scale={scale}
              onCommit={({ x, y, w, h, crop }) => {
                if (!slide) return;
                updateElement(slide.id, croppingElement.id, { x, y, w, h, crop });
                stopCropping();
              }}
              onCancel={() => stopCropping()}
            />
          ) : null}
          {drawingPreview ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: drawingPreview.x,
                top: drawingPreview.y,
                width: Math.max(1, drawingPreview.w),
                height: Math.max(1, drawingPreview.h),
                border: "1px dashed #1a73e8",
                background: "rgba(26, 115, 232, 0.08)",
                borderRadius:
                  drawingPreview.kind === "ellipse" ? "50%" : undefined,
                pointerEvents: "none",
              }}
            />
          ) : null}
          {!readOnly && slide && targets.length > 0 && !editingElementId && !croppingElementId ? (
            <Moveable
              ref={moveableRef}
              target={targets.length === 1 ? targets[0] : targets}
              zoom={scale}
              draggable
              resizable
              rotatable
              throttleDrag={0}
              throttleResize={0}
              throttleRotate={0}
              keepRatio={false}
              origin={false}
              renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
              snappable
              snapThreshold={6}
              snapGap={false}
              isDisplaySnapDigit={false}
              snapDirections={{
                top: true,
                left: true,
                bottom: true,
                right: true,
                center: true,
                middle: true,
              }}
              elementSnapDirections={{
                top: true,
                left: true,
                bottom: true,
                right: true,
                center: true,
                middle: true,
              }}
              snapContainer={slideEl ?? undefined}
              verticalGuidelines={[0, pageWidth / 2, pageWidth]}
              horizontalGuidelines={[0, pageHeight / 2, pageHeight]}
              elementGuidelines={guidelineElements}
              onDragStart={captureInitialState}
              onDrag={({ target, beforeTranslate }) => {
                const id = (target as HTMLElement).dataset.elementId as ElementId;
                const init = initialStateRef.current.get(id);
                const rot = init?.rotation ?? 0;
                target.style.transform = `translate(${beforeTranslate[0]}px, ${beforeTranslate[1]}px)${
                  rot ? ` rotate(${rot}deg)` : ""
                }`;
              }}
              onDragEnd={({ target, lastEvent }) => {
                target.style.transform = "";
                if (!slide || !lastEvent) return;
                const id = (target as HTMLElement).dataset.elementId as ElementId;
                const init = initialStateRef.current.get(id);
                if (!init) return;
                const [dx, dy] = lastEvent.beforeTranslate as [number, number];
                const clamped = clampToSlide(
                  { x: init.x + dx, y: init.y + dy, w: init.w, h: init.h },
                  { pageWidth, pageHeight },
                );
                updateElement(slide.id, id, { x: clamped.x, y: clamped.y });
              }}
              onDragGroupStart={captureInitialState}
              onDragGroup={({ events }) => {
                for (const ev of events) {
                  const id = (ev.target as HTMLElement).dataset
                    .elementId as ElementId;
                  const rot = initialStateRef.current.get(id)?.rotation ?? 0;
                  ev.target.style.transform = `translate(${ev.beforeTranslate[0]}px, ${ev.beforeTranslate[1]}px)${
                    rot ? ` rotate(${rot}deg)` : ""
                  }`;
                }
              }}
              onDragGroupEnd={({ targets: groupTargets, events }) => {
                if (!slide) return;
                const updates: Array<{
                  id: ElementId;
                  patch: { x: number; y: number };
                }> = [];
                groupTargets.forEach((t, i) => {
                  const ev = events[i]?.lastEvent;
                  t.style.transform = "";
                  if (!ev) return;
                  const id = (t as HTMLElement).dataset.elementId as ElementId;
                  const init = initialStateRef.current.get(id);
                  if (!init) return;
                  const [dx, dy] = ev.beforeTranslate as [number, number];
                  const clamped = clampToSlide(
                    { x: init.x + dx, y: init.y + dy, w: init.w, h: init.h },
                    { pageWidth, pageHeight },
                  );
                  updates.push({
                    id,
                    patch: { x: clamped.x, y: clamped.y },
                  });
                });
                updateElements(slide.id, updates);
              }}
              onResizeStart={captureInitialState}
              onResize={({ target, width, height, drag }) => {
                const id = (target as HTMLElement).dataset.elementId as ElementId;
                const rot = initialStateRef.current.get(id)?.rotation ?? 0;
                let w = width;
                let h = height;
                const el = slide?.elements.find((e) => e.id === id);
                if (el?.type === "table") {
                  const { minW, minH } = tableMinSize(el);
                  if (minW > 0) w = Math.max(w, minW);
                  if (minH > 0) h = Math.max(h, minH);
                }
                target.style.width = `${w}px`;
                target.style.height = `${h}px`;
                target.style.transform = `translate(${drag.beforeTranslate[0]}px, ${drag.beforeTranslate[1]}px)${
                  rot ? ` rotate(${rot}deg)` : ""
                }`;
              }}
              onResizeEnd={({ target, lastEvent }) => {
                target.style.transform = "";
                if (!slide || !lastEvent) return;
                const id = (target as HTMLElement).dataset.elementId as ElementId;
                const init = initialStateRef.current.get(id);
                if (!init) return;
                let w = Math.round(lastEvent.width);
                let h = Math.round(lastEvent.height);
                const el = slide.elements.find((e) => e.id === id);
                if (el?.type === "table") {
                  const { minW, minH } = tableMinSize(el);
                  if (minW > 0) w = Math.max(w, minW);
                  if (minH > 0) h = Math.max(h, minH);
                }
                const [dx, dy] = lastEvent.drag.beforeTranslate as [number, number];
                const clamped = clampToSlide(
                  { x: init.x + dx, y: init.y + dy, w, h },
                  { pageWidth, pageHeight },
                );
                updateElement(slide.id, id, clamped);
              }}
              onRotateStart={captureInitialState}
              onRotate={({ target, beforeRotate }) => {
                target.style.transform = `rotate(${beforeRotate}deg)`;
              }}
              onRotateEnd={({ target, lastEvent }) => {
                target.style.transform = "";
                if (!slide || !lastEvent) return;
                const id = (target as HTMLElement).dataset.elementId as ElementId;
                updateElement(slide.id, id, {
                  rotation: Math.round(lastEvent.beforeRotate),
                });
              }}
            />
          ) : null}
          </div>
        </div>
      </div>
      </div>
      <Ruler
        orientation="horizontal"
        pageStart={slideRect.left - RULER_THICKNESS}
        pageSize={pageWidth}
        scale={scale}
        viewportSize={
          areaWidth - RULER_THICKNESS - RIGHT_RAIL_RESERVE - composerReserve
        }
        offset={RULER_THICKNESS}
        rightReserve={RIGHT_RAIL_RESERVE + composerReserve}
      />
      <Ruler
        orientation="vertical"
        pageStart={slideRect.top - RULER_THICKNESS}
        pageSize={pageHeight}
        scale={scale}
        viewportSize={areaHeight - RULER_THICKNESS}
        offset={RULER_THICKNESS}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: RULER_THICKNESS,
          height: RULER_THICKNESS,
          background: "#f9fafd",
          borderRight: "1px solid rgba(60, 64, 67, 0.35)",
          borderBottom: "1px solid rgba(60, 64, 67, 0.35)",
          boxSizing: "border-box",
          zIndex: 4,
          pointerEvents: "none",
        }}
      />
      {!readOnly && <RightRail />}
      {!readOnly && showCanvasComments && (
        <SlideCommentsRail slideId={slide?.id} anchorEl={slideEl} />
      )}
      {!readOnly && <CommentComposerPopup anchorEl={slideEl} />}
      {!readOnly && contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
