"use client";

import { useState } from "react";
import { TemplateSidebar } from "@/features/templates/components/TemplateSidebar";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const PRIMARY_COLOR = "#260559";

const GALLERY_TEMPLATES = [
  {
    id: "1",
    name: "Generic Lease Agreement",
    category: "Cross-Industry",
    preview: "lease",
  },
  {
    id: "2",
    name: "Invoice Template",
    category: "Financial Services",
    preview: "invoice",
  },
  {
    id: "3",
    name: "NDA Template",
    category: "Legal Services",
    preview: "nda",
  },
  {
    id: "4",
    name: "Offer Letter Template",
    category: "Human Resources",
    preview: "offer",
  },
  {
    id: "5",
    name: "Purchase Order",
    category: "Cross-Industry",
    preview: "purchase",
  },
  {
    id: "6",
    name: "Bill of Sale",
    category: "Cross-Industry",
    preview: "bill",
  },
  {
    id: "7",
    name: "Liability Waiver",
    category: "Legal Services",
    preview: "waiver",
  },
  {
    id: "8",
    name: "Loan Agreement",
    category: "Financial Services",
    preview: "loan",
  },
];

function DocumentPreview({ type }: { type: string }) {
  const lines: Record<string, { title: string; body: number[]; sig?: boolean }> = {
    lease:    { title: "LEASE AGREEMENT",  body: [80, 90, 75, 85, 60], sig: true },
    invoice:  { title: "INVOICE",          body: [60, 90, 50, 70, 80], sig: false },
    nda:      { title: "NON-DISCLOSURE\nAGREEMENT", body: [85, 80, 90, 65, 75], sig: true },
    offer:    { title: "OFFER LETTER",     body: [70, 90, 80, 60, 85], sig: true },
    purchase: { title: "PURCHASE ORDER",   body: [60, 85, 70, 90, 55], sig: false },
    bill:     { title: "BILL OF SALE",     body: [75, 65, 88, 70, 80], sig: true },
    waiver:   { title: "LIABILITY WAIVER", body: [82, 75, 90, 60, 70], sig: true },
    loan:     { title: "LOAN AGREEMENT",   body: [78, 85, 70, 90, 65], sig: true },
  };

  const doc = lines[type] ?? lines.nda;

  return (
    <div
      style={{
        width: "100%",
        paddingTop: "130%",
        position: "relative",
        background: "#FFFFFF",
        border: "1px solid rgba(19,0,50,0.12)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          {doc.title.split("\n").map((line, i) => (
            <div
              key={i}
              style={{
                height: "5px",
                background: "rgba(19,0,50,0.7)",
                borderRadius: "2px",
                marginBottom: "2px",
                width: `${60 + i * 5}%`,
                margin: "0 auto 2px",
              }}
            />
          ))}
        </div>

        {/* Body lines */}
        {doc.body.map((w, i) => (
          <div
            key={i}
            style={{
              height: "3px",
              background: "rgba(19,0,50,0.15)",
              borderRadius: "2px",
              width: `${w}%`,
            }}
          />
        ))}

        {/* More lines */}
        {[70, 85, 60, 90, 75, 65, 80].map((w, i) => (
          <div
            key={`b${i}`}
            style={{
              height: "3px",
              background: "rgba(19,0,50,0.1)",
              borderRadius: "2px",
              width: `${w}%`,
            }}
          />
        ))}

        {/* Signature block */}
        {doc.sig && (
          <div style={{ marginTop: "auto", display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: "2px", background: "rgba(19,0,50,0.3)", borderRadius: "1px" }} />
              <div style={{ height: "2px", background: "rgba(19,0,50,0.1)", borderRadius: "1px", width: "60%", marginTop: "3px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: "2px", background: "rgba(19,0,50,0.3)", borderRadius: "1px" }} />
              <div style={{ height: "2px", background: "rgba(19,0,50,0.1)", borderRadius: "1px", width: "60%", marginTop: "3px" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  "Cross-Industry": "#6B7280",
  "Financial Services": "#0369A1",
  "Legal Services": "#7C3AED",
  "Human Resources": "#059669",
};

function GalleryCard({ template }: { template: typeof GALLERY_TEMPLATES[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        cursor: "pointer",
      }}
    >
      {/* Document preview */}
      <div
        style={{
          transition: "box-shadow 0.15s, transform 0.15s",
          boxShadow: hovered ? "0 6px 20px rgba(19,0,50,0.15)" : "0 2px 8px rgba(19,0,50,0.08)",
          transform: hovered ? "translateY(-2px)" : "none",
          borderRadius: "4px",
        }}
      >
        <DocumentPreview type={template.preview} />
      </div>

      {/* Info */}
      <div>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: hovered ? PRIMARY_COLOR : PRIMARY_TEXT,
            margin: "0 0 4px",
            fontFamily: DS_FONT,
            lineHeight: "1.3",
          }}
        >
          {template.name}
        </p>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: CATEGORY_COLORS[template.category] ?? MUTED_TEXT,
            fontFamily: DS_FONT,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {template.category}
        </span>
      </div>
    </div>
  );
}

export default function TemplateGalleryPage() {
  const [search, setSearch] = useState("");

  const filtered = GALLERY_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ fontFamily: DS_FONT }}>
      <TemplateSidebar
        activeSection=""
        onCreateTemplate={() => {}}
      />

      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ background: "#F9F9F9" }}
      >
        {/* Header */}
        <div
          className="px-8 pt-6 pb-5 flex-shrink-0"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}`, background: "white" }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: PRIMARY_TEXT,
              margin: "0 0 6px",
              fontFamily: DS_FONT,
            }}
          >
            Template Gallery
          </h1>
          <p style={{ fontSize: "14px", color: SECONDARY_TEXT, margin: 0, fontFamily: DS_FONT }}>
            Browse our collection of prebuilt, customizable templates.
          </p>
        </div>

        <div className="px-8 py-6 flex-1">
          {/* Search */}
          <div
            className="flex items-center gap-2 mb-6"
            style={{
              background: "white",
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "6px",
              padding: "0 12px",
              height: "40px",
              maxWidth: "360px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: MUTED_TEXT, flexShrink: 0 }}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: PRIMARY_TEXT,
                fontFamily: DS_FONT,
                background: "transparent",
              }}
            />
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: SECONDARY_TEXT,
                fontFamily: DS_FONT,
                fontSize: "15px",
              }}
            >
              No templates match your search.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "24px",
              }}
            >
              {filtered.map((t) => (
                <GalleryCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
