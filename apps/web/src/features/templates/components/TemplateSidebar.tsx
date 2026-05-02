"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Layout,
  User,
  Users,
  Star,
  FileText,
  Trash,
  Folder,
  CaretDown,
  TreeStructure,
} from "@phosphor-icons/react";

const PURPLE_BAR    = "#7a4ab3";
const LINK_BLUE     = "#005cb9";
const PRIMARY_COLOR = "#240b5b";
const LABEL_COLOR   = "#333333";
const MUTED_COLOR   = "#666666";
const BORDER_COLOR  = "#e0e0e0";
const HOVER_BG      = "#f4f4f4";
const ICON_SIZE     = 20;

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
}

const primaryItems: NavItem[] = [
  { id: "my-templates",  label: "My Templates",   icon: <User  size={ICON_SIZE} weight="regular" /> },
  { id: "shared",        label: "Shared with Me", icon: <Users size={ICON_SIZE} weight="regular" /> },
  { id: "favorites",     label: "Favorites",      icon: <Star  size={ICON_SIZE} weight="regular" /> },
];

const expandedItems: NavItem[] = [
  { id: "all-templates", label: "All Templates", icon: <FileText size={ICON_SIZE} weight="regular" /> },
  { id: "deleted",       label: "Deleted",        icon: <Trash   size={ICON_SIZE} weight="regular" /> },
];

function NavRow({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
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
        gap: "12px",
        fontSize: "14px",
        fontWeight: isActive ? 700 : 400,
        color: isActive ? LABEL_COLOR : MUTED_COLOR,
        background: isActive ? "transparent" : hovered ? HOVER_BG : "transparent",
        border: "none",
        borderLeft: isActive
          ? `4px solid ${PURPLE_BAR}`
          : hovered
          ? "4px solid #d0d0d0"
          : "4px solid transparent",
        cursor: "pointer",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <span style={{ color: isActive ? LABEL_COLOR : MUTED_COLOR, flexShrink: 0, display: "flex" }}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}

interface TemplateSidebarProps {
  activeSection?: string;
  onSection?: (section: string) => void;
  onCreateTemplate?: () => void;
}

export function TemplateSidebar({ activeSection = "my-templates", onSection, onCreateTemplate }: TemplateSidebarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const [templatesCollapsed, setTemplatesCollapsed] = useState(false);

  return (
    <div
      className="flex-shrink-0 border-r flex flex-col"
      style={{
        width: "260px",
        borderColor: BORDER_COLOR,
        background: "#F8F8F8",
        fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Create Template button */}
      <div className="p-4">
        <button
          onClick={onCreateTemplate}
          className="w-full flex items-center justify-center font-semibold text-white transition-colors"
          style={{
            background: PRIMARY_COLOR,
            height: "44px",
            borderRadius: "4px",
            fontSize: "15px",
            border: "none",
            cursor: "pointer",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
          onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
        >
          Create Template
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ENVELOPE TEMPLATES section header */}
        <button
          onClick={() => setTemplatesCollapsed(!templatesCollapsed)}
          className="w-full flex items-center px-4 py-2"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            gap: "8px",
            height: "40px",
          }}
        >
          <span
            style={{
              color: MUTED_COLOR,
              transform: templatesCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "flex",
              flexShrink: 0,
            }}
          >
            <CaretDown size={13} weight="bold" />
          </span>
          <span style={{ color: MUTED_COLOR, flexShrink: 0, display: "flex" }}>
            <Layout size={20} weight="regular" />
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: MUTED_COLOR,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Envelope Templates
          </span>
        </button>

        {!templatesCollapsed && (
          <>
            {primaryItems.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => onSection?.(item.id)}
              />
            ))}

            {/* Show More / Show Less */}
            <button
              onClick={() => setShowMore(!showMore)}
              style={{
                display: "block",
                paddingLeft: "20px",
                paddingTop: "8px",
                paddingBottom: "8px",
                fontSize: "14px",
                color: LINK_BLUE,
                textDecoration: "underline",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              {showMore ? "Show Less" : "Show More"}
            </button>

            {showMore && (
              <>
                {expandedItems.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    isActive={activeSection === item.id}
                    onClick={() => onSection?.(item.id)}
                  />
                ))}

                {/* FOLDERS section header */}
                <button
                  className="w-full flex items-center px-4 py-2"
                  style={{ background: "transparent", border: "none", cursor: "pointer", gap: "8px", height: "40px" }}
                >
                  <span style={{ color: MUTED_COLOR, display: "flex", flexShrink: 0 }}>
                    <CaretDown size={13} weight="bold" />
                  </span>
                  <span style={{ color: MUTED_COLOR, display: "flex", flexShrink: 0 }}>
                    <Folder size={20} weight="regular" />
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED_COLOR, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    Folders
                  </span>
                </button>

                {/* SHARED FOLDERS section header */}
                <button
                  className="w-full flex items-center px-4 py-2"
                  style={{ background: "transparent", border: "none", cursor: "pointer", gap: "8px", height: "40px" }}
                >
                  <span style={{ color: MUTED_COLOR, display: "flex", flexShrink: 0 }}>
                    <CaretDown size={13} weight="bold" />
                  </span>
                  <span style={{ color: MUTED_COLOR, display: "flex", flexShrink: 0 }}>
                    <Folder size={20} weight="regular" />
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: MUTED_COLOR, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    Shared Folders
                  </span>
                </button>
              </>
            )}
          </>
        )}

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "16px 16px" }} />

        <WorkflowNavButton
          label="Workflow Templates"
          icon={<TreeStructure size={ICON_SIZE} weight="regular" />}
          href="/templates/workflowtemplates"
          active={pathname === "/templates/workflowtemplates"}
        />
        <WorkflowNavButton
          label="Template Gallery"
          icon={<FileText size={ICON_SIZE} weight="regular" />}
          href="/templates/gallery"
          active={pathname === "/templates/gallery"}
        />
      </div>
    </div>
  );
}

function WorkflowNavButton({
  label,
  icon,
  href,
  active,
}: {
  label: string;
  icon: React.ReactElement;
  href: string;
  active?: boolean;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => router.push(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center text-left"
      style={{
        height: "40px",
        paddingLeft: "16px",
        paddingRight: "16px",
        gap: "12px",
        fontSize: "14px",
        fontWeight: active ? 700 : 400,
        color: active ? LABEL_COLOR : hovered ? LABEL_COLOR : MUTED_COLOR,
        background: active ? "transparent" : hovered ? HOVER_BG : "transparent",
        border: "none",
        borderLeft: active
          ? `4px solid ${PURPLE_BAR}`
          : hovered
          ? "4px solid #d0d0d0"
          : "4px solid transparent",
        cursor: "pointer",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <span style={{ color: active ? LABEL_COLOR : MUTED_COLOR, flexShrink: 0, display: "flex" }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <span
        style={{
          background: "#1B0A3C",
          color: "#ffffff",
          fontSize: "10px",
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: "4px",
          flexShrink: 0,
        }}
      >
        NEW
      </span>
    </button>
  );
}
