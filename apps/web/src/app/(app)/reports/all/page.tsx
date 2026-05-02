"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react";
import { ReportsSidebar } from "@/features/reports/components/ReportsSidebar";
import { REPORTS, CATEGORY_COUNTS, getReportsByCategory, type ReportCategory } from "@/features/reports/reports-data";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const PRIMARY_COLOR = "#260559";

const CATEGORY_LABELS: Record<string, string> = {
  envelope: "Envelope",
  recipient: "Recipient",
  usage: "Usage",
};

function ViewButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", position: "relative", gap: 0 }}>
      {/* View main button */}
      <button
        onClick={() => router.push(`/reports/run/${reportId}`)}
        style={{
          background: PRIMARY_COLOR,
          color: "white",
          border: "none",
          borderRight: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "3px 0 0 3px",
          padding: "0 18px",
          height: "34px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: DS_FONT,
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
        onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
      >
        View
      </button>

      {/* Dropdown caret */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          background: PRIMARY_COLOR,
          color: "white",
          border: "none",
          borderRadius: "0 3px 3px 0",
          padding: "0 8px",
          height: "34px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
        onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
      >
        <CaretDown size={14} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-1"
            style={{ borderColor: BORDER_COLOR, minWidth: "160px", fontFamily: DS_FONT }}
          >
            {["Schedule", "Download", "Email"].map((item) => (
              <button
                key={item}
                className="w-full text-left px-4 py-2 text-sm"
                style={{ color: PRIMARY_TEXT }}
                onClick={() => setMenuOpen(false)}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AllReportsPage() {
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get("type") ?? "all") as ReportCategory | "all";

  const isAll = typeParam === "all";
  const reports = getReportsByCategory(typeParam);
  const count = isAll ? CATEGORY_COUNTS.all : reports.length;

  // For type-filtered views, show a section header above the flat list
  const sectionLabel = !isAll ? `${CATEGORY_LABELS[typeParam]} (${count})` : null;

  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ fontFamily: DS_FONT }}>
      <ReportsSidebar activeView="all" activeType={typeParam} />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "white",
          fontFamily: DS_FONT,
        }}
      >
        <div style={{ padding: "28px 32px" }}>
          {/* Heading */}
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: PRIMARY_TEXT,
              margin: "0 0 20px",
              fontFamily: DS_FONT,
            }}
          >
            {isAll ? `All (${count})` : sectionLabel}
          </h1>

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 140px",
              padding: "8px 16px",
              borderBottom: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Name
            </span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Schedule
            </span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>
              Actions
            </span>
          </div>

          {/* Flat report list — no category headers */}
          {reports.map((report) => (
            <div
              key={report.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 140px",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: `1px solid ${BORDER_COLOR}`,
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
                  {report.name}
                </div>
                <div style={{ fontSize: "13px", color: SECONDARY_TEXT, fontFamily: DS_FONT, marginTop: "2px" }}>
                  {report.description}
                </div>
              </div>
              <span style={{ fontSize: "13px", color: MUTED_TEXT, fontFamily: DS_FONT }}>
                —
              </span>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ViewButton reportId={report.id} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
