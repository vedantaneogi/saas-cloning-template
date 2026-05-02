"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChartBar, CaretRight, CaretDown } from "@phosphor-icons/react";
import { REPORTS, CATEGORY_COUNTS } from "../reports-data";

const PURPLE_BAR  = "#7a4ab3";
const LABEL_COLOR = "#333333";
const MUTED_COLOR = "#666666";
const BORDER_COLOR = "#e0e0e0";
const HOVER_BG    = "#f4f4f4";
const DS_FONT     = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

const DASHBOARDS = [
  { id: "my-dashboard",            label: "My dashboard" },
  { id: "administrator-dashboard", label: "Administrator dashboard" },
];

const REPORT_TYPE_ITEMS = [
  { id: "all",       label: "All",       count: CATEGORY_COUNTS.all,       hasChildren: true  },
  { id: "envelope",  label: "Envelope",  count: CATEGORY_COUNTS.envelope,  hasChildren: true  },
  { id: "recipient", label: "Recipient", count: CATEGORY_COUNTS.recipient, hasChildren: true  },
  { id: "usage",     label: "Usage",     count: CATEGORY_COUNTS.usage,     hasChildren: true  },
  { id: "custom",    label: "Custom",    count: CATEGORY_COUNTS.custom,    hasChildren: false },
  { id: "downloads", label: "Downloads", count: null,                      hasChildren: false },
];

interface ReportsSidebarProps {
  activeView?: "dashboard" | "all" | "downloads" | "run";
  activeDashboard?: string;
  activeType?: string;
  activeReportId?: string;
  onDashboard?: (d: string) => void;
}

