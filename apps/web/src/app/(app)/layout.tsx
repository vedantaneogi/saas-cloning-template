import { ReactNode } from "react";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import { AppNavbar } from "@/components/layout/AppNavbar";

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthBootstrap>
      <div className="flex flex-col min-h-screen" style={{ background: "#F8F8F8" }}>
        <AppNavbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </AuthBootstrap>
  );
}
