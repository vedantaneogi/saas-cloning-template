"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

type AuthBootstrapProps = {
  children: ReactNode;
};

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { isLoading, isError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isError) {
      router.replace("/sign-in");
    }
  }, [isLoading, isError, router]);

  // Show nothing while loading or redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F8F8" }}>
        <div
          className="w-9 h-9 border-[3px] border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#1B0A3C", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (isError) {
    return null;
  }

  return <>{children}</>;
}
