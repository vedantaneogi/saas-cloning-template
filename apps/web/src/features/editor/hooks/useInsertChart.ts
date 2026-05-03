"use client";

import { useCallback } from "react";
import { useActiveSlide, useEditorActions } from "../state/EditorContext";
import type { ChartKind, ElementId } from "../model/types";

export function useInsertChart() {
  const slide = useActiveSlide();
  const { insertChart } = useEditorActions();
  return useCallback(
    (kind: ChartKind): ElementId | null => {
      if (!slide) return null;
      return insertChart(slide.id, kind);
    },
    [slide, insertChart],
  );
}
