"use client";

import { useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { AdminOverview } from "@/features/admin/components/AdminOverview";
import { Button } from "@/components/ui/Button";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  primary: "#260559",
  text: "rgba(19,0,50,0.9)",
  secondary: "rgba(19,0,50,0.6)",
  border: "rgba(19,0,50,0.1)",
  font: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
} as const;

const ITEM_LABELS: Record<string, string> = {
  overview: "Overview",
  plan: "Plan and Billing",
  profile: "Account Profile",
  security: "Security Settings",
  regional: "Regional Settings",
  branding: "Branding",
  stamps: "Stamps",
  updates: "Updates",
};

// ─── Placeholder for non-overview pages ───────────────────────────────────────
function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="px-8 py-6">
        <h1
          className="text-xl font-bold mb-6"
          style={{ color: T.text, fontFamily: T.font }}
        >
          {title}
        </h1>

        {title === "Plan and Billing" ? (
          <div className="max-w-lg">
            <div
              className="rounded-lg p-6 mb-6"
              style={{ border: `1px solid ${T.border}` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3
                    className="text-base font-semibold"
                    style={{ color: T.text, fontFamily: T.font }}
                  >
                    Free Trial
                  </h3>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: T.secondary, fontFamily: T.font }}
                  >
                    15 days remaining
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  style={{ background: T.primary, fontFamily: T.font }}
                >
                  Upgrade Plan
                </Button>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Up to 5 free envelopes", included: true },
                  { label: "Basic templates", included: true },
                  { label: "Email support", included: true },
                  { label: "Advanced workflows", included: false },
                  { label: "Bulk send", included: false },
                  { label: "API access", included: false },
                  { label: "Custom branding", included: false },
                ].map((feature) => (
                  <div key={feature.label} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check size={16} color="#00B851" weight="bold" />
                    ) : (
                      <X size={16} color="#D93025" weight="bold" />
                    )}
                    <span
                      style={{
                        color: feature.included ? T.text : "rgba(19,0,50,0.35)",
                        fontFamily: T.font,
                      }}
                    >
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-24"
            style={{ color: T.secondary }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(76,0,255,0.07)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="26"
                height="26"
                style={{ color: T.primary, opacity: 0.45 }}
              >
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22l-1.92 3.32c-.12.22-.07.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z" />
              </svg>
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: T.text, fontFamily: T.font }}
            >
              {title}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: T.secondary, fontFamily: T.font }}
            >
              Settings coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client shell ─────────────────────────────────────────────────────────────
export function AdminClient() {
  const [activeItem, setActiveItem] = useState("overview");

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <AdminSidebar
        activeItem={activeItem}
        onItem={setActiveItem}
        accountName="My Organization"
        accountId="ACC-000001"
      />

      {activeItem === "overview" ? (
        <AdminOverview onNavigate={setActiveItem} />
      ) : (
        <SettingsPlaceholder title={ITEM_LABELS[activeItem] ?? activeItem} />
      )}
    </div>
  );
}
