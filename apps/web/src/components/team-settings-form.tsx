"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { patchTeam, type EstimateScale, type Team } from "@/lib/api";

const SCALES: { value: EstimateScale; label: string; sample: string }[] = [
  { value: "fibonacci", label: "Fibonacci", sample: "1, 2, 3, 5, 8" },
  { value: "linear", label: "Linear", sample: "1, 2, 3, 4, 5" },
  { value: "exponential", label: "Exponential", sample: "1, 2, 4, 8, 16" },
  { value: "tshirt", label: "T-shirt", sample: "XS, S, M, L, XL" },
  { value: "none", label: "None", sample: "Estimate hidden" },
];

export function TeamSettingsForm({ workspaceSlug, team }: { workspaceSlug: string; team: Team }) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [iconColor, setIconColor] = useState(team.icon_color);
  const [cyclesEnabled, setCyclesEnabled] = useState(team.cycles_enabled);
  const [estimateScale, setEstimateScale] = useState<EstimateScale>((team.estimate_scale ?? "fibonacci") as EstimateScale);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== team.name ||
    iconColor !== team.icon_color ||
    cyclesEnabled !== team.cycles_enabled ||
    estimateScale !== ((team.estimate_scale ?? "fibonacci") as EstimateScale);

  function save() {
    startTransition(async () => {
      try {
        await patchTeam(workspaceSlug, team.key, {
          name,
          icon_color: iconColor,
          cycles_enabled: cyclesEnabled,
          estimate_scale: estimateScale,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-border-subtle p-4">
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border-default bg-app px-2 py-1 text-small text-text-primary outline-none focus:border-border-strong"
        />
      </Field>
      <Field label="Icon color">
        <input
          type="color"
          value={iconColor}
          onChange={(e) => setIconColor(e.target.value)}
          className="h-7 w-12 cursor-pointer rounded-md border border-border-default bg-app"
        />
        <span className="ml-2 font-mono text-mini text-text-tertiary">{iconColor}</span>
      </Field>
      <Field label="Cycles">
        <label className="flex items-center gap-2 text-small text-text-secondary">
          <input
            type="checkbox"
            checked={cyclesEnabled}
            onChange={(e) => setCyclesEnabled(e.target.checked)}
          />
          <span>Enable time-boxed cycles for this team</span>
        </label>
      </Field>
      <Field label="Estimates">
        <select
          value={estimateScale}
          onChange={(e) => setEstimateScale(e.target.value as EstimateScale)}
          className="rounded-md border border-border-default bg-app px-2 py-1 text-small text-text-primary outline-none focus:border-border-strong"
        >
          {SCALES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.sample}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-mini text-text-tertiary">Saved.</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-small">
      <span className="w-28 shrink-0 text-text-tertiary">{label}</span>
      <span className="flex flex-1 items-center">{children}</span>
    </div>
  );
}
