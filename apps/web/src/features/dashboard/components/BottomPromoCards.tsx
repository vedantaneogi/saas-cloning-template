"use client";

import { useRouter } from "next/navigation";

function UpgradeIllustration() {
  return (
    <svg viewBox="0 0 140 110" width="140" height="110" aria-hidden="true">
      <rect width="140" height="110" fill="#f3f0ff" />
      {/* Large dark navy circle, bottom-left bleed */}
      <circle cx="35" cy="85" r="62" fill="#1e1b4b" opacity="0.92" />
      {/* Coral/red accent shape top-right */}
      <rect x="100" y="8" width="38" height="38" rx="4" fill="#f87171" opacity="0.9" />
      {/* Lavender overlap circle center */}
      <circle cx="95" cy="72" r="26" fill="#c4b5fd" opacity="0.78" />
      {/* Tiny white accent */}
      <circle cx="50" cy="32" r="7" fill="white" opacity="0.35" />
    </svg>
  );
}

function HelpIllustration() {
  return (
    <svg viewBox="0 0 140 110" width="140" height="110" aria-hidden="true">
      <rect width="140" height="110" fill="#f3f0ff" />
      {/* Dark navy large circle, left bleed */}
      <circle cx="28" cy="78" r="55" fill="#1e1b4b" opacity="0.9" />
      {/* Coral/orange circle right */}
      <circle cx="108" cy="50" r="32" fill="#fb923c" opacity="0.88" />
      {/* Lavender overlap circle */}
      <circle cx="72" cy="68" r="26" fill="#a78bfa" opacity="0.72" />
      {/* Tiny white accent top-right */}
      <circle cx="118" cy="18" r="9" fill="white" opacity="0.35" />
    </svg>
  );
}

function PromoCard({
  illustration,
  title,
  description,
  linkLabel,
  onLinkClick,
}: {
  illustration: React.ReactNode;
  title: string;
  description: string;
  linkLabel: string;
  onLinkClick: () => void;
}) {
  return (
    <div
      className="flex-1 bg-white flex flex-row overflow-hidden"
      style={{ borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* Left: illustration area */}
      <div style={{ width: "140px", flexShrink: 0, overflow: "hidden" }}>
        {illustration}
      </div>

      {/* Right: text content */}
      <div className="flex flex-col justify-center" style={{ padding: "20px 24px" }}>
        <h3
          className="mb-1"
          style={{ fontSize: "15px", fontWeight: 700, color: "rgba(19, 0, 50, 0.9)" }}
        >
          {title}
        </h3>
        <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.6)", lineHeight: "1.5" }}>
          {description}{" "}
          <button
            onClick={onLinkClick}
            style={{
              color: "#4C00FF",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "underline",
            }}
          >
            {linkLabel}
          </button>
        </p>
      </div>
    </div>
  );
}

export function BottomPromoCards() {
  const router = useRouter();

  return (
    <div className="flex gap-6">
      <PromoCard
        illustration={<UpgradeIllustration />}
        title="Ready to upgrade?"
        description="Let's find the perfect plan for you."
        linkLabel="View Plans"
        onLinkClick={() => router.push("/admin")}
      />
      <PromoCard
        illustration={<HelpIllustration />}
        title="Need help getting started?"
        description="Get help with basic questions."
        linkLabel="View Our Guide"
        onLinkClick={() => window.open("https://support.docusign.com", "_blank")}
      />
    </div>
  );
}
