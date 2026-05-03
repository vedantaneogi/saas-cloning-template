"use client";

import { useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Subscribe a component to a Tiptap editor's `selectionUpdate` + `transaction`
 * events so that calls like `editor.isActive("bold")` and
 * `editor.getAttributes("textStyle")` in render pick up the current cursor
 * state. Returns a version number that increments on every event so React
 * always re-renders, even when only marks (not selection) change.
 */
const versions = new WeakMap<Editor, number>();

export function useEditorTick(editor: Editor | null): number {
  return useSyncExternalStore(
    (listener) => {
      if (!editor) return () => {};
      const bump = () => {
        versions.set(editor, (versions.get(editor) ?? 0) + 1);
        listener();
      };
      editor.on("selectionUpdate", bump);
      editor.on("transaction", bump);
      return () => {
        editor.off("selectionUpdate", bump);
        editor.off("transaction", bump);
      };
    },
    () => (editor ? versions.get(editor) ?? 0 : 0),
    () => 0,
  );
}
