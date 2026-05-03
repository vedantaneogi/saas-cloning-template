"use client";

import { useCallback, useRef } from "react";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { SlideElement } from "../model/types";
import { editorClipboard } from "./editorClipboard";

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

function nextZoom(current: "fit" | number): number {
  const c = current === "fit" ? 100 : current;
  const next = ZOOM_STEPS.find((z) => z > c);
  return next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
}

function prevZoom(current: "fit" | number): number {
  const c = current === "fit" ? 100 : current;
  const rev = [...ZOOM_STEPS].reverse();
  const next = rev.find((z) => z < c);
  return next ?? ZOOM_STEPS[0];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Returns a ref callback — attach to a focusable container (tabIndex=-1).
 * The container gets a `keydown` listener registered via the callback ref
 * and cleaned up automatically, avoiding useEffect.
 */
export function useKeyboardShortcuts() {
  const { selection, editingElementId, zoom, presenting, readOnly } =
    useEditorState();
  const slide = useActiveSlide();
  const {
    undo,
    redo,
    deleteElement,
    duplicateElement,
    updateElements,
    addElement,
    selectElements,
    setElementZ,
    stopEditing,
    setZoom,
    addSlide,
    startPresenting,
    openCommentComposer,
  } = useEditorActions();

  const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handlerRef.current = (e: KeyboardEvent) => {
    const key = e.key;
    if (presenting) return;
    if (readOnly) {
      if ((key === "F5" || ((e.metaKey || e.ctrlKey) && key === "Enter"))) {
        e.preventDefault();
        startPresenting();
      }
      return;
    }
    if (editingElementId) {
      if (key === "Escape") {
        e.preventDefault();
        stopEditing();
      }
      return;
    }
    if (isEditableTarget(e.target)) return;
    const meta = e.metaKey || e.ctrlKey;

    if (key === "F5" || (meta && key === "Enter")) {
      e.preventDefault();
      startPresenting();
      return;
    }

    if (meta && (key === "z" || key === "Z")) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (meta && (key === "y" || key === "Y")) {
      e.preventDefault();
      redo();
      return;
    }

    if (meta && (key === "=" || key === "+")) {
      e.preventDefault();
      setZoom(nextZoom(zoom));
      return;
    }
    if (meta && key === "-") {
      e.preventDefault();
      setZoom(prevZoom(zoom));
      return;
    }
    if (meta && key === "0") {
      e.preventDefault();
      setZoom("fit");
      return;
    }

    if (e.metaKey && e.ctrlKey && (key === "m" || key === "M")) {
      e.preventDefault();
      if (slide) openCommentComposer(slide.id);
      return;
    }

    if (meta && !e.ctrlKey && !e.altKey && (key === "m" || key === "M")) {
      e.preventDefault();
      addSlide();
      return;
    }

    if (meta && (key === "a" || key === "A") && slide) {
      e.preventDefault();
      selectElements(
        slide.id,
        slide.elements.map((el) => el.id),
      );
      return;
    }

    if (!slide) return;
    const ids = selection.slideId === slide.id ? selection.elementIds : [];

    if ((key === "Delete" || key === "Backspace") && ids.length) {
      e.preventDefault();
      for (const id of ids) deleteElement(slide.id, id);
      return;
    }

    if (meta && (key === "d" || key === "D") && ids.length) {
      e.preventDefault();
      for (const id of ids) duplicateElement(slide.id, id);
      return;
    }

    if (meta && (key === "c" || key === "C") && ids.length) {
      e.preventDefault();
      editorClipboard.set(slide.elements.filter((el) => ids.includes(el.id)));
      return;
    }

    if (meta && (key === "v" || key === "V") && editorClipboard.size()) {
      e.preventDefault();
      const maxZ = slide.elements.length
        ? Math.max(...slide.elements.map((el) => el.z))
        : 0;
      const newIds: string[] = [];
      editorClipboard.get().forEach((src, i) => {
        const copy: SlideElement = {
          ...src,
          id: `el-${crypto.randomUUID().slice(0, 8)}`,
          x: src.x + 20,
          y: src.y + 20,
          z: maxZ + 1 + i,
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
      return;
    }

    if (
      (key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown") &&
      ids.length
    ) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
      const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
      const updates = ids
        .map((id) => {
          const el = slide.elements.find((x) => x.id === id);
          if (!el) return null;
          return { id, patch: { x: el.x + dx, y: el.y + dy } };
        })
        .filter((u): u is { id: string; patch: { x: number; y: number } } => u !== null);
      if (updates.length) updateElements(slide.id, updates);
      return;
    }

    if (meta && e.shiftKey && key === "]" && ids.length === 1) {
      e.preventDefault();
      setElementZ(slide.id, ids[0], "front");
      return;
    }
    if (meta && e.shiftKey && key === "[" && ids.length === 1) {
      e.preventDefault();
      setElementZ(slide.id, ids[0], "back");
      return;
    }
    if (meta && key === "]" && ids.length === 1) {
      e.preventDefault();
      setElementZ(slide.id, ids[0], "forward");
      return;
    }
    if (meta && key === "[" && ids.length === 1) {
      e.preventDefault();
      setElementZ(slide.id, ids[0], "backward");
      return;
    }

    if (key === "Escape" && ids.length) {
      selectElements(slide.id, []);
    }
  };

  return useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const listener = (e: KeyboardEvent) => handlerRef.current(e);
    node.addEventListener("keydown", listener);
    return () => node.removeEventListener("keydown", listener);
  }, []);
}
