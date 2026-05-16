"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Search, X } from "lucide-react";
import { SearchControls } from "@/components/search-controls";
import { useSearchPrefs, type SearchTab } from "@/lib/search-prefs";
import { workspaceSearch, type SearchResults } from "@/lib/api";

const TABS: { value: SearchTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "issues", label: "Issues" },
  { value: "projects", label: "Projects" },
  { value: "documents", label: "Documents" },
];

const PLACEHOLDERS: Record<SearchTab, string> = {
  all: "Search issues, projects, and documents...",
  issues: "Search issues...",
  projects: "Search projects...",
  documents: "Search by describing your document...",
};

/**
 * Workspace-wide search. Different from the ⌘K command palette: this
 * lives at /[workspace]/search, has Linear-style All/Issues/Projects/
 * Documents tabs, filter funnel, display options, and "Recent searches"
 * empty state. Recents persist in localStorage via useSearchPrefs.
 */
export function SearchPage({ workspaceSlug }: { workspaceSlug: string }) {
  const { prefs, update, recordRecent, removeRecent, clearRecents } = useSearchPrefs(workspaceSlug);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search. Trim short queries so the API isn't pummeled while
  // the user is still typing the second character.
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      workspaceSearch(workspaceSlug, q, 25)
        .then((res) => setResults(res))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, workspaceSlug]);

  // Record a recent after the user has stopped typing for ~1.5s with a
  // non-trivial query. Avoids cluttering history with partial typos.
  useEffect(() => {
    if (recordTimer.current) clearTimeout(recordTimer.current);
    const q = query.trim();
    if (q.length < 2) return;
    recordTimer.current = setTimeout(() => recordRecent(q), 1500);
    return () => {
      if (recordTimer.current) clearTimeout(recordTimer.current);
    };
  }, [query, recordRecent]);

  function pickRecent(q: string) {
    setQuery(q);
    inputRef.current?.focus();
  }

  const filtered = applyTabFilter(results, prefs.tab);
  const hasFilteredResults =
    filtered &&
    (filtered.issues.length +
      filtered.projects.length +
      filtered.documents.length +
      filtered.initiatives.length +
      filtered.teams.length +
      filtered.members.length >
      0);

  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <Search size={14} className="text-text-tertiary" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={PLACEHOLDERS[prefs.tab]}
          className="flex-1 bg-transparent text-default text-text-primary placeholder:text-text-quaternary focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border-subtle px-5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update({ tab: t.value })}
            className={clsx(
              "rounded-pill border px-3 py-1 text-mini transition-colors",
              prefs.tab === t.value
                ? "border-border-strong bg-row-selected text-text-primary"
                : "border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto">
          <SearchControls workspaceSlug={workspaceSlug} />
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {query.trim() === "" ? (
          <RecentSearches
            recents={prefs.recents}
            onPick={pickRecent}
            onRemove={removeRecent}
            onClear={clearRecents}
          />
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-small text-text-tertiary">
            Searching…
          </div>
        ) : !hasFilteredResults ? (
          <div className="flex h-full items-center justify-center text-small text-text-tertiary">
            No results for &ldquo;{query.trim()}&rdquo;.
          </div>
        ) : (
          <ResultGroups
            results={filtered!}
            workspaceSlug={workspaceSlug}
            tab={prefs.tab}
            showId={prefs.show_id}
          />
        )}
      </div>
    </>
  );
}

function RecentSearches({
  recents,
  onPick,
  onRemove,
  onClear,
}: {
  recents: string[];
  onPick: (q: string) => void;
  onRemove: (q: string) => void;
  onClear: () => void;
}) {
  if (recents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-small text-text-tertiary">
        Recent searches will appear here.
      </div>
    );
  }
  return (
    <div className="px-5 pt-5">
      <h2 className="pb-2 text-small text-text-tertiary">Recent searches</h2>
      <ul>
        {recents.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => onPick(q)}
              className="group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-small text-text-primary hover:bg-row-hover"
            >
              <Search size={13} className="text-text-tertiary" />
              <span className="flex-1 truncate">{q}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(q);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(q);
                  }
                }}
                aria-label={`Remove ${q} from history`}
                className="rounded-md p-1 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-elevated-hover hover:text-text-secondary"
              >
                <X size={11} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClear}
        className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-small text-text-secondary hover:bg-row-hover"
      >
        <X size={13} className="text-text-tertiary" />
        <span>Clear History</span>
      </button>
    </div>
  );
}

