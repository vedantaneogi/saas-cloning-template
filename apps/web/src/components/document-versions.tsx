"use client";

import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { listDocVersions, restoreDocVersion, type DocumentVersion } from "@/lib/api";
import { Avatar } from "@/components/icons";
import { relTime } from "@/lib/time";

export function DocumentVersions({
  workspaceSlug,
  docSlug,
  onClose,
  onRestored,
}: {
  workspaceSlug: string;
  docSlug: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    listDocVersions(workspaceSlug, docSlug).then((vs) => {
      setVersions(vs);
      setSelectedId(vs[0]?.id ?? null);
    });
  }, [workspaceSlug, docSlug]);

  const selected = versions.find((v) => v.id === selectedId);

  async function restore(v: DocumentVersion) {
    if (!confirm(`Restore version ${v.version}? Current body will be archived as a new version.`)) return;
    setBusy(true);
    try {
      await restoreDocVersion(workspaceSlug, docSlug, v.id);
      onRestored();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-border-subtle bg-elevated/40">
      <header className="flex h-[44px] items-center gap-2 border-b border-border-subtle px-3 text-mini text-text-tertiary">
        <span className="font-medium text-text-secondary">Version history</span>
        <span>{versions.length}</span>
        <button onClick={onClose} className="ml-auto rounded-sm p-1 hover:bg-row-hover hover:text-text-secondary">
          <X size={12} />
        </button>
      </header>
      {versions.length === 0 ? (
        <div className="p-4 text-mini text-text-tertiary">
          No prior versions yet. Versions are captured automatically when you change the body.
        </div>
      ) : (
        <ul className="max-h-[240px] overflow-y-auto border-b border-border-subtle">
          {versions.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => setSelectedId(v.id)}
                className={
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-mini " +
                  (selectedId === v.id ? "bg-row-selected" : "hover:bg-row-hover")
                }
              >
                <span className="font-mono text-text-tertiary">v{v.version}</span>
                <span className="flex-1 truncate text-text-secondary">{v.title || "(untitled)"}</span>
                {v.author && <Avatar initials={v.author.initials} color={v.author.color} size={14} />}
                <span className="text-text-tertiary">{relTime(v.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-3 py-2 text-mini text-text-tertiary">
            <span>Preview of v{selected.version}</span>
            <button
              disabled={busy}
              onClick={() => restore(selected)}
              className="ml-auto flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini text-white hover:opacity-90 disabled:opacity-50"
            >
              <RotateCcw size={11} /> Restore
            </button>
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words border-t border-border-subtle p-3 font-mono text-mini text-text-secondary">
{selected.body || "(empty)"}
          </pre>
        </div>
      )}
    </aside>
  );
}
