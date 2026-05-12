"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/lib/api";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const me = await signup({ name: name.trim(), email: email.trim(), password, workspace_name: workspaceName.trim() || undefined });
      const first = me.workspaces[0];
      router.push(first ? `/${first.slug}/inbox` : "/new-workspace");
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("409")) setError("An account with this email already exists.");
      else setError("Could not sign up. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <Field label="Your name">
        <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Work email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Password">
        <input type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Workspace name">
        <input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="My company" className={inputCls} />
      </Field>
      {error && <p className="text-mini text-priority-urgent">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-accent px-3 py-2 text-small font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}

const inputCls = "w-full rounded-md bg-app px-3 py-2 text-small text-text-primary outline-none placeholder:text-text-tertiary focus:ring-1 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-mini text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}
