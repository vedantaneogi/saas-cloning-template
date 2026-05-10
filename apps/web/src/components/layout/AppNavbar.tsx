"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { DocuSignLogo } from "@/components/ui/DocuSignLogo";
import { ListChecks, Question } from "@phosphor-icons/react";

const navTabs = [
  { id: "home", label: "Home", href: "/home" },
  { id: "agreements", label: "Agreements", href: "/agreements" },
  { id: "templates", label: "Templates", href: "/templates" },
  { id: "reports", label: "Reports", href: "/reports" },
  { id: "admin", label: "Admin", href: "/admin" },
];

export function AppNavbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  const activeTab = navTabs.find((t) => pathname.startsWith(t.href))?.id ?? "home";

  const accountNumber = user?.id ? String(user.id).slice(-8).toUpperCase() : "A1B2C3D4";
  const userName = user?.email?.split("@")[0] ?? "user";

  return (
    <header
      className="sticky top-0 z-50 bg-white flex-shrink-0"
      style={{
        height: "64px",
        borderBottom: "0.625px solid rgba(19, 0, 50, 0.1)",
        padding: "0px 16px",
      }}
    >
      <div className="flex items-center h-full">
        {/* Logo */}
        <Link href="/home" className="flex items-center mr-6 no-underline flex-shrink-0">
          <DocuSignLogo size="sm" showText={true} />
        </Link>

        {/* Nav Tabs — gap 24px between tabs, full height for underline positioning */}
        <nav className="flex items-center h-full" style={{ gap: "24px" }}>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="flex items-center justify-center h-full no-underline relative"
                style={{
                  fontSize: "16px",
                  fontWeight: isActive ? 600 : 400,
                  color: "rgba(19, 0, 50, 0.9)",
                  textDecoration: "none",
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "2px",
                      background: "#130032",
                      borderRadius: 0,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right side */}
        <div className="flex items-center" style={{ gap: "8px" }}>
          {/* Tasks icon — links to /tasks page */}
          <Link
            href="/tasks"
            title="Tasks"
            style={{
              background: "none",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              color: pathname === "/tasks" ? "#130032" : "rgba(19, 0, 50, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              borderBottom: pathname === "/tasks" ? "2px solid #130032" : "none",
            }}
          >
            <ListChecks size={20} weight="bold" />
          </Link>

          {/* Help icon with dropdown */}
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              onClick={() => setHelpMenuOpen(!helpMenuOpen)}
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                color: "rgba(19, 0, 50, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
              }}
              title="Help"
            >
              <Question size={20} weight="bold" />
            </button>
            {/* Red notification dot */}
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "7px",
                height: "7px",
                borderRadius: "9999px",
                background: "#E8342A",
                border: "1.5px solid white",
                pointerEvents: "none",
              }}
            />

            {helpMenuOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  onClick={() => setHelpMenuOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: "300px",
                    background: "white",
                    borderRadius: "8px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
                    border: "1px solid rgba(19, 0, 50, 0.1)",
                    zIndex: 20,
                    overflow: "hidden",
                  }}
                >
                  {/* Get started section */}
                  <div style={{ padding: "16px", borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(19,0,50,0.9)" }}>Get started</span>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "9999px",
                          background: "#E8342A",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          height: "6px",
                          background: "#EDE9FE",
                          borderRadius: "9999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: "20%",
                            background: "#7C3AED",
                            borderRadius: "9999px",
                          }}
                        />
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: "rgba(19,0,50,0.55)", margin: "0 0 4px" }}>
                      Next: Send a Document
                    </p>
                    <button
                      style={{
                        fontSize: "12px",
                        color: "#4C00FF",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      View checklist
                    </button>
                  </div>

                  {/* Support links */}
                  <div style={{ padding: "8px 0" }}>
                    {[
                      {
                        label: "Support Center",
                        icon: (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                          </svg>
                        ),
                      },
                      {
                        label: "Share Feedback",
                        icon: (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        ),
                        underline: true,
                      },
                      {
                        label: "Help for this Page",
                        icon: (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        ),
                      },
                    ].map(({ label, icon, underline }) => (
                      <button
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 16px",
                          fontSize: "14px",
                          color: "rgba(19,0,50,0.85)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: underline ? "underline" : "none",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#F5F3FF")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span style={{ color: "rgba(19,0,50,0.5)", flexShrink: 0 }}>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Article links */}
                  <div style={{ borderTop: "1px solid rgba(19,0,50,0.08)", padding: "12px 16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(19,0,50,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                      Articles
                    </p>
                    {[
                      "Add documents to an envelope",
                      "Send a document for signature",
                      "Track envelope status",
                    ].map((article) => (
                      <button
                        key={article}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "5px 0",
                          fontSize: "13px",
                          color: "#4C00FF",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {article}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User avatar — 40x40, #CAF4FC bg, #035A6C text */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                background: "none",
                border: "none",
                padding: "0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "9999px",
                  background: "#CAF4FC",
                  color: "#035A6C",
                  fontSize: "16px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                title={user?.name ?? "User"}
              >
                {getInitials(user?.name ?? "User")}
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: "4px",
                    width: "288px",
                    background: "white",
                    borderRadius: "8px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    border: "1px solid rgba(19, 0, 50, 0.1)",
                    zIndex: 20,
                  }}
                >
                  {user && (
                    <div
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid rgba(19, 0, 50, 0.1)",
                      }}
                    >
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#1B0A3C", margin: "0 0 2px" }}>
                        {user.name}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6B6B6B", margin: "0 0 2px" }}>{user.email}</p>
                      <p style={{ fontSize: "12px", color: "#6B6B6B", margin: "0 0 2px" }}>Account #{accountNumber}</p>
                      <p style={{ fontSize: "12px", color: "#6B6B6B", margin: "0 0 12px" }}>{userName}</p>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          router.push("/admin");
                        }}
                        style={{
                          width: "100%",
                          textAlign: "center",
                          padding: "6px 0",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 500,
                          border: "1.5px solid #1B0A3C",
                          color: "#1B0A3C",
                          background: "white",
                          cursor: "pointer",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "white")}
                      >
                        Manage Profile
                      </button>
                    </div>
                  )}
                  <div style={{ padding: "4px 0" }}>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push("/admin");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: "#374151",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                    >
                      My Preferences
                    </button>
                    <div style={{ borderTop: "1px solid rgba(19, 0, 50, 0.1)", margin: "4px 0" }} />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logoutMutation.mutate();
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: "#374151",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
