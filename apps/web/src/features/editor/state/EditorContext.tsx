"use client";

/**
 * Editor store.
 *
 * Structural deck state is owned by a Yjs-backed DocProvider. Ephemeral UI
 * state (selection, tool, zoom, save indicator) stays in a small useReducer.
 * Components subscribe to Yjs updates via useSyncExternalStore so no useEffect
 * is needed for the doc <-> React bridge.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import type {
  ChartDataPoint,
  ChartKind,
  ChartStyle,
  Deck,
  DeckMaster,
  ElementId,
  ShapeKind,
  Slide,
  SlideBackground,
  SlideElement,
  SlideId,
  TableStyle,
  TextBlock,
  ToolMode,
  Selection,
} from "../model/types";
import { buildDefaultTableElement } from "../model/tableDefaults";
import {
  buildDefaultChartElement,
  newChartPointId,
} from "../model/chartDefaults";
import { getTheme, type Theme } from "../themes";
import {
  InMemoryDocProvider,
  type DocProvider,
  type ElementPatch,
  type ZDirection,
} from "../yjs/provider";

export type ZoomMode = "fit" | number;

export type PresenterBlank = "none" | "white" | "black";

export type CommentComposerState = {
  slideId: SlideId;
  editingCommentId?: string;
};

export type ToastState = {
  // Monotonic key bumped on every show(), so re-firing the same message still
  // reopens a closing Snackbar.
  key: number;
  message: string | null;
  undoable: boolean;
};

export type UiState = {
  selection: Selection;
  tool: ToolMode;
  pendingShapeKind: ShapeKind | null;
  zoom: ZoomMode;
  editingElementId: ElementId | null;
  croppingElementId: ElementId | null;
  saveState: "idle" | "saving" | "saved" | "offline";
  presenting: boolean;
  presenterBlank: PresenterBlank;
  commentsPanelOpen: boolean;
  commentComposer: CommentComposerState | null;
  toast: ToastState;
  headerFooterDialogOpen: boolean;
  pageSetupDialogOpen: boolean;
  insertingChart: ChartKind | null;
};

export type EditorState = UiState & { deck: Deck; readOnly: boolean };

type UiAction =
  | { type: "select"; slideId: SlideId | null; elementIds?: ElementId[] }
  | { type: "setActiveSlide"; slideId: SlideId }
  | { type: "setTool"; tool: ToolMode; pendingShapeKind?: ShapeKind | null }
  | { type: "setPendingShapeKind"; kind: ShapeKind | null }
  | { type: "setZoom"; zoom: ZoomMode }
  | { type: "startEditing"; elementId: ElementId }
  | { type: "stopEditing" }
  | { type: "startCropping"; elementId: ElementId }
  | { type: "stopCropping" }
  | { type: "setSaveState"; state: UiState["saveState"] }
  | { type: "startPresenting"; slideId?: SlideId }
  | { type: "stopPresenting" }
  | { type: "setPresenterBlank"; mode: PresenterBlank }
  | { type: "setCommentsPanelOpen"; open: boolean }
  | { type: "toggleCommentsPanel" }
  | { type: "openCommentComposer"; slideId: SlideId; editingCommentId?: string }
  | { type: "closeCommentComposer" }
  | { type: "showToast"; message: string; undoable?: boolean }
  | { type: "dismissToast" }
  | { type: "openHeaderFooterDialog" }
  | { type: "closeHeaderFooterDialog" }
  | { type: "openPageSetupDialog" }
  | { type: "closePageSetupDialog" }
  | { type: "setInsertingChart"; kind: ChartKind | null };

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "select": {
      const nextIds = action.elementIds ?? [];
      const editingStillValid =
        state.editingElementId &&
        nextIds.length === 1 &&
        nextIds[0] === state.editingElementId;
      const croppingStillValid =
        state.croppingElementId &&
        nextIds.length === 1 &&
        nextIds[0] === state.croppingElementId;
      return {
        ...state,
        selection: {
          slideId: action.slideId ?? state.selection.slideId,
          elementIds: nextIds,
        },
        editingElementId: editingStillValid ? state.editingElementId : null,
        croppingElementId: croppingStillValid ? state.croppingElementId : null,
      };
    }
    case "setActiveSlide":
      return {
        ...state,
        selection: { slideId: action.slideId, elementIds: [] },
        editingElementId: null,
        croppingElementId: null,
      };
    case "setTool":
      return {
        ...state,
        tool: action.tool,
        pendingShapeKind:
          action.pendingShapeKind !== undefined
            ? action.pendingShapeKind
            : action.tool === "shape" || action.tool === "line"
              ? state.pendingShapeKind
              : null,
        editingElementId: null,
        croppingElementId: null,
      };
    case "setPendingShapeKind":
      return { ...state, pendingShapeKind: action.kind };
    case "setZoom":
      return { ...state, zoom: action.zoom };
    case "startEditing":
      return {
        ...state,
        editingElementId: action.elementId,
        croppingElementId: null,
        selection: {
          slideId: state.selection.slideId,
          elementIds: [action.elementId],
        },
      };
    case "stopEditing":
      return { ...state, editingElementId: null };
    case "startCropping":
      return {
        ...state,
        croppingElementId: action.elementId,
        editingElementId: null,
        selection: {
          slideId: state.selection.slideId,
          elementIds: [action.elementId],
        },
      };
    case "stopCropping":
      return { ...state, croppingElementId: null };
    case "setSaveState":
      return { ...state, saveState: action.state };
    case "startPresenting":
      return {
        ...state,
        presenting: true,
        presenterBlank: "none",
        editingElementId: null,
        croppingElementId: null,
        selection: action.slideId
          ? { slideId: action.slideId, elementIds: [] }
          : { ...state.selection, elementIds: [] },
      };
    case "stopPresenting":
      return { ...state, presenting: false, presenterBlank: "none" };
    case "setPresenterBlank":
      return { ...state, presenterBlank: action.mode };
    case "setCommentsPanelOpen":
      return { ...state, commentsPanelOpen: action.open };
    case "toggleCommentsPanel":
      return { ...state, commentsPanelOpen: !state.commentsPanelOpen };
    case "openCommentComposer":
      return {
        ...state,
        commentComposer: {
          slideId: action.slideId,
          editingCommentId: action.editingCommentId,
        },
        selection: { slideId: action.slideId, elementIds: [] },
      };
    case "closeCommentComposer":
      return { ...state, commentComposer: null };
    case "showToast":
      return {
        ...state,
        toast: {
          key: state.toast.key + 1,
          message: action.message,
          undoable: action.undoable ?? false,
        },
      };
    case "dismissToast":
      return { ...state, toast: { ...state.toast, message: null } };
    case "openHeaderFooterDialog":
      return { ...state, headerFooterDialogOpen: true };
    case "closeHeaderFooterDialog":
      return { ...state, headerFooterDialogOpen: false };
    case "openPageSetupDialog":
      return { ...state, pageSetupDialogOpen: true };
    case "closePageSetupDialog":
      return { ...state, pageSetupDialogOpen: false };
    case "setInsertingChart":
      return { ...state, insertingChart: action.kind };
    default:
      return state;
  }
}

type EditorContextValue = {
  deckId: string;
  readOnly: boolean;
  ui: UiState;
  uiDispatch: Dispatch<UiAction>;
  provider: DocProvider;
  activeEditor: Editor | null;
  setActiveEditorFor: (elementId: ElementId, editor: Editor | null) => void;
  clearActiveEditor: (elementId: ElementId) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  deckId,
  initialDeck,
  readOnly = false,
  children,
}: {
  deckId: string;
  initialDeck: Deck;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const [provider, setProvider] = useState<DocProvider>(
    () => new InMemoryDocProvider(initialDeck),
  );

  const lastDeckIdRef = useRef(deckId);
  if (lastDeckIdRef.current !== deckId) {
    lastDeckIdRef.current = deckId;
    provider.destroy();
    setProvider(new InMemoryDocProvider(initialDeck));
  }

  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    return () => {
      destroyTimerRef.current = setTimeout(() => {
        provider.destroy();
      }, 0);
    };
  }, [provider]);

  const [ui, uiDispatch] = useReducer(uiReducer, undefined, () => ({
    selection: { slideId: provider.readDeck().slides[0]?.id ?? null, elementIds: [] },
    tool: "select" as ToolMode,
    pendingShapeKind: null,
    zoom: "fit" as ZoomMode,
    editingElementId: null,
    croppingElementId: null,
    saveState: "idle" as const,
    presenting: false,
    presenterBlank: "none" as const,
    commentsPanelOpen: false,
    commentComposer: null,
    toast: { key: 0, message: null, undoable: false },
    headerFooterDialogOpen: false,
    pageSetupDialogOpen: false,
    insertingChart: null,
  }));

  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const activeEditorOwnerRef = useRef<ElementId | null>(null);

  const setActiveEditorFor = useCallback(
    (elementId: ElementId, editor: Editor | null) => {
      if (editor) {
        activeEditorOwnerRef.current = elementId;
        setActiveEditor(editor);
      } else if (activeEditorOwnerRef.current === elementId) {
        activeEditorOwnerRef.current = null;
        setActiveEditor(null);
      }
    },
    [],
  );

  const clearActiveEditor = useCallback((elementId: ElementId) => {
    if (activeEditorOwnerRef.current === elementId) {
      activeEditorOwnerRef.current = null;
      setActiveEditor(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      deckId,
      readOnly,
      ui,
      uiDispatch,
      provider,
      activeEditor,
      setActiveEditorFor,
      clearActiveEditor,
    }),
    [
      deckId,
      readOnly,
      ui,
      provider,
      activeEditor,
      setActiveEditorFor,
      clearActiveEditor,
    ],
  );
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorDeckId(): string {
  return useEditor().deckId;
}

export function useSetSaveState() {
  const { uiDispatch } = useEditor();
  return useCallback(
    (state: UiState["saveState"]) =>
      uiDispatch({ type: "setSaveState", state }),
    [uiDispatch],
  );
}

function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

export function useDocProvider(): DocProvider {
  return useEditor().provider;
}

function useDeck(): Deck {
  const { provider } = useEditor();
  useSyncExternalStore(provider.subscribe, provider.getVersion, provider.getVersion);
  return provider.readDeck();
}

export function useEditorState(): EditorState {
  const { ui, readOnly } = useEditor();
  const deck = useDeck();
  return { ...ui, deck, readOnly };
}

export function useEditorReadOnly(): boolean {
  return useEditor().readOnly;
}

export function useActiveSlide() {
  const deck = useDeck();
  const { ui } = useEditor();
  return deck.slides.find((s) => s.id === ui.selection.slideId) ?? deck.slides[0] ?? null;
}

export function useActiveTheme(): Theme {
  const deck = useDeck();
  return getTheme(deck.meta.themeId);
}

export function useUndoState() {
  const { provider } = useEditor();
  useSyncExternalStore(provider.subscribe, provider.getVersion, provider.getVersion);
  return { canUndo: provider.canUndo(), canRedo: provider.canRedo() };
}

export function useActiveEditor(): Editor | null {
  return useEditor().activeEditor;
}

export function useActiveEditorRegistry() {
  const { setActiveEditorFor, clearActiveEditor } = useEditor();
  return {
    register: setActiveEditorFor,
    unregister: clearActiveEditor,
  };
}

export function useEditorActions() {
  const { ui, uiDispatch, provider } = useEditor();
  const activeSlideId = ui.selection.slideId;

  const selectSlide = useCallback(
    (slideId: SlideId) => uiDispatch({ type: "setActiveSlide", slideId }),
    [uiDispatch],
  );
  const selectElements = useCallback(
    (slideId: SlideId | null, elementIds: ElementId[]) =>
      uiDispatch({ type: "select", slideId, elementIds }),
    [uiDispatch],
  );
  const setTool = useCallback(
    (tool: ToolMode, pendingShapeKind?: ShapeKind | null) =>
      uiDispatch({ type: "setTool", tool, pendingShapeKind }),
    [uiDispatch],
  );
  const setPendingShapeKind = useCallback(
    (kind: ShapeKind | null) => uiDispatch({ type: "setPendingShapeKind", kind }),
    [uiDispatch],
  );
  const setZoom = useCallback(
    (zoom: ZoomMode) => uiDispatch({ type: "setZoom", zoom }),
    [uiDispatch],
  );

  const renameDeck = useCallback(
    (title: string) => provider.renameDeck(title),
    [provider],
  );

  const setDeckTheme = useCallback(
    (themeId: string) => provider.setDeckTheme(themeId),
    [provider],
  );

  const setSlideBackground = useCallback(
    (slideId: SlideId, bg: SlideBackground) =>
      provider.setSlideBackground(slideId, bg),
    [provider],
  );

  const applyLayout = useCallback(
    (slideId: SlideId, layoutId: string, elements: SlideElement[]) => {
      provider.applyLayout(slideId, layoutId, elements);
      uiDispatch({ type: "select", slideId, elementIds: [] });
      uiDispatch({
        type: "showToast",
        message: "Layout applied",
        undoable: true,
      });
    },
    [provider, uiDispatch],
  );

  const addSlide = useCallback(() => {
    const newId = provider.addSlide(activeSlideId);
    uiDispatch({ type: "setActiveSlide", slideId: newId });
  }, [provider, uiDispatch, activeSlideId]);

  const insertSlides = useCallback(
    (slides: Slide[], afterSlideId?: SlideId | null): SlideId[] => {
      const ids = provider.insertSlides(
        slides,
        afterSlideId ?? activeSlideId ?? null,
      );
      if (ids[0]) uiDispatch({ type: "setActiveSlide", slideId: ids[0] });
      return ids;
    },
    [provider, uiDispatch, activeSlideId],
  );

  const deleteSlide = useCallback(
    (slideId: SlideId) => {
      const deck = provider.readDeck();
      const idx = deck.slides.findIndex((s) => s.id === slideId);
      provider.deleteSlide(slideId);
      const afterDeck = provider.readDeck();
      if (!afterDeck.slides.find((s) => s.id === slideId)) {
        const next = afterDeck.slides[Math.min(idx, afterDeck.slides.length - 1)];
        if (next) uiDispatch({ type: "setActiveSlide", slideId: next.id });
      }
    },
    [provider, uiDispatch],
  );

  const duplicateSlide = useCallback(
    (slideId: SlideId) => {
      const newId = provider.duplicateSlide(slideId);
      if (newId) uiDispatch({ type: "setActiveSlide", slideId: newId });
    },
    [provider, uiDispatch],
  );

  const reorderSlides = useCallback(
    (fromIndex: number, toIndex: number) =>
      provider.reorderSlides(fromIndex, toIndex),
    [provider],
  );

  const addElement = useCallback(
    (slideId: SlideId, el: SlideElement) => {
      provider.addElement(slideId, el);
      uiDispatch({ type: "select", slideId, elementIds: [el.id] });
    },
    [provider, uiDispatch],
  );

  const updateElement = useCallback(
    (slideId: SlideId, elementId: ElementId, patch: ElementPatch) =>
      provider.updateElement(slideId, elementId, patch),
    [provider],
  );

  const updateElements = useCallback(
    (
      slideId: SlideId,
      updates: Array<{ id: ElementId; patch: ElementPatch }>,
    ) => provider.updateElements(slideId, updates),
    [provider],
  );

  const deleteElement = useCallback(
    (slideId: SlideId, elementId: ElementId) => {
      provider.deleteElement(slideId, elementId);
      uiDispatch({ type: "select", slideId, elementIds: [] });
    },
    [provider, uiDispatch],
  );

  const duplicateElement = useCallback(
    (slideId: SlideId, elementId: ElementId) => {
      const newId = provider.duplicateElement(slideId, elementId);
      if (newId) uiDispatch({ type: "select", slideId, elementIds: [newId] });
    },
    [provider, uiDispatch],
  );

  const setElementZ = useCallback(
    (slideId: SlideId, elementId: ElementId, direction: ZDirection) =>
      provider.setElementZ(slideId, elementId, direction),
    [provider],
  );

  const undo = useCallback(() => provider.undo(), [provider]);
  const redo = useCallback(() => provider.redo(), [provider]);

  const startEditing = useCallback(
    (elementId: ElementId) => uiDispatch({ type: "startEditing", elementId }),
    [uiDispatch],
  );
  const stopEditing = useCallback(
    () => uiDispatch({ type: "stopEditing" }),
    [uiDispatch],
  );
  const startCropping = useCallback(
    (elementId: ElementId) => uiDispatch({ type: "startCropping", elementId }),
    [uiDispatch],
  );
  const stopCropping = useCallback(
    () => uiDispatch({ type: "stopCropping" }),
    [uiDispatch],
  );

  const startPresenting = useCallback(
    (slideId?: SlideId) => uiDispatch({ type: "startPresenting", slideId }),
    [uiDispatch],
  );
  const stopPresenting = useCallback(
    () => uiDispatch({ type: "stopPresenting" }),
    [uiDispatch],
  );
  const setPresenterBlank = useCallback(
    (mode: PresenterBlank) => uiDispatch({ type: "setPresenterBlank", mode }),
    [uiDispatch],
  );

  const insertTable = useCallback(
    (slideId: SlideId, rows: number, cols: number): ElementId | null => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      if (!slide) return null;
      const nextZ = slide.elements.length
        ? Math.max(...slide.elements.map((e) => e.z)) + 1
        : 1;
      const el = buildDefaultTableElement({
        id: `el-${crypto.randomUUID().slice(0, 8)}`,
        rows,
        cols,
        slideWidth: deck.meta.pageWidth,
        slideHeight: deck.meta.pageHeight,
        z: nextZ,
      });
      provider.addElement(slideId, el);
      uiDispatch({ type: "select", slideId, elementIds: [el.id] });
      return el.id;
    },
    [provider, uiDispatch],
  );

  const updateTableStyle = useCallback(
    (slideId: SlideId, tableId: ElementId, patch: Partial<TableStyle>) => {
      provider.updateElement(slideId, tableId, { style: patch });
    },
    [provider],
  );

  const insertTableRow = useCallback(
    (slideId: SlideId, tableId: ElementId, afterRow: number) =>
      provider.insertTableRow(slideId, tableId, afterRow),
    [provider],
  );
  const insertTableColumn = useCallback(
    (slideId: SlideId, tableId: ElementId, afterCol: number) =>
      provider.insertTableColumn(slideId, tableId, afterCol),
    [provider],
  );
  const deleteTableRow = useCallback(
    (slideId: SlideId, tableId: ElementId, row: number) =>
      provider.deleteTableRow(slideId, tableId, row),
    [provider],
  );
  const deleteTableColumn = useCallback(
    (slideId: SlideId, tableId: ElementId, col: number) =>
      provider.deleteTableColumn(slideId, tableId, col),
    [provider],
  );

  const insertChart = useCallback(
    (slideId: SlideId, kind: ChartKind): ElementId | null => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      if (!slide) return null;
      const nextZ = slide.elements.length
        ? Math.max(...slide.elements.map((e) => e.z)) + 1
        : 1;
      const el = buildDefaultChartElement({
        id: `el-${crypto.randomUUID().slice(0, 8)}`,
        kind,
        slideWidth: deck.meta.pageWidth,
        slideHeight: deck.meta.pageHeight,
        z: nextZ,
      });
      uiDispatch({ type: "setInsertingChart", kind });
      uiDispatch({ type: "setTool", tool: "select", pendingShapeKind: null });
      provider.addElement(slideId, el);
      uiDispatch({ type: "select", slideId, elementIds: [el.id] });
      setTimeout(() => {
        uiDispatch({ type: "setInsertingChart", kind: null });
      }, 700);
      return el.id;
    },
    [provider, uiDispatch],
  );

  const updateChartStyle = useCallback(
    (slideId: SlideId, chartId: ElementId, patch: Partial<ChartStyle>) => {
      provider.updateElement(slideId, chartId, { style: patch });
    },
    [provider],
  );

  const setChartKind = useCallback(
    (slideId: SlideId, chartId: ElementId, kind: ChartKind) => {
      provider.updateElement(slideId, chartId, { chartKind: kind });
    },
    [provider],
  );

  const setChartData = useCallback(
    (slideId: SlideId, chartId: ElementId, data: ChartDataPoint[]) => {
      provider.updateElement(slideId, chartId, { data });
    },
    [provider],
  );

  const updateChartPoint = useCallback(
    (
      slideId: SlideId,
      chartId: ElementId,
      pointId: string,
      patch: Partial<Omit<ChartDataPoint, "id">>,
    ) => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      const el = slide?.elements.find((e) => e.id === chartId);
      if (!el || el.type !== "chart") return;
      const next = el.data.map((p) => (p.id === pointId ? { ...p, ...patch } : p));
      provider.updateElement(slideId, chartId, { data: next });
    },
    [provider],
  );

  const addChartPoint = useCallback(
    (slideId: SlideId, chartId: ElementId, seed?: Partial<ChartDataPoint>) => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      const el = slide?.elements.find((e) => e.id === chartId);
      if (!el || el.type !== "chart") return;
      const point: ChartDataPoint = {
        id: seed?.id ?? newChartPointId(),
        label: seed?.label ?? `Category ${el.data.length + 1}`,
        value: typeof seed?.value === "number" ? seed.value : 10,
      };
      provider.updateElement(slideId, chartId, { data: [...el.data, point] });
    },
    [provider],
  );

  const removeChartPoint = useCallback(
    (slideId: SlideId, chartId: ElementId, pointId: string) => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      const el = slide?.elements.find((e) => e.id === chartId);
      if (!el || el.type !== "chart") return;
      provider.updateElement(slideId, chartId, {
        data: el.data.filter((p) => p.id !== pointId),
      });
    },
    [provider],
  );

  const updateTextBlock = useCallback(
    (slideId: SlideId, elementId: ElementId, partial: Partial<TextBlock>) => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      const el = slide?.elements.find((e) => e.id === elementId);
      if (!el || el.type !== "text") return;
      provider.updateElement(slideId, elementId, {
        text: { ...el.text, ...partial },
      });
    },
    [provider],
  );

  const toggleCommentsPanel = useCallback(
    () => uiDispatch({ type: "toggleCommentsPanel" }),
    [uiDispatch],
  );
  const setCommentsPanelOpen = useCallback(
    (open: boolean) => uiDispatch({ type: "setCommentsPanelOpen", open }),
    [uiDispatch],
  );
  const openCommentComposer = useCallback(
    (slideId: SlideId, editingCommentId?: string) =>
      uiDispatch({ type: "openCommentComposer", slideId, editingCommentId }),
    [uiDispatch],
  );
  const closeCommentComposer = useCallback(
    () => uiDispatch({ type: "closeCommentComposer" }),
    [uiDispatch],
  );

  const showToast = useCallback(
    (message: string, options?: { undoable?: boolean }) =>
      uiDispatch({
        type: "showToast",
        message,
        undoable: options?.undoable,
      }),
    [uiDispatch],
  );
  const dismissToast = useCallback(
    () => uiDispatch({ type: "dismissToast" }),
    [uiDispatch],
  );

  const updateMaster = useCallback(
    (fields: Partial<DeckMaster>) => provider.updateMaster(fields),
    [provider],
  );
  const openHeaderFooterDialog = useCallback(
    () => uiDispatch({ type: "openHeaderFooterDialog" }),
    [uiDispatch],
  );
  const closeHeaderFooterDialog = useCallback(
    () => uiDispatch({ type: "closeHeaderFooterDialog" }),
    [uiDispatch],
  );
  const openPageSetupDialog = useCallback(
    () => uiDispatch({ type: "openPageSetupDialog" }),
    [uiDispatch],
  );
  const closePageSetupDialog = useCallback(
    () => uiDispatch({ type: "closePageSetupDialog" }),
    [uiDispatch],
  );
  const setPageSize = useCallback(
    (width: number, height: number) => provider.setPageSize(width, height),
    [provider],
  );

  return {
    selectSlide,
    selectElements,
    setTool,
    setPendingShapeKind,
    setZoom,
    renameDeck,
    setDeckTheme,
    setSlideBackground,
    applyLayout,
    addSlide,
    insertSlides,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
    addElement,
    updateElement,
    updateElements,
    deleteElement,
    duplicateElement,
    setElementZ,
    undo,
    redo,
    startEditing,
    stopEditing,
    startCropping,
    stopCropping,
    startPresenting,
    stopPresenting,
    setPresenterBlank,
    insertTable,
    updateTableStyle,
    insertTableRow,
    insertTableColumn,
    deleteTableRow,
    deleteTableColumn,
    insertChart,
    updateChartStyle,
    setChartKind,
    setChartData,
    updateChartPoint,
    addChartPoint,
    removeChartPoint,
    updateTextBlock,
    toggleCommentsPanel,
    setCommentsPanelOpen,
    openCommentComposer,
    closeCommentComposer,
    showToast,
    dismissToast,
    updateMaster,
    openHeaderFooterDialog,
    closeHeaderFooterDialog,
    openPageSetupDialog,
    closePageSetupDialog,
    setPageSize,
  };
}

export function useToast(): ToastState {
  return useEditor().ui.toast;
}

export function useInsertingChart(): ChartKind | null {
  return useEditor().ui.insertingChart;
}

