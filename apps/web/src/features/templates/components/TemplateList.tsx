"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store";
import { formatDateWithTime } from "@/lib/utils";
import { toggleFavoriteTemplate, deleteTemplate, useTemplate } from "../api";
import type { Template } from "../api";

const PRIMARY_COLOR = "#260559";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

interface TemplateListProps {
  templates: Template[];
  isLoading: boolean;
  onCreateTemplate: () => void;
  section?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "#F59E0B" : "none"}
      stroke={filled ? "#F59E0B" : MUTED_TEXT}
      strokeWidth="1.5"
      width="16"
      height="16"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function SortIcon({ active, dir }: { active?: boolean; dir?: "asc" | "desc" }) {
  if (active && dir === "asc") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ color: PRIMARY_COLOR }}>
        <path d="M7 14l5-5 5 5H7z" />
      </svg>
    );
  }
  if (active && dir === "desc") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ color: PRIMARY_COLOR }}>
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ opacity: 0.35 }}>
      <path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z" />
    </svg>
  );
}

const CDN_BASE = "https://docucdn-a.akamaihd.net/olive/images/2.110.0";
const LINK_COLOR = "#4C00FF";

function DefaultEmptyState({ onCreateTemplate }: { onCreateTemplate: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "48px", maxWidth: "680px", margin: "48px auto", padding: "0 32px" }}>
      <img
        src={`${CDN_BASE}/empty-state/emptyStateTemplate.svg`}
        alt=""
        width={200}
        height={200}
        style={{ flexShrink: 0, objectFit: "contain" }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: PRIMARY_TEXT, margin: 0, fontFamily: DS_FONT }}>
          Resending the same envelopes?
        </h2>
        <p style={{ fontSize: "14px", color: SECONDARY_TEXT, lineHeight: "1.6", margin: 0, fontFamily: DS_FONT }}>
          Save documents, placeholder recipients and fields as a template so you can save time.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
          <button
            onClick={onCreateTemplate}
            style={{
              background: PRIMARY_COLOR,
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "9px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: DS_FONT,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#3a0870")}
            onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
          >
            Create a Template
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: LINK_COLOR,
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: DS_FONT,
              padding: "9px 4px",
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Browse starter templates
          </button>
        </div>
      </div>
    </div>
  );
}

