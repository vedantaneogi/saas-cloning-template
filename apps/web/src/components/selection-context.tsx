"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SelectionApi = {
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string, e?: { shiftKey?: boolean }) => void;
  clear: () => void;
  registerOrder: (ids: string[]) => void;
  selectAll: () => void;
  count: number;
};

const SelectionCtx = createContext<SelectionApi | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);

  const toggle = useCallback(
    (id: string, e?: { shiftKey?: boolean }) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (e?.shiftKey && anchor && anchor !== id) {
          const a = order.indexOf(anchor);
          const b = order.indexOf(id);
          if (a >= 0 && b >= 0) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            for (let i = lo; i <= hi; i++) next.add(order[i]);
            return next;
          }
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchor(id);
    },
    [order, anchor]
  );

  const clear = useCallback(() => {
    setSelected(new Set());
    setAnchor(null);
  }, []);

  const registerOrder = useCallback((ids: string[]) => {
    setOrder((prev) => {
      if (prev.length === ids.length && prev.every((p, i) => p === ids[i])) return prev;
      return ids;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(order));
  }, [order]);

  const api: SelectionApi = useMemo(
    () => ({
      selected,
      isSelected: (id) => selected.has(id),
      toggle,
      clear,
      registerOrder,
      selectAll,
      count: selected.size,
    }),
    [selected, toggle, clear, registerOrder, selectAll]
  );

  return <SelectionCtx.Provider value={api}>{children}</SelectionCtx.Provider>;
}

export function useSelection() {
  return useContext(SelectionCtx);
}
