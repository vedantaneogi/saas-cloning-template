"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, logout } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const stale = search.get("stale") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // When we arrive from a layout redirect with ?stale=1, the browser still
  // holds a session cookie that the API has rejected (rotated secret, expired
  // JWT, etc.). Hit /api/auth/logout once on mount so the response clears the
  // cookie via Set-Cookie; otherwise the next nav would 401 again.
  useEffect(() => {
    if (!stale) return;
    let cancelled = false;
    logout().catch(() => {}).finally(() => {
      if (!cancelled) setNotice("Your session expired — please sign in again.");
    });
    return () => { cancelled = true; };
  }, [stale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const me = await login(email.trim(), password);
      const first = me.workspaces[0];
      router.push(first ? `/${first.slug}/inbox` : "/new-workspace");
      router.refresh();
    } catch (err) {
      setError((err as Error).message.includes("401") ? "Invalid email or password." : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <Field label="Email">
        <input
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-app px-3 py-2 text-small text-text-primary outline-none placeholder:text-text-tertiary focus:ring-1 focus:ring-accent"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          minLength={4}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-app px-3 py-2 text-small text-text-primary outline-none placeholder:text-text-tertiary focus:ring-1 focus:ring-accent"
        />
      </Field>
      {notice && !error && <p className="text-mini text-text-tertiary">{notice}</p>}
      {error && <p className="text-mini text-priority-urgent">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-accent px-3 py-2 text-small font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-mini text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}