function FavoritesEmptyState() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "48px", maxWidth: "680px", margin: "48px auto", padding: "0 32px" }}>
      <img
        src={`${CDN_BASE}/empty-state/emptyStateFavoriteTemplate.svg`}
        alt=""
        width={200}
        height={200}
        style={{ flexShrink: 0, objectFit: "contain" }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: PRIMARY_TEXT, margin: 0, fontFamily: DS_FONT }}>
          Keep your favorite templates close
        </h2>
        <p style={{ fontSize: "14px", color: SECONDARY_TEXT, lineHeight: "1.6", margin: 0, fontFamily: DS_FONT }}>
          When you add existing templates to your favorites, you can access them more easily.
        </p>
        <button
          style={{
            background: "none",
            border: "none",
            color: LINK_COLOR,
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: DS_FONT,
            padding: "4px 0",
            textAlign: "left",
          }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Add to Favorites
        </button>
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  ownerDisplay,
  isSelected,
  onSelect,
  onFavoriteToggle,
  onUse,
  onEdit,
  onCopy,
  onDelete,
}: {
  template: Template;
  ownerDisplay: string;
  isSelected: boolean;
  onSelect: () => void;
  onFavoriteToggle: (id: string, isFavorite: boolean) => void;
  onUse: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr
      className="group transition-colors cursor-pointer"
      style={{ borderBottom: `1px solid rgba(19,0,50,0.06)`, background: isSelected ? "rgba(76,0,255,0.04)" : "transparent" }}
      onMouseOver={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(19,0,50,0.02)"; }}
      onMouseOut={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? "rgba(76,0,255,0.04)" : "transparent"; }}
    >
      {/* Checkbox */}
      <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 cursor-pointer"
          style={{ accentColor: PRIMARY_COLOR }}
        />
      </td>

      {/* Favorite star */}
      <td className="px-2 py-4 w-8" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onFavoriteToggle(template.id, !template.isFavorite)}
          className="transition-transform hover:scale-110"
          title={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <StarIcon filled={template.isFavorite} />
        </button>
      </td>

      {/* Name */}
      <td className="px-4 py-4" onClick={() => onUse(template.id)}>
        <span
          className="text-sm font-medium hover:underline"
          style={{ color: PRIMARY_TEXT, fontFamily: DS_FONT }}
        >
          {template.name}
        </span>
      </td>

      {/* Owner */}
      <td
        className="px-4 py-4 text-sm"
        style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}
      >
        {ownerDisplay}
      </td>

      {/* Created Date */}
      <td className="px-4 py-4 text-sm" style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
        {(() => { const { date, time } = formatDateWithTime(template.createdAt); return <><span>{date}</span><br /><span style={{ color: MUTED_TEXT }}>{time}</span></>; })()}
      </td>

      {/* Last Change */}
      <td className="px-4 py-4 text-sm" style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
        {(() => { const { date, time } = formatDateWithTime(template.lastModified); return <><span>{date}</span><br /><span style={{ color: MUTED_TEXT }}>{time}</span></>; })()}
      </td>

      {/* Folders */}
      <td
        className="px-4 py-4 text-sm"
        style={{ color: MUTED_TEXT, fontFamily: DS_FONT }}
      >
        —
      </td>

      {/* Use + Menu */}
      <td className="px-4 py-4 w-36" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {/* Use button — sharp corners, solid dark purple */}
          <button
            onClick={() => onUse(template.id)}
            className="text-sm font-semibold text-white transition-colors"
            style={{
              background: PRIMARY_COLOR,
              borderRadius: "2px",
              padding: "7px 20px",
              fontFamily: DS_FONT,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "#3a0870")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = PRIMARY_COLOR)
            }
          >
            Use
          </button>

          {/* Three-dot menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded transition-colors"
              style={{ color: MUTED_TEXT }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(19,0,50,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = SECONDARY_TEXT;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = MUTED_TEXT;
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg z-20 py-1"
                  style={{
                    border: `1px solid ${BORDER_COLOR}`,
                    minWidth: "160px",
                    fontFamily: DS_FONT,
                  }}
                >
                  <button
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    onClick={() => {
                      onUse(template.id);
                      setShowMenu(false);
                    }}
                    onMouseOver={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(19,0,50,0.04)")
                    }
                    onMouseOut={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "transparent")
                    }
                  >
                    Use Template
                  </button>
                  {[
                    { label: "Edit", action: () => onEdit(template.id) },
                    { label: template.isFavorite ? "Remove Favorite" : "Add to Favorites", action: () => onFavoriteToggle(template.id, !template.isFavorite) },
                    { label: "Copy", action: () => onCopy(template.id) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: PRIMARY_TEXT }}
                      onClick={() => { item.action(); setShowMenu(false); }}
                      onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(19,0,50,0.04)")}
                      onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="my-1" style={{ borderTop: `1px solid ${BORDER_COLOR}` }} />
                  <button
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{ color: "#D93025" }}
                    onClick={() => { onDelete(template.id); setShowMenu(false); }}
                    onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(217,48,37,0.06)")}
                    onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export function TemplateList({ templates, isLoading, onCreateTemplate, section }: TemplateListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"name" | "owner" | "createdAt" | "lastModified">("lastModified");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    let av: string, bv: string;
    if (sortKey === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (sortKey === "owner") { av = a.owner.toLowerCase(); bv = b.owner.toLowerCase(); }
    else if (sortKey === "createdAt") { av = a.createdAt; bv = b.createdAt; }
    else { av = a.lastModified; bv = b.lastModified; }
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === templates.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedTemplates.map((t) => t.id)));
  };

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      toggleFavoriteTemplate(id, isFavorite),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ["templates"] });
      const previous = queryClient.getQueriesData({ queryKey: ["templates"] });
      queryClient.setQueriesData(
        { queryKey: ["templates"] },
        (old: unknown) => {
          if (!old) return old;
          const data = old as { items?: Template[]; pages?: number } | Template[];
          if (Array.isArray(data)) {
            return data.map((t: Template) => t.id === id ? { ...t, isFavorite } : t);
          }
          if (Array.isArray((data as { items: Template[] }).items)) {
            return {
              ...data,
              items: (data as { items: Template[] }).items.map((t: Template) =>
                t.id === id ? { ...t, isFavorite } : t
              ),
            };
          }
          return old;
        }
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  // Call POST /templates/{id}/use to create an envelope, then navigate to the
  // simplified intermediate "Use Template" page at /envelope/{envelopeId}/use-template.
  async function handleUse(id: string) {
    if (usingTemplateId) return; // prevent double-click
    setUsingTemplateId(id);
    try {
      const { envelopeId } = await useTemplate(id);
      router.push(`/envelope/${envelopeId}/use-template`);
    } catch (err) {
      console.error("Failed to use template:", err);
      setUsingTemplateId(null);
    }
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  // Resolve owner display name: if owner matches current user id or email, show the real name
  function getOwnerDisplay(template: Template): string {
    if (!currentUser) return template.owner;
    const ownerId = String(currentUser.id);
    const ownerEmail = currentUser.email?.toLowerCase() ?? "";
    const ownerVal = (template.owner ?? "").toLowerCase().trim();
    // Match by numeric id string (e.g. "1"), email, or exact name
    if (
      ownerVal === ownerId ||
      ownerVal === ownerEmail ||
      ownerVal === currentUser.name?.toLowerCase()
    ) {
      return currentUser.name || currentUser.email || "You";
    }
    // If owner looks like a raw numeric ID and current user id matches, resolve to name
    if (/^\d+$/.test(ownerVal) && Number(ownerVal) === currentUser.id) {
      return currentUser.name || currentUser.email || "You";
    }
    return template.owner;
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col" style={{ fontFamily: DS_FONT }}>
      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-6 py-2 flex-shrink-0"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}`, background: "white", minHeight: "48px" }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
            {selectedIds.size} Selected
          </span>
          <button
            onClick={() => {}}
            style={{
              padding: "5px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              background: "white",
              border: `1.5px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: DS_FONT,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "white")}
          >
            Move
          </button>
          <button
            onClick={() => {
              const selectedTemplates = templates.filter((t) => selectedIds.has(t.id));
              const rows = [
                ["name", "owner", "created_date"],
                ...selectedTemplates.map((t) => [
                  `"${t.name.replace(/"/g, '""')}"`,
                  `"${t.owner.replace(/"/g, '""')}"`,
                  `"${t.createdAt}"`,
                ]),
              ];
              const csv = rows.map((r) => r.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "templates.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: "5px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              background: "white",
              border: `1.5px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: DS_FONT,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "white")}
          >
            Export as CSV
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead
          className="sticky top-0 z-10 bg-white"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}
        >
          <tr>
            {/* Checkbox */}
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === sortedTemplates.length && sortedTemplates.length > 0}
                onChange={toggleAll}
                className="w-4 h-4"
                style={{ accentColor: PRIMARY_COLOR }}
              />
            </th>
            {/* Star */}
            <th className="px-2 py-3 w-8" />
            {/* Name */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: sortKey === "name" ? PRIMARY_COLOR : MUTED_TEXT, fontFamily: DS_FONT, cursor: "pointer", background: "none", border: "none" }}
              >
                Name
                <SortIcon active={sortKey === "name"} dir={sortDir} />
              </button>
            </th>
            {/* Owner */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort("owner")}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: sortKey === "owner" ? PRIMARY_COLOR : MUTED_TEXT, fontFamily: DS_FONT, cursor: "pointer", background: "none", border: "none" }}
              >
                Owner
                <SortIcon active={sortKey === "owner"} dir={sortDir} />
              </button>
            </th>
            {/* Created Date */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort("createdAt")}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: sortKey === "createdAt" ? PRIMARY_COLOR : MUTED_TEXT, fontFamily: DS_FONT, cursor: "pointer", background: "none", border: "none" }}
              >
                Created Date
                <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
              </button>
            </th>
            {/* Last Change */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort("lastModified")}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: sortKey === "lastModified" ? PRIMARY_COLOR : MUTED_TEXT, fontFamily: DS_FONT, cursor: "pointer", background: "none", border: "none" }}
              >
                Last Change
                <SortIcon active={sortKey === "lastModified"} dir={sortDir} />
              </button>
            </th>
            {/* Folders */}
            <th
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: MUTED_TEXT, fontFamily: DS_FONT }}
            >
              Folders
            </th>
            {/* Actions */}
            <th className="px-4 py-3 w-28" />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={8} className="px-4 py-3">
                  <div className="h-5 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            ))
          ) : templates.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-16 text-center">
                {section === "favorites" ? (
                  <FavoritesEmptyState />
                ) : (
                  <DefaultEmptyState onCreateTemplate={onCreateTemplate} />
                )}
              </td>
            </tr>
          ) : (
            sortedTemplates.map((template) => (
              <TemplateRow
                key={template.id}
                template={template}
                ownerDisplay={getOwnerDisplay(template)}
                isSelected={selectedIds.has(template.id)}
                onSelect={() => toggleSelect(template.id)}
                onFavoriteToggle={(id, fav) =>
                  favoriteMutation.mutate({ id, isFavorite: fav })
                }
                onUse={(id) => handleUse(id)}
                onEdit={async (id) => {
                  try {
                    const { envelopeId } = await useTemplate(id);
                    router.push(`/envelope/${envelopeId}/prepare?mode=template`);
                  } catch { /* ignore */ }
                }}
                onCopy={async (id) => {
                  try {
                    const { envelopeId } = await useTemplate(id);
                    router.push(`/envelope/${envelopeId}/prepare?mode=template`);
                  } catch { /* ignore */ }
                }}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
