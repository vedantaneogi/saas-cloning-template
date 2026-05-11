import type { ReactNode } from "react";

// Pass-through. The real shell lives at [workspace]/layout.tsx so it can
// fetch workspace data from the URL.
export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
