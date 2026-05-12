"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Copy, Check, Trash2 } from "lucide-react";
import {
  createInvite,
  listInvites,
  revokeInvite,
  type MemberRole,
  type PendingInvite,
} from "@/lib/api";

export function InviteMemberButton({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listInvites(workspaceSlug).then(setInvites).catch(() => setInvites([]));
  }, [open, workspaceSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const inv = await createInvite(workspaceSlug, { email: email.trim(), role });
      setInvites([inv, ...invites.filter((i) => i.id !== inv.id)]);
      setEmail("");
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg.includes("409") ? "This email is already a member." : "Could not send invite.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite?")) return;
    await revokeInvite(workspaceSlug, id);
    setInvites((cur) => cur.filter((i) => i.id !== id));
  }

  function copy(invite: PendingInvite) {
    const fullUrl = `${window.location.origin}${invite.accept_url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedToken(invite.token);
      setTimeout(() => setCopiedToken(null), 1500);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini font-medium text-white shadow-button hover:opacity-90"
      >
        <Plus size={12} /> Invite member
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]" onClick={() => setOpen(false)}>
          <div className="w-[520px] max-w-[92vw] rounded-xl bg-elevated shadow-popover" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between px-4 py-3">
              <h2 className="text-default font-semibold text-text-primary">Invite to workspace</h2>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-secondary">
                <X size={14} />
              </button>
            </header>
            <form onSubmit={submit} className="flex gap-2 px-4 pb-3">
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                className="flex-1 rounded-md bg-app px-2 py-1.5 text-small text-text-primary outline-none focus:ring-1 focus:ring-accent"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className="rounded-md bg-app px-2 py-1.5 text-small text-text-secondary outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="guest">Guest</option>
              </select>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Inviting…" : "Invite"}
              </button>
            </form>
            {error && <p className="px-4 pb-2 text-mini text-priority-urgent">{error}</p>}

            <div className="border-t border-border-subtle/60 px-4 py-3">
              <h3 className="mb-2 text-micro font-medium uppercase tracking-wider text-text-tertiary">
                Pending invites · {invites.length}
              </h3>
              {invites.length === 0 ? (
                <p className="text-mini text-text-quaternary">No pending invites.</p>
              ) : (
                <ul className="space-y-1">
                  {invites.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-2 rounded-md bg-pill px-2 py-1 text-mini">
                      <span className="flex-1 truncate text-text-secondary">{inv.email}</span>
                      <span className="rounded-sm bg-row-hover px-1.5 py-0.5 text-text-tertiary">{inv.role}</span>
                      <button
                        type="button"
                        onClick={() => copy(inv)}
                        className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                        title="Copy invite link"
                      >
                        {copiedToken === inv.token ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(inv.id)}
                        className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent"
                        title="Revoke"
                      >
                        <Trash2 size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
