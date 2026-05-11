"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Layers, Folders, Users, CircleUser, ArrowRight, Bookmark, Compass, FileText } from "lucide-react";
import clsx from "clsx";
import { Avatar, PriorityIcon, StatusIcon } from "@/components/icons";
import {
  workspaceSearch,
  type SearchResults,
  type SearchIssue,
  type SearchProject,
  type SearchTeam,
  type SearchInitiative,
  type SearchDocument,
  type SavedView,
  type Member,
} from "@/lib/api";

type AnyItem =
  | { kind: "issue"; data: SearchIssue }
  | { kind: "project"; data: SearchProject }
  | { kind: "team"; data: SearchTeam }
  | { kind: "member"; data: Member }
  | { kind: "view"; data: SavedView }
  | { kind: "initiative"; data: SearchInitiative }
  | { kind: "document"; data: SearchDocument }
  | { kind: "action"; data: { id: string; label: string; href: string; icon: React.ReactNode } };

export function CommandPalette({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K and "/" shortcut + custom open event
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, [contenteditable=true]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onOpenEvent);
    };
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setSelected(0);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      try {
        const r = await workspaceSearch(workspaceSlug, query);
        setResults(r);
        setSelected(0);
      } catch {
        setResults(null);
      }
    }, 120);
    return () => clearTimeout(handle);
  }, [query, workspaceSlug, open]);

  const actions: AnyItem[] = useMemo(
    () =>
      query.trim()
        ? []
        : [
            { kind: "action", data: { id: "inbox", label: "Go to Inbox", href: `/${workspaceSlug}/inbox`, icon: <ArrowRight size={13} /> } },
            { kind: "action", data: { id: "my", label: "Go to My issues", href: `/${workspaceSlug}/my/assigned`, icon: <ArrowRight size={13} /> } },
            { kind: "action", data: { id: "roadmap", label: "Go to Roadmap", href: `/${workspaceSlug}/roadmap`, icon: <ArrowRight size={13} /> } },
            { kind: "action", data: { id: "initiatives", label: "Go to Initiatives", href: `/${workspaceSlug}/initiatives`, icon: <ArrowRight size={13} /> } },
            { kind: "action", data: { id: "projects", label: "Go to Projects", href: `/${workspaceSlug}/projects`, icon: <ArrowRight size={13} /> } },
            { kind: "action", data: { id: "documents", label: "Go to Documents", href: `/${workspaceSlug}/documents`, icon: <ArrowRight size={13} /> } },
            { kind: "action", data: { id: "customer-requests", label: "Go to Customer requests", href: `/${workspaceSlug}/customer-requests`, icon: <ArrowRight size={13} /> } },
          ],
    [query, workspaceSlug]
  );

  const groups = useMemo<{ title: string; items: AnyItem[] }[]>(() => {
    const out: { title: string; items: AnyItem[] }[] = [];
    if (actions.length) out.push({ title: "Navigate", items: actions });
    if (results) {
      if (results.issues.length) out.push({ title: "Issues", items: results.issues.map((d) => ({ kind: "issue", data: d })) });
      if (results.initiatives?.length) out.push({ title: "Initiatives", items: results.initiatives.map((d) => ({ kind: "initiative", data: d })) });
      if (results.projects.length) out.push({ title: "Projects", items: results.projects.map((d) => ({ kind: "project", data: d })) });
      if (results.documents?.length) out.push({ title: "Documents", items: results.documents.map((d) => ({ kind: "document", data: d })) });
      if (results.views.length) out.push({ title: "Views", items: results.views.map((d) => ({ kind: "view", data: d })) });
      if (results.teams.length) out.push({ title: "Teams", items: results.teams.map((d) => ({ kind: "team", data: d })) });
      if (results.members.length) out.push({ title: "Members", items: results.members.map((d) => ({ kind: "member", data: d })) });
    }
    return out;
  }, [results, actions]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const go = useCallback(
    (item: AnyItem) => {
      const href = hrefFor(item, workspaceSlug);
      if (href) {
        setOpen(false);
        router.push(href);
      }
    },
    [router, workspaceSlug]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(flat.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        const item = flat[selected];
        if (item) {
          e.preventDefault();
          go(item);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, selected, go]);

  if (!open) return null;

  let cursor = -1;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[640px] max-w-[90vw] overflow-hidden rounded-lg border border-border-default bg-elevated shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3.5 py-2.5">
          <Search size={14} className="text-text-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-small text-text-primary outline-none placeholder:text-text-quaternary"
          />
          <kbd className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-micro text-text-tertiary">
            esc
          </kbd>
        </div>

        <div className="max-h-[min(60vh,440px)] overflow-y-auto py-2">
          {groups.length === 0 && (
            <div className="px-3.5 py-6 text-center text-mini text-text-tertiary">No results</div>
          )}
          {groups.map((g) => (
            <div key={g.title} className="mb-1">
              <div className="px-3.5 pb-1 pt-2 text-micro font-medium uppercase tracking-wider text-text-tertiary">
                {g.title}
              </div>
              {g.items.map((item) => {
                cursor += 1;
                const idx = cursor;
                return (
                  <button
                    key={`${item.kind}:${idKey(item)}`}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => go(item)}
                    className={clsx(
                      "flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-small",
                      selected === idx ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover"
                    )}
                  >
                    <ItemContent item={item} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemContent({ item }: { item: AnyItem }) {
  if (item.kind === "issue") {
    return (
      <>
        <PriorityIcon value={item.data.priority} />
        <StatusIcon group={item.data.state_group} />
        <span className="font-mono text-mini text-text-tertiary">{item.data.identifier}</span>
        <span className="truncate">{item.data.title}</span>
      </>
    );
  }
  if (item.kind === "project") {
    return (
      <>
        <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: item.data.icon_color }} />
        <span className="truncate">{item.data.name}</span>
        <span className="ml-auto text-mini text-text-tertiary">Project</span>
      </>
    );
  }
  if (item.kind === "team") {
    return (
      <>
        <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: item.data.icon_color }} />
        <span className="truncate">{item.data.name}</span>
        <span className="ml-auto font-mono text-mini text-text-tertiary">{item.data.key}</span>
      </>
    );
  }
  if (item.kind === "member") {
    return (
      <>
        <Avatar initials={item.data.initials} color={item.data.color} size={14} />
        <span className="truncate">{item.data.name}</span>
        <span className="ml-auto text-mini text-text-tertiary">Member</span>
      </>
    );
  }
  if (item.kind === "view") {
    return (
      <>
        <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: item.data.icon_color }} />
        <Bookmark size={11} className="text-text-tertiary" />
        <span className="truncate">{item.data.name}</span>
        <span className="ml-auto text-mini text-text-tertiary">Saved view</span>
      </>
    );
  }
  if (item.kind === "initiative") {
    return (
      <>
        <span
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
          style={{ background: item.data.icon_color }}
        >
          <Compass size={9} className="text-white/80" />
        </span>
        <span className="truncate">{item.data.name}</span>
        <span className="ml-auto text-mini text-text-tertiary">Initiative</span>
      </>
    );
  }
  if (item.kind === "document") {
    return (
      <>
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-mini">
          {item.data.icon}
        </span>
        <FileText size={11} className="text-text-tertiary" />
        <span className="truncate">{item.data.title}</span>
        <span className="ml-auto text-mini text-text-tertiary">
          {item.data.project_name ? `Doc · ${item.data.project_name}` : "Document"}
        </span>
      </>
    );
  }
  return (
    <>
      <span className="text-text-tertiary">{item.data.icon}</span>
      <span className="truncate">{item.data.label}</span>
    </>
  );
}

function hrefFor(item: AnyItem, workspaceSlug: string): string | null {
  switch (item.kind) {
    case "issue":
      return `/${workspaceSlug}/issue/${item.data.identifier}`;
    case "project":
      return `/${workspaceSlug}/project/${item.data.slug_id}`;
    case "team":
      return `/${workspaceSlug}/team/${item.data.key}/active`;
    case "view":
      return `/${workspaceSlug}/view/${item.data.id}`;
    case "initiative":
      return `/${workspaceSlug}/initiative/${item.data.slug_id}`;
    case "document":
      return `/${workspaceSlug}/document/${item.data.slug_id}`;
    case "action":
      return item.data.href;
    case "member":
      // No member detail page yet — drop to my-issues filtered as a stand-in
      return `/${workspaceSlug}/my/assigned`;
  }
}

function idKey(item: AnyItem): string {
  if (item.kind === "action") return item.data.id;
  return (item.data as { id: string }).id;
}
