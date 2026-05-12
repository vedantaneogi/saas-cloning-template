"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, X } from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { importTeamCsv, teamCsvExportUrl } from "@/lib/api";

export function TeamCsvActions({
  workspaceSlug,
  teamKey,
}: {
  workspaceSlug: string;
  teamKey: string;
}) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<number | null>(null);

  async function submit() {
    if (!csv.trim() || busy) return;
    setBusy(true);
    try {
      const r = await importTeamCsv(workspaceSlug, teamKey, csv);
      setCreated(r.created);
      setCsv("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.readAsText(file);
  }

  return (
    <>
      <Popover
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            title="CSV import / export"
          >
            <Download size={14} />
          </button>
        )}
        align="end"
        width={180}
      >
        {({ close }) => (
          <PopoverList>
            <PopoverItem
              onClick={() => {
                close();
                window.open(teamCsvExportUrl(workspaceSlug, teamKey), "_blank");
              }}
            >
              <Download size={13} />
              Export as CSV
            </PopoverItem>
            <PopoverItem onClick={() => { close(); setImporting(true); }}>
              <Upload size={13} />
              Import from CSV
            </PopoverItem>
          </PopoverList>
        )}
      </Popover>

      {importing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24" onClick={() => setImporting(false)}>
          <div className="w-[560px] rounded-md border border-border-subtle bg-elevated shadow-popover" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2 text-small">
              <span className="font-medium text-text-primary">Import CSV — {teamKey}</span>
              <button onClick={() => setImporting(false)} className="text-text-tertiary hover:text-text-secondary">
                <X size={14} />
              </button>
            </header>
            <div className="p-3 text-small">
              <p className="mb-2 text-mini text-text-tertiary">
                Expected columns: <code>title, description, priority, estimate</code>. Paste CSV below or upload a file.
              </p>
              <label className="mb-2 flex items-center gap-2 text-mini text-text-tertiary">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                  className="text-text-secondary"
                />
              </label>
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={8}
                placeholder="title,description,priority,estimate&#10;Fix login bug,Repro: …,1,3"
                className="w-full rounded-md border border-border-subtle bg-app p-2 font-mono text-mini text-text-primary outline-none placeholder:text-text-tertiary"
              />
              {created != null && (
                <p className="mt-2 text-mini text-accent">Imported {created} issue{created === 1 ? "" : "s"}.</p>
              )}
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border-subtle px-3 py-2 text-mini">
              <button onClick={() => setImporting(false)} className="rounded-md px-2 py-1 text-text-tertiary hover:bg-row-hover">Close</button>
              <button onClick={submit} disabled={!csv.trim() || busy} className="rounded-md bg-accent px-3 py-1 text-white shadow-button disabled:opacity-50">
                {busy ? "Importing…" : "Import"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
