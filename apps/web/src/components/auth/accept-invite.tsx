"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, getInviteSummary, login, type InviteSummary } from "@/lib/api";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInviteSummary(token)
      .then(setInvite)
      .catch(() => setError("This invite is invalid, expired, or already used."));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (invite.needs_signup) {
        const me = await acceptInvite(token, { email: invite.email, name: name.trim(), password });
        const ws = me.workspaces.find((w) => w.slug === invite.workspace_slug) || me.workspaces[0];
        router.push(ws ? `/${ws.slug}/inbox` : "/");
      } else {
        // Existing user — log them in first, then accept.
        await login(invite.email, password);
        const me = await acceptInvite(token);
        const ws = me.workspaces.find((w) => w.slug === invite.workspace_slug) || me.workspaces[0];
        router.push(ws ? `/${ws.slug}/inbox` : "/");
      }
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("401")) setError("Wrong password.");
      else setError("Could not accept invite.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <p className="text-small text-priority-urgent">{error}</p>;
  }
  if (!invite) {
    return <p className="text-small text-text-tertiary">Loading invite…</p>;
  }

  return (
    <>
      <h1 className="text-title3 font-semibold text-text-primary">
        Join {invite.workspace_name}
      </h1>
      <p className="mt-1 text-small text-text-tertiary">
        You've been invited as a <strong className="text-text-secondary">{invite.role}</strong>. Sign in to accept.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <Field label="Email">
          <input value={invite.email} disabled className={`${inputCls} opacity-70`} />
        </Field>
        {invite.needs_signup && (
          <Field label="Your name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
          </Field>
        )}
        <Field label={invite.needs_signup ? "Pick a password" : "Password"}>
          <input
            type="password"
            required
            minLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoFocus={!invite.needs_signup}
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent px-3 py-2 text-small font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Joining…" : `Join ${invite.workspace_name}`}
        </button>
      </form>
    </>
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
