import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2 text-text-secondary">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-mini font-semibold text-white">L</span>
          <span className="text-default font-semibold tracking-tight text-text-primary">Linear clone</span>
        </div>
        {children}
      </div>
    </div>
  );
}
