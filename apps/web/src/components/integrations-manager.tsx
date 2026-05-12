"use client";

import { useState } from "react";
import { Github, MessageSquare, Frame, Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteIntegration,
  upsertIntegration,
  type Integration,
  type IntegrationKind,
  type Team,
} from "@/lib/api";

const KIND_META: Record<IntegrationKind, { label: string; icon: typeof Github; description: string }> = {
  github: {
    label: "GitHub",
    icon: Github,
    description: "PR + push webhook. Branches and PRs that reference an issue identifier (e.g. ENG-12) auto-link with status updates on merge.",
  },
  slack: {
    label: "Slack",
    icon: MessageSquare,
    description: "Inbound JSON webhook. POST {secret, team_key, title, body, actor} to create a triage issue.",
  },
  figma: {
    label: "Figma",
    icon: Frame,
    description: "Figma URLs in issue links render as embedded frames in the issue detail panel. No webhook secret required.",
  },
};

const KINDS: IntegrationKind[] = ["github", "slack", "figma"];

function randomSecret() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().replace(/-/g, "");
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function IntegrationsManager({
  workspaceSlug,
  initial,
  teams,
  baseUrl,
}: {
  workspaceSlug: string;
  initial: Integration[];
  teams: Team[];
  baseUrl: string;
}) {
  const [items, setItems] = useState<Integration[]>(initial);

  return (
    <div className="mt-5 space-y-4">
      {KINDS.map((kind) => {
        const existing = items.find((i) => i.kind === kind);
        return (
          <IntegrationCard
            key={kind}
            kind={kind}
            existing={existing}
            workspaceSlug={workspaceSlug}
            baseUrl={baseUrl}
            teams={teams}
            onUpdate={(next) => {
              setItems((prev) => {
                const without = prev.filter((p) => p.kind !== next.kind);
                return [...without, next];
              });
            }}
            onDelete={() => {
              setItems((prev) => prev.filter((p) => p.kind !== kind));
            }}
          />
        );
      })}
    </div>
  );
}

function IntegrationCard({
  kind,
  existing,
  workspaceSlug,
  baseUrl,
  teams,
  onUpdate,
  onDelete,
}: {
  kind: IntegrationKind;
  existing: Integration | undefined;
  workspaceSlug: string;
  baseUrl: string;
  teams: Team[];
  onUpdate: (n: Integration) => void;
  onDelete: () => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const [secretInput, setSecretInput] = useState("");
  const [defaultTeam, setDefaultTeam] = useState<string>((existing?.config?.default_team_key as string) || (teams[0]?.key ?? ""));
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = kind === "figma" ? null : `${baseUrl}/api/webhooks/${kind}/${workspaceSlug}`;
  const enabled = !!existing?.enabled;

  async function generate() {
    setBusy(true);
    try {
      const secret = randomSecret();
      const config: Record<string, unknown> = { secret };
      if (kind === "slack" && defaultTeam) config.default_team_key = defaultTeam;
      const next = await upsertIntegration(workspaceSlug, { kind, config, enabled: true });
      // server obscures the secret on read — we got the real one in the create response only
      onUpdate({ ...next, config: { ...next.config, secret } });
      setSecretInput(secret);
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    try {
      const next = await upsertIntegration(workspaceSlug, { kind, config: existing?.config ?? {}, enabled: true });
      onUpdate(next);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const next = await upsertIntegration(workspaceSlug, { kind, config: existing?.config ?? {}, enabled: false });
      onUpdate(next);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!confirm(`Remove ${meta.label} integration?`)) return;
    await deleteIntegration(workspaceSlug, existing.id);
    onDelete();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="rounded-md border border-border-subtle bg-elevated/30 p-4">
      <header className="flex items-center gap-3">
        <Icon size={18} className="text-text-secondary" />
        <h2 className="text-default font-semibold text-text-primary">{meta.label}</h2>
        <span className={
          "rounded-sm px-1.5 py-0.5 text-mini " + (enabled ? "bg-accent text-white" : "bg-pill text-text-tertiary")
        }>
          {existing ? (enabled ? "Connected" : "Disabled") : "Not configured"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {existing && (
            <button onClick={enabled ? disable : enable} disabled={busy} className="rounded-md border border-border-subtle px-2 py-0.5 text-mini text-text-secondary hover:bg-elevated-hover disabled:opacity-50">
              {enabled ? "Disable" : "Enable"}
            </button>
          )}
          {existing && (
            <button onClick={remove} className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent" title="Remove">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </header>
      <p className="mt-2 text-mini text-text-tertiary">{meta.description}</p>

      {url && (
        <div className="mt-3 grid grid-cols-[max-content_1fr_auto] items-center gap-2 text-mini">
          <span className="text-text-tertiary">Webhook URL:</span>
          <code className="rounded-sm bg-app px-2 py-1 font-mono text-text-primary">{url}</code>
          <button onClick={() => copy(url)} className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" title="Copy">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      )}

      {kind === "slack" && teams.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-mini">
          <span className="text-text-tertiary">Default team for new triage:</span>
          <select
            value={defaultTeam}
            onChange={(e) => setDefaultTeam(e.target.value)}
            className="rounded-md bg-app px-2 py-1 text-text-secondary outline-none focus:ring-1 focus:ring-accent"
          >
            {teams.map((t) => (
              <option key={t.key} value={t.key}>{t.key} — {t.name}</option>
            ))}
          </select>
        </div>
      )}

      {kind !== "figma" && (
        <div className="mt-3 flex items-center gap-2 text-mini">
          <span className="text-text-tertiary">Secret:</span>
          {secretInput ? (
            <>
              <code className="rounded-sm bg-app px-2 py-1 font-mono text-text-primary">{secretInput}</code>
              <button onClick={() => copy(secretInput)} className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary" title="Copy">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <span className="text-text-quaternary">(visible until you reload)</span>
            </>
          ) : existing && existing.config?.secret ? (
            <span className="text-text-tertiary">••••••••</span>
          ) : (
            <span className="text-text-tertiary">No secret yet.</span>
          )}
          <button
            onClick={generate}
            disabled={busy}
            className="ml-auto flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-white shadow-button hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={11} /> {existing?.config?.secret ? "Rotate" : "Generate"}
          </button>
        </div>
      )}
    </section>
  );
}
