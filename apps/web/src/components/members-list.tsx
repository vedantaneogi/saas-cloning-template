"use client";

import { useState } from "react";
import { Avatar } from "@/components/icons";
import { patchMemberRole, type Member, type MemberRole } from "@/lib/api";

const ROLES: { value: MemberRole; label: string; tone: string }[] = [
  // Linear renders role badges as muted neutral pills, not error-red. Use the
  // accent for admin (the role with elevated rights) and a flat pill for the
  // rest so "Admin" doesn't read as a warning state.
  { value: "admin", label: "Admin", tone: "bg-accent/15 text-accent" },
  { value: "member", label: "Member", tone: "bg-pill text-text-secondary" },
  { value: "guest", label: "Guest", tone: "bg-pill text-text-tertiary" },
];

export function MembersList({ workspaceSlug, initialMembers }: { workspaceSlug: string; initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);

  async function setRole(id: string, role: MemberRole) {
    const prev = members;
    setMembers(members.map((m) => (m.id === id ? { ...m, role } : m)));
    try {
      await patchMemberRole(workspaceSlug, id, role);
    } catch {
      setMembers(prev);
    }
  }

  return (
    <ul className="mt-6 divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
      {members.map((m) => {
        const role = (m.role ?? "member") as MemberRole;
        const tone = ROLES.find((r) => r.value === role)?.tone ?? "bg-pill text-text-tertiary";
        return (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-small">
            <Avatar initials={m.initials} color={m.color} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-text-primary">{m.name}</div>
              {m.email && <div className="truncate text-mini text-text-tertiary">{m.email}</div>}
            </div>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(m.id, e.target.value as MemberRole)}
                className={`appearance-none rounded-sm px-1.5 py-0.5 text-micro outline-none ${tone}`}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-elevated text-text-primary">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </li>
        );
      })}
      {members.length === 0 && (
        <li className="px-4 py-6 text-center text-mini text-text-tertiary">No members.</li>
      )}
    </ul>
  );
}
