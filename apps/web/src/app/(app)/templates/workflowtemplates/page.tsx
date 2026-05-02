"use client";

import { useState } from "react";
import { TemplateSidebar } from "@/features/templates/components/TemplateSidebar";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const PRIMARY_COLOR = "#260559";
const LINK_COLOR = "#4C00FF";

const WORKFLOW_TEMPLATES = [
  {
    id: "1",
    name: "Create Stripe Customer and Invoice",
    description: "Automatically create a Stripe customer and invoice when a DocuSign envelope is completed.",
    apps: ["stripe", "docusign"],
    category: "Sales",
  },
  {
    id: "2",
    name: "Bonterms Climate Addendum",
    description: "Add Bonterms climate provisions to your agreements with automated workflows.",
    apps: ["bonterms", "docusign"],
    category: "Sales",
  },
  {
    id: "3",
    name: "Address Change with HubSpot",
    description: "Sync address changes from signed documents directly into HubSpot CRM.",
    apps: ["hubspot", "docusign"],
    category: "Sales",
  },
  {
    id: "4",
    name: "Address Change with Salesforce",
    description: "Update Salesforce contact records automatically when address change documents are signed.",
    apps: ["salesforce", "docusign"],
    category: "Sales",
  },
  {
    id: "5",
    name: "NDA with Box",
    description: "Send NDA envelopes and automatically store completed documents in Box.",
    apps: ["box", "docusign"],
    category: "Sales",
  },
  {
    id: "6",
    name: "NDA with Dropbox",
    description: "Send NDA envelopes and automatically archive signed documents to Dropbox.",
    apps: ["dropbox", "docusign"],
    category: "Sales",
  },
];

const APP_ICONS: Record<string, { bg: string; label: string; icon: string }> = {
  stripe: { bg: "#6772e5", label: "S", icon: "S" },
  docusign: { bg: "#260559", label: "D", icon: "D" },
  hubspot: { bg: "#FF7A59", label: "H", icon: "H" },
  salesforce: { bg: "#00A1E0", label: "SF", icon: "SF" },
  box: { bg: "#0061D5", label: "B", icon: "B" },
  dropbox: { bg: "#0061FF", label: "DB", icon: "DB" },
  bonterms: { bg: "#2D6A4F", label: "BT", icon: "BT" },
};

function AppIconBadge({ app }: { app: string }) {
  const meta = APP_ICONS[app] ?? { bg: "#666", label: app[0].toUpperCase() };
  return (
    <div
      title={app}
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "6px",
        background: meta.bg,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 700,
        flexShrink: 0,
        fontFamily: "monospace",
      }}
    >
      {meta.label}
    </div>
  );
}

function WorkflowCard({ template }: { template: typeof WORKFLOW_TEMPLATES[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: "8px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "box-shadow 0.15s",
        boxShadow: hovered ? "0 4px 16px rgba(19,0,50,0.12)" : "0 1px 4px rgba(19,0,50,0.06)",
        cursor: "default",
      }}
    >
      {/* App icons */}
      <div className="flex items-center gap-2 flex-wrap">
        {template.apps.map((app) => (
          <AppIconBadge key={app} app={app} />
        ))}
      </div>

      {/* Name */}
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: PRIMARY_TEXT,
          margin: 0,
          fontFamily: DS_FONT,
          lineHeight: "1.4",
        }}
      >
        {template.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          color: SECONDARY_TEXT,
          margin: 0,
          lineHeight: "1.6",
          fontFamily: DS_FONT,
          flex: 1,
        }}
      >
        {template.description}
      </p>

      {/* Details button */}
      <div>
        <button
          style={{
            background: "white",
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: "4px",
            padding: "7px 16px",
            fontSize: "13px",
            fontWeight: 600,
            color: PRIMARY_TEXT,
            cursor: "pointer",
            fontFamily: DS_FONT,
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "white")}
        >
          Details
        </button>
      </div>
    </div>
  );
}

export default function WorkflowTemplatesPage() {
  const [industryOpen, setIndustryOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  const grouped = WORKFLOW_TEMPLATES.reduce<Record<string, typeof WORKFLOW_TEMPLATES>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ fontFamily: DS_FONT }}>
      <TemplateSidebar
        activeSection=""
        onCreateTemplate={() => {}}
      />

      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ background: "white" }}
      >
        {/* Header */}
        <div
          className="px-8 pt-6 pb-5 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: PRIMARY_TEXT,
              margin: 0,
              fontFamily: DS_FONT,
            }}
          >
            Workflow Templates
          </h1>
          <button
            style={{
              background: "none",
              border: "none",
              color: LINK_COLOR,
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: DS_FONT,
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Learn More
          </button>
        </div>

        <div className="px-8 py-6 flex-1">
          {/* Filters row */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: PRIMARY_TEXT,
                fontFamily: DS_FONT,
              }}
            >
              Filters
            </span>

            {/* Industry dropdown */}
            <div className="relative">
              <button
                onClick={() => { setIndustryOpen(!industryOpen); setAppsOpen(false); }}
                style={{
                  background: "white",
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  color: PRIMARY_TEXT,
                  cursor: "pointer",
                  fontFamily: DS_FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Industry
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>
              {industryOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIndustryOpen(false)} />
                  <div
                    className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-1"
                    style={{ borderColor: BORDER_COLOR, minWidth: "160px" }}
                  >
                    {["All Industries", "Financial Services", "Healthcare", "Legal", "Real Estate", "Technology"].map((ind) => (
                      <button
                        key={ind}
                        className="w-full text-left px-4 py-2 text-sm"
                        style={{ color: PRIMARY_TEXT, fontFamily: DS_FONT }}
                        onClick={() => setIndustryOpen(false)}
                        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Apps dropdown */}
            <div className="relative">
              <button
                onClick={() => { setAppsOpen(!appsOpen); setIndustryOpen(false); }}
                style={{
                  background: "white",
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  color: PRIMARY_TEXT,
                  cursor: "pointer",
                  fontFamily: DS_FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Apps
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>
              {appsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAppsOpen(false)} />
                  <div
                    className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-1"
                    style={{ borderColor: BORDER_COLOR, minWidth: "160px" }}
                  >
                    {["All Apps", "Stripe", "HubSpot", "Salesforce", "Box", "Dropbox"].map((app) => (
                      <button
                        key={app}
                        className="w-full text-left px-4 py-2 text-sm"
                        style={{ color: PRIMARY_TEXT, fontFamily: DS_FONT }}
                        onClick={() => setAppsOpen(false)}
                        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sections */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: PRIMARY_TEXT,
                  margin: "0 0 16px",
                  fontFamily: DS_FONT,
                }}
              >
                {category}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "16px",
                }}
              >
                {items.map((t) => (
                  <WorkflowCard key={t.id} template={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