export function ReportsSidebar({
  activeView = "dashboard",
  activeDashboard = "administrator-dashboard",
  activeType = "all",
  activeReportId,
  onDashboard,
}: ReportsSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeType && activeType !== "downloads") {
      // Auto-expand the active type (including "all")
      initial.add(activeType);
    }
    return initial;
  });

  const toggleExpand = (typeId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId); else next.add(typeId);
      return next;
    });
  };

  const handleDashboard = (id: string) => {
    if (onDashboard) {
      onDashboard(id);
    } else {
      router.push(`/reports?dashboard=${id}`);
    }
  };

  const handleType = (typeId: string) => {
    if (typeId === "downloads") {
      router.push("/reports/downloads");
      return;
    }
    if (typeId === "all") {
      router.push("/reports/all");
      return;
    }
    toggleExpand(typeId);
    router.push(`/reports/all?type=${typeId}`);
  };

  const isDashboardActive = activeView === "dashboard";
  const isAllActive = activeView === "all";
  const isDownloadsActive = activeView === "downloads";

  return (
    <div
      className="flex-shrink-0 border-r flex flex-col"
      style={{
        width: "260px",
        borderColor: BORDER_COLOR,
        background: "#F8F8F8",
        fontFamily: DS_FONT,
      }}
    >
      <div className="flex-1 overflow-y-auto">
        {/* DASHBOARDS label */}
        <div
          className="flex items-center px-4"
          style={{ height: "40px", marginTop: "8px" }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: MUTED_COLOR,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Dashboards
          </span>
        </div>

        {DASHBOARDS.map((dash) => {
          const isActive = isDashboardActive && activeDashboard === dash.id;
          return (
            <NavButton
              key={dash.id}
              label={dash.label}
              isActive={isActive}
              onClick={() => handleDashboard(dash.id)}
              icon={<ChartBar size={18} weight="regular" />}
            />
          );
        })}

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "12px 16px" }} />

        {/* REPORT TYPE label */}
        <div className="flex items-center px-4" style={{ height: "40px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: MUTED_COLOR,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Report Type
          </span>
        </div>

        {REPORT_TYPE_ITEMS.map((item) => {
          const isTypeActive =
            item.id === "downloads"
              ? isDownloadsActive
              : item.id === "all"
              ? isAllActive && (activeType === "all" || !activeType)
              : isAllActive && activeType === item.id;

          const isExpanded = expandedTypes.has(item.id);
          const childReports = item.hasChildren
            ? item.id === "all"
              ? REPORTS
              : REPORTS.filter((r) => r.category === item.id)
            : [];

          return (
            <div key={item.id}>
              <TypeRow
                id={item.id}
                label={item.label}
                count={item.count}
                isActive={isTypeActive}
                hasChildren={item.hasChildren}
                isExpanded={isExpanded}
                onClick={() => handleType(item.id)}
                onToggle={item.hasChildren ? () => toggleExpand(item.id) : undefined}
              />

              {/* Sub-items */}
              {item.hasChildren && isExpanded && (
                <div>
                  {childReports.map((report) => {
                    const isReportActive = activeReportId === report.id;
                    return (
                      <ChildRow
                        key={report.id}
                        label={report.name}
                        isActive={isReportActive}
                        onClick={() => router.push(`/reports/run/${report.id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavButton({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactElement;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center text-left"
      style={{
        height: "40px",
        paddingLeft: "16px",
        paddingRight: "16px",
        gap: "10px",
        fontSize: "14px",
        fontWeight: isActive ? 700 : 400,
        color: isActive ? LABEL_COLOR : hovered ? LABEL_COLOR : MUTED_COLOR,
        background: isActive ? "transparent" : hovered ? HOVER_BG : "transparent",
        border: "none",
        borderLeft: isActive
          ? `4px solid ${PURPLE_BAR}`
          : hovered
          ? "4px solid #d0d0d0"
          : "4px solid transparent",
        cursor: "pointer",
        transition: "background 0.1s, border-color 0.1s",
        fontFamily: DS_FONT,
      }}
    >
      {icon && (
        <span style={{ color: isActive ? LABEL_COLOR : MUTED_COLOR, flexShrink: 0, display: "flex" }}>
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}

function TypeRow({
  id,
  label,
  count,
  isActive,
  hasChildren,
  isExpanded,
  onClick,
  onToggle,
}: {
  id: string;
  label: string;
  count: number | null;
  isActive: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggle?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center"
      style={{
        borderLeft: isActive
          ? `4px solid ${PURPLE_BAR}`
          : hovered
          ? "4px solid #d0d0d0"
          : "4px solid transparent",
        background: isActive ? "transparent" : hovered ? HOVER_BG : "transparent",
        transition: "background 0.1s, border-color 0.1s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Caret toggle (only for items with children) */}
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 0 12px",
            display: "flex",
            alignItems: "center",
            height: "40px",
            color: MUTED_COLOR,
            flexShrink: 0,
          }}
        >
          {isExpanded
            ? <CaretDown size={12} weight="bold" />
            : <CaretRight size={12} weight="bold" />}
        </button>
      ) : (
        <div style={{ width: "28px", flexShrink: 0 }} />
      )}

      {/* Main clickable label */}
      <button
        onClick={onClick}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          cursor: "pointer",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingRight: "16px",
          fontSize: "14px",
          fontWeight: isActive ? 700 : 400,
          color: isActive ? LABEL_COLOR : MUTED_COLOR,
          fontFamily: DS_FONT,
          textAlign: "left",
        }}
      >
        <span>
          {label}
          {count !== null && (
            <span style={{ marginLeft: "4px", color: MUTED_COLOR, fontWeight: 400 }}>
              ({count})
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

function ChildRow({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left"
      style={{
        height: "36px",
        paddingLeft: "44px",
        paddingRight: "16px",
        fontSize: "13px",
        fontWeight: isActive ? 600 : 400,
        color: isActive ? LABEL_COLOR : MUTED_COLOR,
        background: isActive ? "rgba(122,74,179,0.06)" : hovered ? HOVER_BG : "transparent",
        border: "none",
        borderLeft: isActive ? `4px solid ${PURPLE_BAR}` : "4px solid transparent",
        cursor: "pointer",
        transition: "background 0.1s",
        fontFamily: DS_FONT,
        display: "block",
        width: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
