"use client";

import { useEffect, useState } from "react";

/**
 * Returns `false` on the server render + the first client render,
 * then flips to `true` after mount. Gate any branch whose output
 * depends on browser-only state (localStorage prefs, window APIs)
 * behind this so SSR and the first client paint stay in sync.
 */
export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
