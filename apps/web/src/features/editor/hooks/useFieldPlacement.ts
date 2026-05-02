"use client";

import { useCallback } from "react";
import type { PlacedField, FieldType } from "../model/types";
import { FIELD_DEFAULT_SIZES } from "../model/types";

interface UseFieldPlacementProps {
  activeRecipientId: string | null;
  currentPage: number;
  onAddField: (field: PlacedField) => void;
}

export function useFieldPlacement({
  activeRecipientId,
  currentPage,
  onAddField,
}: UseFieldPlacementProps) {
  const placeField = useCallback(
    (type: FieldType, x: number, y: number, containerWidth: number, containerHeight: number) => {
      if (!activeRecipientId) return;

      const sizes = FIELD_DEFAULT_SIZES[type] ?? { w: 20, h: 5 };
      const { w, h } = sizes;
      const xPct = (x / containerWidth) * 100;
      const yPct = (y / containerHeight) * 100;

      const field: PlacedField = {
        id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        recipientId: activeRecipientId,
        page: currentPage,
        x: Math.max(0, Math.min(xPct - w / 2, 100 - w)),
        y: Math.max(0, Math.min(yPct - h / 2, 100 - h)),
        width: w,
        height: h,
        required: type === "signature" || type === "initial",
      };

      onAddField(field);
    },
    [activeRecipientId, currentPage, onAddField],
  );

  return { placeField };
}
