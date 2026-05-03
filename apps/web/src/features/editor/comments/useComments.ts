"use client";

import { useMemo } from "react";
import type { Comment, SlideId } from "../model/types";
import { useEditorState } from "../state/EditorContext";

export function useAllComments(): Comment[] {
  const { deck } = useEditorState();
  return deck.comments ?? [];
}

export function useSlideComments(slideId: SlideId | null | undefined) {
  const all = useAllComments();
  return useMemo(() => {
    if (!slideId) return { unresolved: [], resolved: [] };
    const unresolved: Comment[] = [];
    const resolved: Comment[] = [];
    for (const c of all) {
      if (c.slideId !== slideId) continue;
      if (c.resolvedAt) resolved.push(c);
      else unresolved.push(c);
    }
    unresolved.sort((a, b) => a.createdAt - b.createdAt);
    resolved.sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
    return { unresolved, resolved };
  }, [all, slideId]);
}

export function useUnresolvedCountsBySlide(): Map<SlideId, number> {
  const all = useAllComments();
  return useMemo(() => {
    const map = new Map<SlideId, number>();
    for (const c of all) {
      if (c.resolvedAt) continue;
      map.set(c.slideId, (map.get(c.slideId) ?? 0) + 1);
    }
    return map;
  }, [all]);
}

export function useTotalUnresolvedCount(): number {
  const all = useAllComments();
  return useMemo(() => all.filter((c) => !c.resolvedAt).length, [all]);
}
