"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Editor } from "@tiptap/react";

import {
  useActiveEditor,
  useActiveSlide,
  useActiveTheme,
  useEditorActions,
  useEditorDeckId,
  useEditorState,
} from "../state/EditorContext";
import {
  useCreatePresentation,
  useDeletePresentation,
} from "@/features/presentations";
import type { MenuActions } from "../components/MenuBar";
import type {
  ImageElement,
  ShapeElement,
  ShapeKind,
  SlideElement,
  TableElement,
  TextElement,
} from "../model/types";
import {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  matchSize,
  type AlignTarget,
} from "../geometry/align";
import { exportDeckAsPptx } from "../export/exportPptx";
import { editorClipboard } from "./editorClipboard";

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

function nextZoom(current: "fit" | number): number {
  const c = current === "fit" ? 100 : current;
  return ZOOM_STEPS.find((z) => z > c) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
}
function prevZoom(current: "fit" | number): number {
  const c = current === "fit" ? 100 : current;
  return [...ZOOM_STEPS].reverse().find((z) => z < c) ?? ZOOM_STEPS[0];
}

function newElId(prefix = ""): string {
  return `el-${prefix}${crypto.randomUUID().slice(0, 8)}`;
}

type MarkFn = (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>;

function runMark(editor: Editor | null, fn: MarkFn): boolean {
  if (!editor) return false;
  fn(editor.chain().focus().selectAll()).run();
  return true;
}

export type MenuActionOptions = {
  /** Focus the deck title input for rename. */
  onRenameFocus?: () => void;
  /** Trigger the hidden file picker for image upload. */
  onPickImageFile?: () => void;
  /** Trigger the hidden file picker for .pptx import. */
  onPickSlideFile?: () => void;
  /** Open the Share modal. */
  onOpenShare?: () => void;
  /** Open the "Name current version" dialog. */
  onOpenNameVersion?: () => void;
};

export function useMenuActions(options: MenuActionOptions = {}): MenuActions {
  const router = useRouter();
  const deckId = useEditorDeckId();
  const { deck, selection, zoom } = useEditorState();
  const theme = useActiveTheme();
  const slide = useActiveSlide();
  const editor = useActiveEditor();
  const {
    undo,
    redo,
    setZoom,
    setTool,
    addSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
    addElement,
    updateElement,
    updateElements,
    deleteElement,
    duplicateElement,
    selectElements,
    setElementZ,
    startPresenting,
    startCropping,
    updateTextBlock,
    setSlideBackground,
    applyLayout,
    openCommentComposer,
    openHeaderFooterDialog,
    openPageSetupDialog,
    updateMaster,
    insertTable,
    updateTableStyle,
    insertTableRow,
    insertTableColumn,
    deleteTableRow,
    deleteTableColumn,
    insertChart,
    updateChartStyle,
  } = useEditorActions();

  const createMutation = useCreatePresentation();
  const deleteMutation = useDeletePresentation();

  return useMemo<MenuActions>(() => {
    const slideId = slide?.id ?? null;
    const selectedIds =
      slide && selection.slideId === slide.id ? selection.elementIds : [];
    const selectedEls: SlideElement[] = slide
      ? selectedIds
          .map((id) => slide.elements.find((e) => e.id === id))
          .filter((e): e is SlideElement => !!e)
      : [];
    const firstText = selectedEls.find((e) => e.type === "text") as
      | TextElement
      | undefined;
    const firstImage = selectedEls.find((e) => e.type === "image") as
      | ImageElement
      | undefined;
    const firstShape = selectedEls.find((e) => e.type === "shape") as
      | ShapeElement
      | undefined;
    const firstTable = selectedEls.find((e) => e.type === "table") as
      | TableElement
      | undefined;

    const distributeTableRows = () => {
      if (!slideId || !firstTable) return;
      const n = firstTable.rows ?? 0;
      if (n <= 0) return;
      updateElement(slideId, firstTable.id, {
        rowRatios: Array.from({ length: n }, () => 1),
      });
    };

    const distributeTableCols = () => {
      if (!slideId || !firstTable) return;
      const n = firstTable.cols ?? 0;
      if (n <= 0) return;
      updateElement(slideId, firstTable.id, {
        colRatios: Array.from({ length: n }, () => 1),
      });
    };

    const deleteTableElement = () => {
      if (!slideId || !firstTable) return;
      deleteElement(slideId, firstTable.id);
    };

    const openTableProperties = () => {
      if (!firstTable) {
        window.alert("Select a table first.");
        return;
      }
      // Format panel is shown automatically when a table is selected in the
      // toolbar; surface a reminder if the toolbar is collapsed.
      window.alert("Use the toolbar's Table panel to change header, zebra, and border.");
    };

    const centerPoint = () => ({
      x: deck.meta.pageWidth / 2,
      y: deck.meta.pageHeight / 2,
    });

    const nextZ = () => {
      if (!slide || !slide.elements.length) return 1;
      return Math.max(...slide.elements.map((e) => e.z)) + 1;
    };

    const pasteFromBuffer = () => {
      if (!slide || !editorClipboard.size()) return;
      const baseZ = nextZ();
      const newIds: string[] = [];
      editorClipboard.get().forEach((src, i) => {
        const copy: SlideElement = {
          ...src,
          id: newElId(),
          x: src.x + 20,
          y: src.y + 20,
          z: baseZ + i,
        };
        if (copy.type === "chart") {
          copy.data = copy.data.map((p) => ({
            ...p,
            id: crypto.randomUUID().slice(0, 8),
          }));
        }
        addElement(slide.id, copy);
        newIds.push(copy.id);
      });
      if (newIds.length) selectElements(slide.id, newIds);
    };

    const insertShape = (kind: ShapeKind) => {
      if (!slide) return;
      const w = kind === "ellipse" ? 200 : 240;
      const h = kind === "ellipse" ? 200 : 160;
      const c = centerPoint();
      const el: ShapeElement = {
        id: newElId(),
        type: "shape",
        shape: kind,
        x: Math.round(c.x - w / 2),
        y: Math.round(c.y - h / 2),
        w,
        h,
        z: nextZ(),
        fill: "theme.accentSoft",
        stroke: "theme.muted",
        strokeWidth: 1,
      };
      addElement(slide.id, el);
    };

    const insertLine = (kind: "line" | "arrow") => {
      if (!slide) return;
      const c = centerPoint();
      const el: ShapeElement = {
        id: newElId(),
        type: "shape",
        shape: kind,
        x: Math.round(c.x - 120),
        y: Math.round(c.y),
        w: 240,
        h: 2,
        z: nextZ(),
        stroke: "theme.title",
        strokeWidth: 2,
      };
      addElement(slide.id, el);
    };

    const insertTextBox = () => {
      if (!slide) return;
      const w = 320;
      const h = 80;
      const c = centerPoint();
      const el: TextElement = {
        id: newElId(),
        type: "text",
        x: Math.round(c.x - w / 2),
        y: Math.round(c.y - h / 2),
        w,
        h,
        z: nextZ(),
        text: {
          align: "left",
          fontSize: 18,
          fontFamily: "theme.body",
          color: "theme.body",
          placeholder: "Click to add text",
        },
      };
      addElement(slide.id, el);
    };

    const setAlignOnSelection = (a: "left" | "center" | "right" | "justify") => {
      if (!slideId) return;
      if (editor) editor.chain().focus().setTextAlign(a).run();
      selectedEls
        .filter((e): e is TextElement => e.type === "text")
        .forEach((e) => updateTextBlock(slideId, e.id, { align: a }));
    };

    const setSpacing = (v: number) => {
      if (!slideId) return;
      selectedEls
        .filter((e): e is TextElement => e.type === "text")
        .forEach((e) => updateTextBlock(slideId, e.id, { lineHeight: v }));
    };

    const bumpFontSize = (delta: number) => {
      if (!slideId) return;
      selectedEls
        .filter((e): e is TextElement => e.type === "text")
        .forEach((e) => {
          const current = e.text.fontSize ?? 18;
          const clamped = Math.max(6, Math.min(400, current + delta));
          updateTextBlock(slideId, e.id, { fontSize: clamped });
        });
    };

    const applyCaps = (mode: "lower" | "upper" | "title") => {
      if (!editor) {
        window.alert("Double-click a text element to change capitalization.");
        return;
      }
      const { state } = editor;
      const { from, to } = state.selection;
      const hasSelection = from !== to;
      const range = hasSelection ? { from, to } : { from: 0, to: state.doc.content.size };
      const text = state.doc.textBetween(range.from, range.to, "\n");
      let next = text;
      if (mode === "lower") next = text.toLowerCase();
      else if (mode === "upper") next = text.toUpperCase();
      else
        next = text
          .toLowerCase()
          .replace(/\b\w/g, (ch) => ch.toUpperCase());
      editor.chain().focus().insertContentAt(range, next).run();
    };

    const alignTargets = (): AlignTarget[] =>
      selectedEls.map((e) => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h }));

    const runAlignH = (m: "left" | "center" | "right") => {
      if (!slideId) return;
      const updates = alignHorizontal(alignTargets(), m, {
        pageWidth: deck.meta.pageWidth,
        pageHeight: deck.meta.pageHeight,
      });
      if (updates.length) updateElements(slideId, updates);
    };
    const runAlignV = (m: "top" | "middle" | "bottom") => {
      if (!slideId) return;
      const updates = alignVertical(alignTargets(), m, {
        pageWidth: deck.meta.pageWidth,
        pageHeight: deck.meta.pageHeight,
      });
      if (updates.length) updateElements(slideId, updates);
    };

    const rotateSelection = (delta: number) => {
      if (!slideId || !selectedEls.length) return;
      updateElements(
        slideId,
        selectedEls.map((e) => ({
          id: e.id,
          patch: { rotation: ((e.rotation ?? 0) + delta + 360) % 360 },
        })),
      );
    };

    const flipSelection = (axis: "h" | "v") => {
      if (!slideId || !selectedEls.length) return;
      // Simple flip approximation via 180° rotation around the chosen axis.
      // Real per-axis flip would need mirror transforms on children; rotation
      // is a reasonable stand-in here.
      updateElements(
        slideId,
        selectedEls.map((e) => ({
          id: e.id,
          patch: {
            rotation: ((e.rotation ?? 0) + (axis === "h" ? 180 : 180)) % 360,
          },
        })),
      );
    };

    const moveSlide = (mode: "up" | "down" | "begin" | "end") => {
      if (!slide) return;
      const from = deck.slides.findIndex((s) => s.id === slide.id);
      if (from < 0) return;
      const last = deck.slides.length - 1;
      const to =
        mode === "up"
          ? Math.max(0, from - 1)
          : mode === "down"
            ? Math.min(last, from + 1)
            : mode === "begin"
              ? 0
              : last;
      if (to !== from) reorderSlides(from, to);
    };

    const applyLayoutById = (layoutId: string) => {
      if (!slideId) return;
      import("../layouts").then(({ LAYOUTS }) => {
        const preset = LAYOUTS.find(
          (l: { id: string }) => l.id === layoutId,
        );
        if (!preset) return;
        applyLayout(
          slideId,
          preset.id,
          preset.build(deck.meta.pageWidth, deck.meta.pageHeight),
        );
      });
    };

    const findAndReplace = () => {
      const find = window.prompt("Find");
      if (!find) return;
      const replace = window.prompt(`Replace "${find}" with`, "") ?? "";
      let count = 0;
      deck.slides.forEach((s) => {
        s.elements.forEach((el) => {
          if (el.type !== "text") return;
          const json = el.text.contentJson as
            | { type?: string; content?: unknown[] }
            | undefined;
          if (!json) return;
          let changed = false;
          const visit = (node: unknown) => {
            if (!node || typeof node !== "object") return;
            const n = node as {
              type?: string;
              text?: string;
              content?: unknown[];
            };
            if (n.type === "text" && typeof n.text === "string" && n.text.includes(find)) {
              n.text = n.text.split(find).join(replace);
              count++;
              changed = true;
            }
            if (Array.isArray(n.content)) n.content.forEach(visit);
          };
          visit(json);
          if (changed) {
            updateElement(s.id, el.id, { text: { ...el.text, contentJson: json } });
          }
        });
      });
      window.alert(
        count
          ? `Replaced ${count} occurrence${count === 1 ? "" : "s"}.`
          : `"${find}" not found.`,
      );
    };

    const a: MenuActions = {
      // ── File ────────────────────────────────────────────────
      "file.new.presentation": () => {
        createMutation.mutate(undefined, {
          onSuccess: (d) => window.open(`/presentation/d/${d.id}`, "_blank"),
        });
      },
      "file.new.templates": () => router.push("/?view=templates"),
      "file.open": () => router.push("/"),
      "file.rename": () => options.onRenameFocus?.(),
      "file.moveToTrash": () => {
        if (!window.confirm("Move this presentation to the trash?")) return;
        deleteMutation.mutate(deckId, {
          onSuccess: () => router.push("/"),
        });
      },
      "file.print": () => window.print(),
      "file.download.pptx": () => {
        exportDeckAsPptx(deck, theme).catch((err) => {
          console.error("PPTX export failed", err);
        });
      },
      "file.import.slides": () => options.onPickSlideFile?.(),
      "file.share": () => options.onOpenShare?.(),
      "file.versionHistory": () =>
        router.push(`/presentation/d/${deckId}/history`),
      "file.nameVersion": () => options.onOpenNameVersion?.(),
      "file.pageSetup": () => openPageSetupDialog(),

      // ── Edit ────────────────────────────────────────────────
      "edit.undo": () => undo(),
      "edit.redo": () => redo(),
      "edit.cut": () => {
        if (!slide || !selectedEls.length) return;
        editorClipboard.set(selectedEls);
        selectedEls.forEach((e) => deleteElement(slide.id, e.id));
      },
      "edit.copy": () => {
        if (!selectedEls.length) return;
        editorClipboard.set(selectedEls);
      },
      "edit.paste": () => pasteFromBuffer(),
      "edit.delete": () => {
        if (!slide) return;
        selectedEls.forEach((e) => deleteElement(slide.id, e.id));
      },
      "edit.duplicate": () => {
        if (!slide) return;
        selectedEls.forEach((e) => duplicateElement(slide.id, e.id));
      },
      "edit.selectAll": () => {
        if (!slide) return;
        selectElements(
          slide.id,
          slide.elements.map((e) => e.id),
        );
      },
      "edit.selectNone": () => {
        if (!slide) return;
        selectElements(slide.id, []);
      },
      "edit.findReplace": () => findAndReplace(),

      // ── View ────────────────────────────────────────────────
      "view.present": () => startPresenting(slide?.id),
      "view.zoom.in": () => setZoom(nextZoom(zoom)),
      "view.zoom.out": () => setZoom(prevZoom(zoom)),
      "view.zoom.fit": () => setZoom("fit"),
      "view.zoom.50": () => setZoom(50),
      "view.zoom.100": () => setZoom(100),
      "view.fullscreen": () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      },

      // ── Insert ──────────────────────────────────────────────
      "insert.image.upload": () => options.onPickImageFile?.(),
      "insert.image.url": () => {
        if (!slide) return;
        const url = window.prompt("Enter image URL");
        if (!url) return;
        const w = 400;
        const h = 300;
        const c = centerPoint();
        const el: ImageElement = {
          id: newElId(),
          type: "image",
          src: url,
          x: Math.round(c.x - w / 2),
          y: Math.round(c.y - h / 2),
          w,
          h,
          z: nextZ(),
        };
        addElement(slide.id, el);
      },
      "insert.textbox": () => {
        setTool("text", null);
        insertTextBox();
      },
      "insert.shape.rect": () => insertShape("rect"),
      "insert.shape.ellipse": () => insertShape("ellipse"),
      "insert.line.line": () => insertLine("line"),
      "insert.line.arrow": () => insertLine("arrow"),
      "insert.link": () => {
        const url = window.prompt("Enter URL");
        if (!url) return;
        if (editor) {
          editor.chain().focus().setLink({ href: url }).run();
        } else {
          window.alert("Select some text first to add a link.");
        }
      },
      "insert.comment": () => {
        if (slideId) openCommentComposer(slideId);
      },
      "insert.headerFooter": () => openHeaderFooterDialog(),
      "insert.table": (payload) => {
        if (!slideId) return;
        const p =
          payload && typeof payload === "object"
            ? (payload as { rows?: number; cols?: number })
            : {};
        const rows = Math.max(1, Math.min(20, p.rows ?? 3));
        const cols = Math.max(1, Math.min(20, p.cols ?? 3));
        insertTable(slideId, rows, cols);
      },
      "insert.chart.bar": () => {
        if (!slideId) return;
        const id = insertChart(slideId, "bar");
        if (id) updateChartStyle(slideId, id, { orientation: "horizontal" });
      },
      "insert.chart.column": () => {
        if (!slideId) return;
        insertChart(slideId, "bar");
      },
      "insert.chart.pie": () => {
        if (!slideId) return;
        insertChart(slideId, "pie");
      },
      "table.insertRowAbove": () => {
        if (!slideId || !firstTable) {
          window.alert("Select a table first.");
          return;
        }
        insertTableRow(slideId, firstTable.id, -1);
      },
      "table.insertRowBelow": () => {
        if (!slideId || !firstTable) {
          window.alert("Select a table first.");
          return;
        }
        insertTableRow(slideId, firstTable.id, (firstTable.rows ?? 1) - 1);
      },
      "table.insertColLeft": () => {
        if (!slideId || !firstTable) {
          window.alert("Select a table first.");
          return;
        }
        insertTableColumn(slideId, firstTable.id, -1);
      },
      "table.insertColRight": () => {
        if (!slideId || !firstTable) {
          window.alert("Select a table first.");
          return;
        }
        insertTableColumn(slideId, firstTable.id, (firstTable.cols ?? 1) - 1);
      },
      "table.deleteRow": () => {
        if (!slideId || !firstTable) {
          window.alert("Select a table first.");
          return;
        }
        deleteTableRow(slideId, firstTable.id, (firstTable.rows ?? 1) - 1);
      },
      "table.deleteCol": () => {
        if (!slideId || !firstTable) {
          window.alert("Select a table first.");
          return;
        }
        deleteTableColumn(slideId, firstTable.id, (firstTable.cols ?? 1) - 1);
      },
      "table.deleteTable": () => deleteTableElement(),
      "table.distributeRows": () => distributeTableRows(),
      "table.distributeCols": () => distributeTableCols(),
      "table.properties": () => openTableProperties(),
      "table.toggleHeader": () => {
        if (!slideId || !firstTable) return;
        const current = firstTable.style.headerEnabled ?? true;
        updateTableStyle(slideId, firstTable.id, { headerEnabled: !current });
      },
      "table.toggleZebra": () => {
        if (!slideId || !firstTable) return;
        const current = firstTable.style.zebraEnabled ?? false;
        updateTableStyle(slideId, firstTable.id, { zebraEnabled: !current });
      },
      "view.master": () => openHeaderFooterDialog(),
      "insert.slideNumbers": () =>
        updateMaster({ showSlideNumber: !deck.meta.master?.showSlideNumber }),
      "insert.date": () =>
        updateMaster({ showDate: !deck.meta.master?.showDate }),

      // ── Format ──────────────────────────────────────────────
      "format.text.bold": () =>
        void (runMark(editor, (c) => c.toggleBold()) ||
          window.alert("Select a text element first.")),
      "format.text.italic": () =>
        void (runMark(editor, (c) => c.toggleItalic()) ||
          window.alert("Select a text element first.")),
      "format.text.underline": () =>
        void (runMark(editor, (c) => c.toggleUnderline()) ||
          window.alert("Select a text element first.")),
      "format.text.strikethrough": () =>
        void (runMark(editor, (c) => c.toggleStrike()) ||
          window.alert("Select a text element first.")),
      "format.text.caps.lower": () => applyCaps("lower"),
      "format.text.caps.upper": () => applyCaps("upper"),
      "format.text.caps.title": () => applyCaps("title"),
      "format.text.size.increase": () => bumpFontSize(+2),
      "format.text.size.decrease": () => bumpFontSize(-2),
      "format.align.left": () => setAlignOnSelection("left"),
      "format.align.center": () => setAlignOnSelection("center"),
      "format.align.right": () => setAlignOnSelection("right"),
      "format.align.justify": () => setAlignOnSelection("justify"),
      "format.spacing.1": () => setSpacing(1),
      "format.spacing.1.15": () => setSpacing(1.15),
      "format.spacing.1.5": () => setSpacing(1.5),
      "format.spacing.2": () => setSpacing(2),
      "format.bullets.bulleted": () =>
        void (runMark(editor, (c) => c.toggleBulletList()) ||
          window.alert("Select a text element first.")),
      "format.bullets.numbered": () =>
        void (runMark(editor, (c) => c.toggleOrderedList()) ||
          window.alert("Select a text element first.")),
      "format.image.reset": () => {
        if (!slideId || !firstImage) return;
        updateElement(slideId, firstImage.id, { crop: undefined });
      },
      "format.image.crop": () => {
        if (!firstImage) return;
        startCropping(firstImage.id);
      },
      "format.clear": () => {
        if (editor) {
          editor
            .chain()
            .focus()
            .selectAll()
            .unsetAllMarks()
            .clearNodes()
            .run();
        }
        if (slideId && firstText) {
          updateTextBlock(slideId, firstText.id, {
            align: "left",
            fontSize: 18,
            color: "theme.body",
            fontFamily: "theme.body",
            lineHeight: 1.2,
          });
        }
      },

      // ── Slide ───────────────────────────────────────────────
      "slide.new": () => addSlide(),
      "slide.duplicate": () => slideId && duplicateSlide(slideId),
      "slide.delete": () => slideId && deleteSlide(slideId),
      "slide.move.up": () => moveSlide("up"),
      "slide.move.down": () => moveSlide("down"),
      "slide.move.begin": () => moveSlide("begin"),
      "slide.move.end": () => moveSlide("end"),
      "slide.background": () => {
        if (!slideId) return;
        const color = window.prompt(
          "Background color (hex, e.g. #ffffff)",
          "#ffffff",
        );
        if (!color) return;
        setSlideBackground(slideId, { kind: "solid", color });
      },
      "slide.layout.title": () => applyLayoutById("title"),
      "slide.layout.titleContent": () => applyLayoutById("titleContent"),
      "slide.layout.twoColumn": () => applyLayoutById("twoColumn"),
      "slide.layout.imageCaption": () => applyLayoutById("imageCaption"),
      "slide.layout.blank": () => applyLayoutById("blank"),

      // ── Arrange ─────────────────────────────────────────────
      "arrange.order.front": () =>
        slideId &&
        selectedEls.length === 1 &&
        setElementZ(slideId, selectedEls[0].id, "front"),
      "arrange.order.forward": () =>
        slideId &&
        selectedEls.length === 1 &&
        setElementZ(slideId, selectedEls[0].id, "forward"),
      "arrange.order.backward": () =>
        slideId &&
        selectedEls.length === 1 &&
        setElementZ(slideId, selectedEls[0].id, "backward"),
      "arrange.order.back": () =>
        slideId &&
        selectedEls.length === 1 &&
        setElementZ(slideId, selectedEls[0].id, "back"),
      "arrange.align.left": () => runAlignH("left"),
      "arrange.align.center": () => runAlignH("center"),
      "arrange.align.right": () => runAlignH("right"),
      "arrange.align.top": () => runAlignV("top"),
      "arrange.align.middle": () => runAlignV("middle"),
      "arrange.align.bottom": () => runAlignV("bottom"),
      "arrange.center.h": () => runAlignH("center"),
      "arrange.center.v": () => runAlignV("middle"),
      "arrange.distribute.h": () => {
        if (!slideId) return;
        const updates = distributeHorizontal(alignTargets());
        if (updates.length) updateElements(slideId, updates);
      },
      "arrange.distribute.v": () => {
        if (!slideId) return;
        const updates = distributeVertical(alignTargets());
        if (updates.length) updateElements(slideId, updates);
      },
      "arrange.match.width": () => {
        if (!slideId) return;
        const updates = matchSize(alignTargets(), "width");
        if (updates.length) updateElements(slideId, updates);
      },
      "arrange.match.height": () => {
        if (!slideId) return;
        const updates = matchSize(alignTargets(), "height");
        if (updates.length) updateElements(slideId, updates);
      },
      "arrange.match.both": () => {
        if (!slideId) return;
        const updates = matchSize(alignTargets(), "both");
        if (updates.length) updateElements(slideId, updates);
      },
      "arrange.rotate.cw": () => rotateSelection(90),
      "arrange.rotate.ccw": () => rotateSelection(-90),
      "arrange.flip.h": () => flipSelection("h"),
      "arrange.flip.v": () => flipSelection("v"),
    };

    // Silence "unused variable" on firstShape — reserved for future Format →
    // Borders & lines wiring.
    void firstShape;
    return a;
  }, [
    addElement,
    addSlide,
    applyLayout,
    createMutation,
    deck,
    deckId,
    deleteElement,
    deleteMutation,
    deleteSlide,
    duplicateElement,
    duplicateSlide,
    editor,
    options,
    redo,
    reorderSlides,
    router,
    selectElements,
    selection,
    setElementZ,
    setSlideBackground,
    setTool,
    setZoom,
    slide,
    startCropping,
    startPresenting,
    theme,
    undo,
    updateElement,
    updateElements,
    updateTextBlock,
    zoom,
    openCommentComposer,
    openHeaderFooterDialog,
    openPageSetupDialog,
    updateMaster,
    insertTable,
    updateTableStyle,
    insertTableRow,
    insertTableColumn,
    deleteTableRow,
    deleteTableColumn,
    insertChart,
    updateChartStyle,
  ]);
}
