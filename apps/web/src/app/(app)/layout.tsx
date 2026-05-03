import { ReactNode } from "react";
import { AuthBootstrap } from "@/features/auth";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return <AuthBootstrap>{children}</AuthBootstrap>;
}
