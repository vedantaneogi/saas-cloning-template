"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/Dialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { TemplateSidebar } from "@/features/templates/components/TemplateSidebar";
import { TemplateList } from "@/features/templates/components/TemplateList";
import { getTemplates, createTemplate } from "@/features/templates/api";
import { createEnvelope } from "@/features/envelopes/api";
import { SlidersHorizontal, X, MagnifyingGlass, DotsSixVertical } from "@phosphor-icons/react";
import { useToast, ToastContainer } from "@/components/ui/Toast";

const PRIMARY_COLOR = "#260559";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

type SectionId = "my-templates" | "shared" | "favorites";

const SECTION_LABELS: Record<SectionId, string> = {
  "my-templates": "My Templates",
  shared: "Shared with Me",
  favorites: "Favorites",
};

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toasts, addToast, dismissToast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionId>("my-templates");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [customizeColumnsOpen, setCustomizeColumnsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [columns, setColumns] = useState([
    { id: "favorites", label: "Favorites", enabled: true },
    { id: "name", label: "Name", enabled: false },
    { id: "owner", label: "Owner", enabled: true },
    { id: "createdDate", label: "Created Date", enabled: true },
    { id: "lastChange", label: "Last Change", enabled: true },
  ]);
  const [pendingColumns, setPendingColumns] = useState(columns);

  // Date filter dropdown
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [pendingDateFilter, setPendingDateFilter] = useState<string | null>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Advanced search dropdown
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState("Template name");
  const [pendingSearchType, setPendingSearchType] = useState("Template name");
  const advancedSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dateDropdownOpen && dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
      if (advancedSearchOpen && advancedSearchRef.current && !advancedSearchRef.current.contains(e.target as Node)) {
        setAdvancedSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [dateDropdownOpen, advancedSearchOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ["templates", activeSection, search, page, perPage],
    queryFn: () => getTemplates({ filter: activeSection, search, page, perPage }),
    placeholderData: (prev) => prev,
    staleTime: 0,
  });

  const templates = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const createMut = useMutation({
    mutationFn: () => createTemplate({ name: newTemplateName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowCreateDialog(false);
      setNewTemplateName("");
    },
  });

  // Create a draft envelope and navigate to prepare page in template mode
  const createTemplateMut = useMutation({
    mutationFn: () =>
      createEnvelope({ subject: "Untitled Template", message: "", recipients: [] }),
    onSuccess: (envelope) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/envelope/${envelope.id}/prepare?mode=template`);
    },
    onError: () => {
      addToast("Failed to start template creation. Please try again.", "error");
    },
  });

  const handleSectionChange = (section: string) => {
    setActiveSection(section as SectionId);
    setPage(1);
    setSearch("");
  };

  const searchPlaceholder =
    activeSection === "my-templates"
      ? "Search My Templates"
      : activeSection === "shared"
      ? "Search Shared Templates"
      : "Search Favorites";

  return (
    <>
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ fontFamily: DS_FONT }}>
      <TemplateSidebar
        activeSection={activeSection}
        onSection={handleSectionChange}
        onCreateTemplate={() => createTemplateMut.mutate()}
      />

      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: "white" }}
      >
        {/* Header row */}
        <div
          className="px-6 pt-5 pb-0"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 400,
                color: PRIMARY_TEXT,
                fontFamily: DS_FONT,
                margin: 0,
              }}
            >
              {SECTION_LABELS[activeSection]}
            </h1>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 pb-3 flex-wrap">
            {/* Search */}
            <SearchInput
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64"
            />

            {/* Date filter */}
            <div ref={dateDropdownRef} style={{ position: "relative" }}>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors"
                style={{
                  borderColor: activeDateFilter ? PRIMARY_COLOR : BORDER_COLOR,
                  color: activeDateFilter ? PRIMARY_COLOR : SECONDARY_TEXT,
                  background: activeDateFilter ? "rgba(38,5,89,0.06)" : "white",
                  borderRadius: "4px",
                  fontFamily: DS_FONT,
                }}
                onClick={() => {
                  setPendingDateFilter(activeDateFilter);
                  setDateDropdownOpen((v) => !v);
                  setAdvancedSearchOpen(false);
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = activeDateFilter ? "rgba(38,5,89,0.10)" : "rgba(19,0,50,0.03)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = activeDateFilter ? "rgba(38,5,89,0.06)" : "white")
                }
              >
                {activeDateFilter ? `Date: ${activeDateFilter}` : "Date"}
                {activeDateFilter ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDateFilter(null);
                      setPendingDateFilter(null);
                      setDateDropdownOpen(false);
                    }}
                    style={{ display: "flex", alignItems: "center", marginLeft: "2px", color: PRIMARY_COLOR }}
                    title="Clear date filter"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M7 10l5 5 5-5H7z" />
                  </svg>
                )}
              </button>

              {dateDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 200,
                    background: "white",
                    border: "1px solid rgba(19,0,50,0.1)",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    padding: "16px",
                    minWidth: "220px",
                    fontFamily: DS_FONT,
                  }}
                >
                  {["All time", "Last 12 months", "Last 6 months", "Last 30 days", "Last week", "Last 24 hours"].map((opt) => (
                    <label
                      key={opt}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", cursor: "pointer" }}
                    >
                      <span
                        onClick={() => setPendingDateFilter(opt === "All time" ? null : opt)}
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          border: `1.5px solid ${pendingDateFilter === opt || (opt === "All time" && !pendingDateFilter) ? PRIMARY_COLOR : "rgba(19,0,50,0.3)"}`,
                          background: pendingDateFilter === opt || (opt === "All time" && !pendingDateFilter) ? PRIMARY_COLOR : "white",
                          display: "inline-block",
                          flexShrink: 0,
                          cursor: "pointer",
                          boxSizing: "border-box",
                          position: "relative",
                        }}
                      >
                        {(pendingDateFilter === opt || (opt === "All time" && !pendingDateFilter)) && (
                          <span style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "white",
                            display: "block",
                          }} />
                        )}
                      </span>
                      <span
                        onClick={() => setPendingDateFilter(opt === "All time" ? null : opt)}
                        style={{ fontSize: "14px", color: PRIMARY_TEXT }}
                      >
                        {opt}
                      </span>
                    </label>
                  ))}

                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setActiveDateFilter(null);
                        setPendingDateFilter(null);
                        setDateDropdownOpen(false);
                      }}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: "4px",
                        border: `1px solid ${BORDER_COLOR}`,
                        background: "white",
                        color: PRIMARY_TEXT,
                        fontSize: "13px",
                        cursor: "pointer",
                        fontFamily: DS_FONT,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "white")}
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        setActiveDateFilter(pendingDateFilter);
                        setDateDropdownOpen(false);
                      }}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: "4px",
                        border: "none",
                        background: PRIMARY_COLOR,
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: DS_FONT,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
                      onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced search filter */}
            <div ref={advancedSearchRef} style={{ position: "relative" }}>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors"
                style={{
                  borderColor: activeSearchType !== "Template name" ? PRIMARY_COLOR : BORDER_COLOR,
                  color: activeSearchType !== "Template name" ? PRIMARY_COLOR : SECONDARY_TEXT,
                  background: activeSearchType !== "Template name" ? "rgba(38,5,89,0.06)" : "white",
                  borderRadius: "4px",
                  fontFamily: DS_FONT,
                }}
                onClick={() => {
                  setPendingSearchType(activeSearchType);
                  setAdvancedSearchOpen((v) => !v);
                  setDateDropdownOpen(false);
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = activeSearchType !== "Template name" ? "rgba(38,5,89,0.10)" : "rgba(19,0,50,0.03)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = activeSearchType !== "Template name" ? "rgba(38,5,89,0.06)" : "white")
                }
              >
                {activeSearchType !== "Template name" ? `Search: ${activeSearchType}` : "Advanced search"}
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>

              {advancedSearchOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 200,
                    background: "white",
                    border: "1px solid rgba(19,0,50,0.1)",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    padding: "16px",
                    minWidth: "260px",
                    fontFamily: DS_FONT,
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: MUTED_TEXT, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Advanced search
                  </div>

                  {["Template name", "Template ID", "Owner name and email", "Recipient name and email"].map((opt) => (
                    <label
                      key={opt}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", cursor: "pointer" }}
                    >
                      <span
                        onClick={() => setPendingSearchType(opt)}
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          border: `1.5px solid ${pendingSearchType === opt ? PRIMARY_COLOR : "rgba(19,0,50,0.3)"}`,
                          background: pendingSearchType === opt ? PRIMARY_COLOR : "white",
                          display: "inline-block",
                          flexShrink: 0,
                          cursor: "pointer",
                          boxSizing: "border-box",
                          position: "relative",
                        }}
                      >
                        {pendingSearchType === opt && (
                          <span style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "white",
                            display: "block",
                          }} />
                        )}
                      </span>
                      <span
                        onClick={() => setPendingSearchType(opt)}
                        style={{ fontSize: "14px", color: PRIMARY_TEXT }}
                      >
                        {opt}
                      </span>
                    </label>
                  ))}

                  <div style={{ marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setActiveSearchType(pendingSearchType);
                        setAdvancedSearchOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 0",
                        borderRadius: "4px",
                        border: "none",
                        background: PRIMARY_COLOR,
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: DS_FONT,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
                      onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear — only when filtering */}
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="text-sm font-medium px-2 py-1.5 transition-colors"
                style={{ color: PRIMARY_COLOR, fontFamily: DS_FONT }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.textDecoration = "underline")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.textDecoration = "none")
                }
              >
                Clear
              </button>
            )}

            <div className="flex-1" />

            {/* Customize columns */}
            <button
              onClick={() => { setPendingColumns(columns); setColumnSearch(""); setCustomizeColumnsOpen(true); }}
              title="Customize columns"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                color: MUTED_TEXT,
                display: "flex",
                alignItems: "center",
                borderRadius: "4px",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = PRIMARY_TEXT; (e.currentTarget as HTMLButtonElement).style.background = "rgba(19,0,50,0.04)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = MUTED_TEXT; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <SlidersHorizontal size={18} weight="regular" />
            </button>
          </div>
        </div>

        {/* Template table */}
        <TemplateList
          templates={templates}
          isLoading={isLoading}
          onCreateTemplate={() => createTemplateMut.mutate()}
          section={activeSection}
        />

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div
            className="flex items-center justify-between px-6 py-3 bg-white"
            style={{ borderTop: `1px solid ${BORDER_COLOR}` }}
          >
            {/* Left: per-page selector */}
            <div className="flex items-center gap-2">
              <select
                className="text-sm border rounded px-2 py-1 outline-none cursor-pointer"
                style={{
                  borderColor: BORDER_COLOR,
                  color: SECONDARY_TEXT,
                  fontFamily: DS_FONT,
                }}
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={25}>25 / Page</option>
                <option value={50}>50 / Page</option>
                <option value={100}>100 / Page</option>
              </select>
            </div>

            {/* Right: Page N < > */}
            <div
              className="flex items-center gap-1"
              style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}
            >
              <span className="text-sm px-2">Page {page}</span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded transition-colors disabled:opacity-40"
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(19,0,50,0.06)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z" />
                </svg>
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="p-1.5 rounded transition-colors disabled:opacity-40"
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(19,0,50,0.06)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customize columns modal */}
      {customizeColumnsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setCustomizeColumnsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl"
            style={{ width: "560px", maxWidth: "90vw", padding: "32px", position: "relative", fontFamily: DS_FONT }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: "22px", fontWeight: 600, color: PRIMARY_TEXT, margin: 0 }}>
                Customize columns
              </h2>
              <button
                onClick={() => setCustomizeColumnsOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: MUTED_TEXT, padding: "4px", display: "flex" }}
                onMouseOver={(e) => (e.currentTarget.style.color = PRIMARY_TEXT)}
                onMouseOut={(e) => (e.currentTarget.style.color = MUTED_TEXT)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div
              className="flex items-center gap-2 mb-4 px-3"
              style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "6px", height: "44px" }}
            >
              <MagnifyingGlass size={16} weight="regular" style={{ color: MUTED_TEXT, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Find columns"
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                style={{ flex: 1, border: "none", outline: "none", fontSize: "15px", color: PRIMARY_TEXT, fontFamily: DS_FONT, background: "transparent" }}
              />
            </div>

            <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", overflow: "hidden" }}>
              {pendingColumns
                .filter((col) => col.label.toLowerCase().includes(columnSearch.toLowerCase()))
                .map((col, i, arr) => (
                  <div
                    key={col.id}
                    className="flex items-center gap-4 px-4"
                    style={{
                      height: "60px",
                      borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_COLOR}` : "none",
                      opacity: col.id === "name" ? 0.45 : 1,
                    }}
                  >
                    <button
                      onClick={() => {
                        if (col.id === "name") return;
                        setPendingColumns((prev) =>
                          prev.map((c) => c.id === col.id ? { ...c, enabled: !c.enabled } : c)
                        );
                      }}
                      style={{ background: "none", border: "none", padding: 0, cursor: col.id === "name" ? "default" : "pointer", flexShrink: 0 }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "24px",
                          borderRadius: "9999px",
                          background: col.enabled ? PRIMARY_COLOR : "#D1D5DB",
                          position: "relative",
                          transition: "background 0.15s",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: col.enabled ? "23px" : "3px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "9999px",
                            background: "white",
                            transition: "left 0.15s",
                          }}
                        />
                      </div>
                    </button>
                    <span style={{ flex: 1, fontSize: "15px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
                      {col.label}
                    </span>
                    <DotsSixVertical size={18} weight="bold" style={{ color: MUTED_TEXT, flexShrink: 0 }} />
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setCustomizeColumnsOpen(false)}
                style={{ padding: "10px 24px", borderRadius: "6px", border: `1px solid ${BORDER_COLOR}`, background: "#F5F5F5", color: PRIMARY_TEXT, fontSize: "15px", cursor: "pointer", fontFamily: DS_FONT }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#EBEBEB")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#F5F5F5")}
              >
                Cancel
              </button>
              <button
                onClick={() => { setColumns(pendingColumns); setCustomizeColumnsOpen(false); }}
                style={{ padding: "10px 24px", borderRadius: "6px", border: "none", background: PRIMARY_COLOR, color: "white", fontSize: "15px", fontWeight: 600, cursor: "pointer", fontFamily: DS_FONT }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
                onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setNewTemplateName("");
        }}
        title="Create Template"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: PRIMARY_TEXT, fontFamily: DS_FONT }}
            >
              Template Name *
            </label>
            <input
              autoFocus
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTemplateName.trim()) {
                  createMut.mutate();
                }
              }}
              placeholder="e.g., Non-Disclosure Agreement"
              className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
              style={{ borderColor: BORDER_COLOR, fontFamily: DS_FONT }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
              onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
            />
          </div>

          {createMut.isError && (
            <p className="text-xs text-red-500">
              Failed to create template. Please try again.
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateDialog(false);
                setNewTemplateName("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={createMut.isPending}
              disabled={!newTemplateName.trim()}
              onClick={() => createMut.mutate()}
            >
              Create Template
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
