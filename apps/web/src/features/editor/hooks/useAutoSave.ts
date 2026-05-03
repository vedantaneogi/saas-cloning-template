"use client";

import { useEffect, useRef } from "react";

import { useSavePresentation } from "@/features/presentations";

import { useDocProvider, useEditorDeckId } from "../state/EditorContext";
import type { DocProvider } from "../yjs/provider";

const DEBOUNCE_MS = 2000;

type Dispatch = (state: "idle" | "saving" | "saved" | "offline") => void;

export function useAutoSave(dispatch: Dispatch) {
  const deckId = useEditorDeckId();
  const provider = useDocProvider();
  const save = useSavePresentation(deckId);

  const providerRef = useRef<DocProvider>(provider);
  providerRef.current = provider;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;
    let savedFlashTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      pending = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const deck = providerRef.current.readDeck();
      dispatchRef.current("saving");
      saveRef.current.mutate(
        { content: deck, title: deck.meta.title },
        {
          onSuccess: () => {
            dispatchRef.current("saved");
            if (savedFlashTimer) clearTimeout(savedFlashTimer);
            savedFlashTimer = setTimeout(() => {
              dispatchRef.current("idle");
            }, 2000);
          },
          onError: () => {
            dispatchRef.current("offline");
          },
        },
      );
    };

    const schedule = () => {
      pending = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    };

    const unsubscribe = provider.subscribe(schedule);

    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (savedFlashTimer) {
        clearTimeout(savedFlashTimer);
        savedFlashTimer = null;
      }
      if (pending) {
        // Best-effort flush on unmount so mid-debounce edits aren't lost.
        const deck = providerRef.current.readDeck();
        saveRef.current.mutate({ content: deck, title: deck.meta.title });
      }
    };
  }, [provider]);
}