function ResultGroups({
  results,
  workspaceSlug,
  tab,
  showId,
}: {
  results: SearchResults;
  workspaceSlug: string;
  tab: SearchTab;
  showId: boolean;
}) {
  const showIssues = tab === "all" || tab === "issues";
  const showProjects = tab === "all" || tab === "projects";
  const showDocuments = tab === "all" || tab === "documents";
  return (
    <div className="divide-y divide-border-subtle">
      {showIssues && results.issues.length > 0 && (
        <ResultSection title="Issues" count={results.issues.length}>
          {results.issues.map((i) => (
            <Link
              key={i.id}
              href={`/${workspaceSlug}/issue/${i.identifier}`}
              className="flex items-center gap-3 px-5 py-2 text-small hover:bg-row-hover"
            >
              {showId && (
                <span className="w-[72px] shrink-0 font-mono text-mini text-text-tertiary">{i.identifier}</span>
              )}
              <span className="flex-1 truncate text-text-primary">{i.title}</span>
              <span className="ml-2 shrink-0 text-mini text-text-tertiary">{i.state_name}</span>
            </Link>
          ))}
        </ResultSection>
      )}
      {showProjects && results.projects.length > 0 && (
        <ResultSection title="Projects" count={results.projects.length}>
          {results.projects.map((p) => (
            <Link
              key={p.id}
              href={`/${workspaceSlug}/project/${p.slug_id}`}
              className="flex items-center gap-3 px-5 py-2 text-small hover:bg-row-hover"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ background: p.icon_color }}
              />
              <span className="flex-1 truncate text-text-primary">{p.name}</span>
            </Link>
          ))}
        </ResultSection>
      )}
      {showDocuments && results.documents.length > 0 && (
        <ResultSection title="Documents" count={results.documents.length}>
          {results.documents.map((d) => (
            <Link
              key={d.id}
              href={`/${workspaceSlug}/document/${d.slug_id}`}
              className="flex items-center gap-3 px-5 py-2 text-small hover:bg-row-hover"
            >
              <span className="text-text-tertiary">{d.icon ?? "📄"}</span>
              <span className="flex-1 truncate text-text-primary">{d.title}</span>
            </Link>
          ))}
        </ResultSection>
      )}
      {tab === "all" && results.initiatives.length > 0 && (
        <ResultSection title="Initiatives" count={results.initiatives.length}>
          {results.initiatives.map((i) => (
            <Link
              key={i.id}
              href={`/${workspaceSlug}/initiative/${i.slug_id}`}
              className="flex items-center gap-3 px-5 py-2 text-small hover:bg-row-hover"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ background: i.icon_color }}
              />
              <span className="flex-1 truncate text-text-primary">{i.name}</span>
            </Link>
          ))}
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-center gap-2 px-5 pb-1.5 pt-4 text-mini font-medium uppercase tracking-wider text-text-tertiary">
        <span>{title}</span>
        <span className="text-text-quaternary">{count}</span>
      </header>
      <div>{children}</div>
    </section>
  );
}

/**
 * Apply the active tab filter on the API's grouped response. The
 * endpoint always returns all categories; we drop the ones outside the
 * current tab so display + counts stay coherent.
 */
function applyTabFilter(results: SearchResults | null, tab: SearchTab): SearchResults | null {
  if (!results) return null;
  if (tab === "all") return results;
  return {
    issues: tab === "issues" ? results.issues : [],
    projects: tab === "projects" ? results.projects : [],
    documents: tab === "documents" ? results.documents : [],
    initiatives: [],
    teams: [],
    members: [],
    views: [],
  };
}
