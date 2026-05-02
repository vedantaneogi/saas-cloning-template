"use client";

import { ReportsSidebar } from "@/features/reports/components/ReportsSidebar";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";

export default function ReportsDownloadsPage() {
  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ fontFamily: DS_FONT }}>
      <ReportsSidebar activeView="downloads" activeType="downloads" />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "white",
          fontFamily: DS_FONT,
        }}
      >
        <div style={{ maxWidth: "900px", padding: "28px 32px" }}>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: PRIMARY_TEXT,
              margin: "0 0 8px",
              fontFamily: DS_FONT,
            }}
          >
            Downloads
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: SECONDARY_TEXT,
              fontFamily: DS_FONT,
              margin: "0 0 24px",
              lineHeight: "1.5",
            }}
          >
            This list provides download links for the most recent reports delivered from your account
          </p>

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              padding: "8px 16px",
              borderBottom: `1px solid ${BORDER_COLOR}`,
              borderTop: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(19,0,50,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: DS_FONT,
              }}
            >
              Name
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(19,0,50,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: DS_FONT,
              }}
            >
              Actions
            </span>
          </div>

          {/* Empty state */}
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: SECONDARY_TEXT,
              fontFamily: DS_FONT,
              fontSize: "14px",
            }}
          >
            No recent report downloads.
          </div>
        </div>
      </main>
    </div>
  );
}
