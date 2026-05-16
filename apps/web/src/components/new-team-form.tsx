"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Folders } from "lucide-react";
import { Popover } from "@/components/popover";
import { createTeam } from "@/lib/api";

const COLOR_SWATCHES = [
  "#5e6ad2", "#4ea7fc", "#26b5ce", "#22c55e", "#d9b34c",
  "#f2994a", "#eb5757", "#bc7cf0", "#95a2b3", "#f2c94c",
];

function autoKey(name: string) {
  const letters = (name.match(/\b[A-Za-z]/g) ?? []).slice(0, 4).join("").toUpperCase();
  return letters || name.slice(0, 4).toUpperCase();
}

export function NewTeamForm({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [iconColor, setIconColor] = useState("#22c55e");
  const [cyclesEnabled, setCyclesEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewKey = keyTouched ? key.toUpperCase() : autoKey(name);
  const canSubmit = name.trim().length > 0 && previewKey.length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const team = await createTeam(workspaceSlug, {
        key: previewKey,
        name: name.trim(),
        icon_color: iconColor,
        cycles_enabled: cyclesEnabled,
      });
      router.push(`/${workspaceSlug}/team/${team.key}/active`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create team.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
        <FieldRow label="Team icon">
          <Popover
            align="end"
            width={180}
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label="Pick team color"
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm transition-opacity hover:opacity-90"
                style={{ background: iconColor }}
              >
                <Folders size={13} className="text-white/85" />
              </button>
            )}
          >
            {({ close }) => (
              <div className="grid grid-cols-5 gap-1.5 p-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setIconColor(c); close(); }}
                    aria-label={`Color ${c}`}
                    className={clsx(
                      "h-6 w-6 rounded-sm",
                      iconColor === c && "ring-2 ring-white/40 ring-offset-1 ring-offset-elevated",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}
          </Popover>
        </FieldRow>

        <FieldRow label="Team name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="e.g. Engineering"
            className="w-[260px] rounded-md bg-input px-2.5 py-1.5 text-small text-text-primary outline-none placeholder:text-text-quaternary focus:ring-1 focus:ring-border-strong"
          />
        </FieldRow>

        <FieldRow
          label="Identifier"
          hint="Used to identify issues from this team (e.g. ENG-123)"
        >
          <input
            value={keyTouched ? key : previewKey}
            onChange={(e) => {
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5));
              setKeyTouched(true);
            }}
            placeholder="e.g. ENG"
            maxLength={5}
            className="w-[120px] rounded-md bg-input px-2.5 py-1.5 font-mono text-small uppercase tracking-wider text-text-primary outline-none placeholder:text-text-quaternary focus:ring-1 focus:ring-border-strong"
          />
        </FieldRow>
      </div>

      {error && (
        <p className="mt-3 text-mini text-priority-urgent">{error}</p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-md bg-accent px-3.5 py-1.5 text-small font-medium text-white shadow-button hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create team"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-small text-text-primary">{label}</div>
        {hint && <div className="mt-0.5 text-mini text-text-tertiary">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
