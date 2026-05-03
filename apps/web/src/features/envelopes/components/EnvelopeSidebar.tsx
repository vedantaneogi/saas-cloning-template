"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createEnvelope, getFolders } from "../api";
import {
  Tray,
  PaperPlaneRight,
  CheckCircle,
  PencilSimple,
  Lock,
  Folder,
  FileText,
  Trash,
  Clock,
  Timer,
  Warning,
  UsersThree,
  Envelope,
  CaretDown,
} from "@phosphor-icons/react";

const PURPLE_BAR   = "#7a4ab3";
const LINK_BLUE    = "#005cb9";
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
  { id: "inbox",           label: "Inbox",           icon: <Tray size={ICON_SIZE} weight="regular" /> },
  { id: "sent",            label: "Sent",             icon: <PaperPlaneRight size={ICON_SIZE} weight="regular" /> },
  { id: "completed",       label: "Completed",        icon: <CheckCircle size={ICON_SIZE} weight="regular" /> },
  { id: "action-required", label: "Action Required",  icon: <PencilSimple size={ICON_SIZE} weight="regular" /> },
];

const expandedItems: NavItem[] = [
  { id: "draft",       label: "Drafts",                icon: <FileText size={ICON_SIZE} weight="regular" /> },
  { id: "deleted",     label: "Deleted",               icon: <Trash size={ICON_SIZE} weight="regular" /> },
  { id: "waiting",     label: "Waiting for Others",    icon: <Clock size={ICON_SIZE} weight="regular" /> },
  { id: "expiring",    label: "Expiring Soon",         icon: <Timer size={ICON_SIZE} weight="regular" /> },
  { id: "auth-failed", label: "Authentication Failed", icon: <Warning size={ICON_SIZE} weight="regular" /> },
  { id: "bulk-send",   label: "Bulk Send",             icon: <UsersThree size={ICON_SIZE} weight="regular" /> },
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

export function EnvelopeSidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isBulkSendPage = pathname === "/agreements/bulk-send";
  const activeFilter = isBulkSendPage
    ? "bulk-send"
    : (searchParams.get("filter") ?? "inbox");
  const [showMore, setShowMore] = useState(isBulkSendPage);
  const [envelopesCollapsed, setEnvelopesCollapsed] = useState(false);

  const createEnvelopeMutation = useMutation({
    mutationFn: () => createEnvelope({ subject: "New Envelope", recipients: [] }),
    onSuccess: (envelope) => {
      router.push(`/envelope/${envelope.id}/prepare`);
    },
  });

  const { data: customFolders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
    staleTime: 30_000,
  });

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
      {/* Start Now — no icon */}
      <div className="p-4">
        <button
          onClick={() => createEnvelopeMutation.mutate()}
          disabled={createEnvelopeMutation.isPending}
          className="w-full flex items-center justify-center font-semibold text-white transition-colors disabled:opacity-60"
          style={{
            background: PRIMARY_COLOR,
            height: "44px",
            borderRadius: "4px",
            fontSize: "15px",
            border: "none",
            cursor: "pointer",
            gap: "8px",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
          onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
        >
          {createEnvelopeMutation.isPending && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Start Now
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ENVELOPES section header */}
        <button
          onClick={() => setEnvelopesCollapsed(!envelopesCollapsed)}
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
              transform: envelopesCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "flex",
              flexShrink: 0,
            }}
          >
            <CaretDown size={13} weight="bold" />
          </span>
          <span style={{ color: MUTED_COLOR, flexShrink: 0, display: "flex" }}>
            <Envelope size={20} weight="regular" />
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
            Envelopes
          </span>
        </button>

        {!envelopesCollapsed && (
          <>
            {/* Primary items */}
            {primaryItems.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                isActive={activeFilter === item.id}
                onClick={() => router.push(`/agreements?filter=${item.id}`)}
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

            {/* Expanded items */}
            {showMore && expandedItems.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                isActive={activeFilter === item.id}
                onClick={() =>
                  item.id === "bulk-send"
                    ? router.push("/agreements/bulk-send")
                    : router.push(`/agreements?filter=${item.id}`)
                }
              />
            ))}
          </>
        )}

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "16px 16px" }} />

        {/* PowerForms */}
        <button
          className="w-full flex items-center text-left"
          style={{
            height: "40px",
            paddingLeft: "20px",
            paddingRight: "16px",
            gap: "12px",
            fontSize: "14px",
            color: MUTED_COLOR,
            background: "transparent",
            border: "none",
            borderLeft: "4px solid transparent",
            cursor: "pointer",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = HOVER_BG;
            e.currentTarget.style.borderLeftColor = "#d0d0d0";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderLeftColor = "transparent";
          }}
        >
          <span style={{ color: MUTED_COLOR, flexShrink: 0, display: "flex" }}>
            <Lock size={ICON_SIZE} weight="regular" />
          </span>
          PowerForms
        </button>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "16px 16px" }} />

        {/* FOLDERS header */}
        <div
          className="flex items-center px-4 py-2"
          style={{ gap: "8px", height: "40px" }}
        >
          <span style={{ color: MUTED_COLOR, flexShrink: 0, display: "flex" }}>
            <Folder size={20} weight="regular" />
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
            Folders
          </span>
        </div>

        {/* Custom folders list */}
        {customFolders.map((folder) => {
          const folderId = `folder:${folder.id}`;
          const isActive = activeFilter === folderId;
          return (
            <button
              key={folder.id}
              onClick={() => router.push(`/agreements?filter=${encodeURIComponent(folderId)}`)}
              className="w-full flex items-center text-left"
              style={{
                height: "40px",
                paddingLeft: "16px",
                paddingRight: "16px",
                gap: "12px",
                fontSize: "14px",
                fontWeight: isActive ? 700 : 400,
                color: isActive ? LABEL_COLOR : MUTED_COLOR,
                background: "transparent",
                border: "none",
                borderLeft: isActive
                  ? `4px solid ${PURPLE_BAR}`
                  : "4px solid transparent",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = HOVER_BG;
                  e.currentTarget.style.borderLeftColor = "#d0d0d0";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderLeftColor = isActive ? PURPLE_BAR : "transparent";
              }}
            >
              <span style={{ color: isActive ? LABEL_COLOR : MUTED_COLOR, flexShrink: 0, display: "flex" }}>
                <Folder size={20} weight="regular" />
              </span>
              {folder.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
