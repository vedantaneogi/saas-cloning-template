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

  // Debounced search. Supports inline filters like `in:issues foo`,
  // `in:projects bar`, `team:ENG`, `@alex`.
  const parsed = useMemo(() => parseQuery(query), [query]);
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      try {
        const r = await workspaceSearch(workspaceSlug, parsed.term);
        setResults(filterResults(r, parsed));
        setSelected(0);
      } catch {
        setResults(null);
      }
    }, 120);
    return () => clearTimeout(handle);
  }, [parsed, workspaceSlug, open]);

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

  // Recent items: refreshed each time palette opens.
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  useEffect(() => {
    if (open && !query.trim()) {
      setRecents(loadRecents(workspaceSlug));
    }
  }, [open, query, workspaceSlug]);

  const groups = useMemo<{ title: string; items: AnyItem[] }[]>(() => {
    const out: { title: string; items: AnyItem[] }[] = [];
    if (!query.trim() && recents.length > 0) {
      out.push({
        title: "Recent",
        items: recents.map((r) => ({
          kind: "action",
          data: { id: `recent:${r.href}`, label: r.label, href: r.href, icon: <span className="text-text-tertiary">{r.icon ?? "↻"}</span> },
        })),
      });
    }
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
  }, [results, actions, recents, query]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const go = useCallback(
    (item: AnyItem) => {
      const href = hrefFor(item, workspaceSlug);
      if (href) {
        const label = labelFor(item);
        if (label && !href.startsWith("/" + workspaceSlug + "/inbox") && item.kind !== "action") {
          pushRecent(workspaceSlug, { href, label, icon: iconCharFor(item) });
        }
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

// --- Recents: small localStorage MRU per workspace ----------------------

type RecentEntry = { href: string; label: string; icon?: string };

function recentsKey(workspaceSlug: string) {
  return `linear-clone:recents:${workspaceSlug}`;
}

export function loadRecents(workspaceSlug: string): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(recentsKey(workspaceSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    return parsed.slice(0, 6);
  } catch {
    return [];
  }
}

export function pushRecent(workspaceSlug: string, entry: RecentEntry) {
  if (typeof window === "undefined") return;
  try {
    const cur = loadRecents(workspaceSlug);
    const next = [entry, ...cur.filter((r) => r.href !== entry.href)].slice(0, 6);
    window.localStorage.setItem(recentsKey(workspaceSlug), JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

function labelFor(item: AnyItem): string | null {
  switch (item.kind) {
    case "issue":
      return `${item.data.identifier} ${item.data.title}`;
    case "project":
      return `Project · ${item.data.name}`;
    case "team":
      return `${item.data.name} (${item.data.key})`;
    case "view":
      return `View · ${item.data.name}`;
    case "initiative":
      return `Initiative · ${item.data.name}`;
    case "document":
      return `${item.data.icon} ${item.data.title}`;
    case "member":
      return `${item.data.name}`;
    case "action":
      return item.data.label;
  }
}

type ParsedQuery = { term: string; only?: string; team?: string; member?: string };

function parseQuery(raw: string): ParsedQuery {
  const parts = (raw || "").split(/\s+/).filter(Boolean);
  let only: string | undefined;
  let team: string | undefined;
  let member: string | undefined;
  const remainder: string[] = [];
  for (const p of parts) {
    const low = p.toLowerCase();
    if (low.startsWith("in:")) only = low.slice(3);
    else if (low.startsWith("team:")) team = low.slice(5).toUpperCase();
    else if (p.startsWith("@")) member = p.slice(1).toLowerCase();
    else remainder.push(p);
  }
  return { term: remainder.join(" "), only, team, member };
}

function filterResults(r: import("@/lib/api").SearchResults, q: ParsedQuery): import("@/lib/api").SearchResults {
  let out = { ...r };
  if (q.only) {
    out = {
      issues: q.only.startsWith("issue") ? r.issues : [],
      projects: q.only.startsWith("project") ? r.projects : [],
      teams: q.only.startsWith("team") ? r.teams : [],
      members: q.only.startsWith("member") || q.only === "people" ? r.members : [],
      views: q.only === "view" || q.only === "views" ? r.views : [],
      initiatives: q.only === "initiative" || q.only === "initiatives" ? r.initiatives : [],
      documents: q.only === "doc" || q.only === "docs" || q.only === "documents" ? r.documents : [],
    };
  }
  if (q.team) {
    out = { ...out, issues: out.issues.filter((i) => i.team_key === q.team) };
  }
  if (q.member) {
    const matches = (name: string) => name.toLowerCase().includes(q.member!);
    out = { ...out, members: out.members.filter((m) => matches(m.name)) };
  }
  return out;
}

function iconCharFor(item: AnyItem): string {
  switch (item.kind) {
    case "issue":
      return "#";
    case "project":
      return "▢";
    case "team":
      return "•";
    case "view":
      return "⌘";
    case "initiative":
      return "⌖";
    case "document":
      return item.data.icon || "📄";
    case "member":
      return "@";
    default:
      return "↻";
  }
}
