"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SquaresFour, PaintBucket, User, Bell, Lock, Calculator, Users } from "@phosphor-icons/react";

const PURPLE_BAR    = "#7a4ab3";
const PRIMARY_COLOR = "#240b5b";
const LABEL_COLOR   = "#333333";
const MUTED_COLOR   = "#666666";
const BORDER_COLOR  = "#e0e0e0";
const HOVER_BG      = "#f4f4f4";
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

interface AdminSidebarProps {
  activeItem?: string;
  onItem?: (item: string) => void;
  accountName?: string;
  accountId?: string;
}

interface NavRowItem {
  id: string;
  label: string;
  icon?: React.ReactElement;
  locked?: boolean;
}

function NavRow({
  item,
  isActive,
  onClick,
  noIcon,
}: {
  item: NavRowItem;
  isActive: boolean;
  onClick: () => void;
  noIcon?: boolean;
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
        paddingLeft: noIcon ? "20px" : "16px",
        paddingRight: "16px",
        gap: noIcon ? undefined : "12px",
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
        fontFamily: DS_FONT,
      }}
    >
      {item.icon && (
        <span style={{ color: isActive ? LABEL_COLOR : MUTED_COLOR, flexShrink: 0, display: "flex" }}>
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.locked && (
        <span style={{ color: "#999", flexShrink: 0, display: "flex" }}>
          <Lock size={14} weight="regular" />
        </span>
      )}
    </button>
  );
}

const ACCOUNT_ITEMS: NavRowItem[] = [
  { id: "plan",     label: "Plan and Billing" },
  { id: "profile",  label: "Account Profile" },
  { id: "security", label: "Security Settings" },
  { id: "regional", label: "Regional Settings" },
];

const ICON_ITEMS: NavRowItem[] = [
  { id: "branding",          label: "Branding",         icon: <PaintBucket size={20} weight="regular" />, locked: true },
  { id: "stamps",            label: "Stamps",            icon: <User size={20} weight="regular" /> },
  { id: "updates",           label: "Updates",           icon: <Bell size={20} weight="regular" /> },
  { id: "value-calculator",  label: "Value Calculator",  icon: <Calculator size={20} weight="regular" /> },
];

const USERS_ITEMS: NavRowItem[] = [
  { id: "users", label: "Users" },
];

export function AdminSidebar({
  activeItem: activeItemProp,
  onItem,
  accountName = "My Organization",
  accountId = "ACC-000001",
}: AdminSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeItem = activeItemProp ?? searchParams.get("section") ?? "overview";

  function handleNav(id: string) {
    if (onItem) {
      onItem(id);
    } else {
      router.push(`/admin?section=${id}`);
    }
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        width: "260px",
        background: "#F8F8F8",
        borderRight: `1px solid ${BORDER_COLOR}`,
        fontFamily: DS_FONT,
      }}
    >
      {/* Account header */}
      <div className="px-4 py-4" style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: LABEL_COLOR, margin: 0 }}>
          {accountName}
        </p>
        <p style={{ fontSize: "13px", color: MUTED_COLOR, marginTop: "2px", margin: 0 }}>
          {accountId}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto">
        {/* Overview */}
        <NavRow
          item={{ id: "overview", label: "Overview", icon: <SquaresFour size={20} weight="regular" /> }}
          isActive={activeItem === "overview"}
          onClick={() => handleNav("overview")}
        />

        {/* ACCOUNT section header */}
        <div
          className="flex items-center px-4"
          style={{ height: "40px" }}
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
            Account
          </span>
        </div>

        {/* Account items — no icon */}
        {ACCOUNT_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            isActive={activeItem === item.id}
            onClick={() => handleNav(item.id)}
            noIcon
          />
        ))}

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "16px 16px" }} />

        {/* Icon items */}
        {ICON_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            isActive={activeItem === item.id}
            onClick={() => handleNav(item.id)}
          />
        ))}

        {/* USERS AND GROUPS section header */}
        <div
          className="flex items-center px-4"
          style={{ height: "40px" }}
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
            Users and Groups
          </span>
        </div>

        {/* Users item — no icon */}
        {USERS_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            isActive={activeItem === item.id}
            onClick={() => handleNav(item.id)}
            noIcon
          />
        ))}
      </nav>
    </div>
  );
}
