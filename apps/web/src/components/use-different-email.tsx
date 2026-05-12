"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

export function UseDifferentEmail({ email }: { email: string }) {
  const router = useRouter();
  async function handle() {
    try {
      await logout();
    } catch {
      // ignore — still navigate away
    }
    router.push("/login");
    router.refresh();
  }
  return (
    <footer className="mt-10 text-center text-mini text-text-tertiary">
      <p>
        Using <span className="text-text-secondary">{email}</span>
      </p>
      <button
        type="button"
        onClick={handle}
        className="mt-1 text-text-tertiary hover:text-text-secondary hover:underline"
      >
        Use a different email
      </button>
    </footer>
  );
}
