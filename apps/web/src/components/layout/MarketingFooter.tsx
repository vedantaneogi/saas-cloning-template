"use client";

import Link from "next/link";
import { DocuSignLogo } from "@/components/ui/DocuSignLogo";

// ─── 5 grouped column sets ───────────────────────────────────────────────────
const columnGroups = [
  {
    sections: [
      {
        title: "Applications",
        links: [
          { label: "Intelligent Agreement Management", href: "/intelligent-agreement-management" },
          { label: "IAM Core", href: "/solutions/iam-core" },
          { label: "IAM for Customer Experience", href: "/solutions/departments/customer-experience" },
          { label: "IAM for Sales", href: "/solutions/departments/sales" },
          { label: "All IAM Applications", href: "/solutions" },
        ],
      },
      {
        title: "Products",
        links: [
          { label: "eSignature", href: "/products/electronic-signature" },
          { label: "Contract Lifecycle Management", href: "/products/clm" },
          { label: "Identify", href: "/products/identify" },
          { label: "Agreement Preparation", href: "/products/agreement-preparation" },
          { label: "Web Forms", href: "/products/web-forms" },
          { label: "All Products", href: "/products" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        title: "Pricing",
        links: [
          { label: "IAM Plans", href: "https://ecom.docusign.com/plans-and-pricing/iam" },
          { label: "eSignature Plans", href: "https://ecom.docusign.com/plans-and-pricing/esignature?ipbr=1" },
          { label: "Real Estate Plans", href: "https://ecom.docusign.com/plans-and-pricing/real-estate" },
          { label: "API Plans", href: "https://ecom.docusign.com/plans-and-pricing/developer" },
          { label: "Special Offers & Promos", href: "/products/special-offers" },
        ],
      },
      {
        title: "Industries",
        links: [
          { label: "Financial Services", href: "/solutions/industries/financial-services" },
          { label: "Insurance", href: "/solutions/industries/insurance" },
          { label: "Real Estate", href: "/solutions/industries/real-estate" },
          { label: "Government", href: "/solutions/industries/government" },
          { label: "All Industries", href: "/solutions/industries" },
        ],
      },
      {
        title: "Business Size",
        links: [
          { label: "Enterprise", href: "/solutions/enterprise" },
          { label: "Small & Medium-Sized Business", href: "/solutions/smb" },
          { label: "Individuals", href: "/solutions/individuals" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        title: "Support",
        links: [
          { label: "Support Center", href: "https://support.docusign.com/s/?language=en_US" },
          { label: "Customer Success", href: "/customer-success" },
          { label: "Community", href: "https://community.docusign.com/" },
          { label: "Trust Portal", href: "/trust/trust-portal" },
        ],
      },
      {
        title: "Developers",
        links: [
          { label: "Developer Center", href: "https://developers.docusign.com/" },
          { label: "Free Developer Account", href: "/developers/sandbox" },
          { label: "API Overview", href: "/products/apis" },
        ],
      },
      {
        title: "Partners",
        links: [
          { label: "Partner Portal", href: "https://partners.docusign.com/s/login/" },
          { label: "Partner Login", href: "https://partners.docusign.com/s/login/" },
          { label: "ISV Embedded eSignature", href: "/partners/isv-embed" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        title: "Resources",
        links: [
          { label: "Resource Center", href: "/resources" },
          { label: "eSign Resources", href: "/electronic-signature" },
          { label: "Templates", href: "/templates" },
          { label: "Blog", href: "/blog" },
          { label: "Customer Stories", href: "/customer-stories" },
          { label: "Events", href: "/events" },
          { label: "Webinars", href: "/webinars" },
          { label: "Docusign University", href: "/learning" },
          { label: "Legality Guide", href: "/electronic-signature/legality" },
          { label: "Trust Center & System Status", href: "/trust" },
          { label: "Safety Center", href: "/safety" },
          { label: "Online Signature Generator", href: "/online-signature" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        title: "Company",
        links: [
          { label: "About Us", href: "/company" },
          { label: "Product Releases", href: "/product-releases" },
          { label: "Docusign Momentum", href: "https://momentum.docusign.com/" },
          { label: "Careers", href: "/company/careers" },
          { label: "Leadership", href: "/company/leadership" },
          { label: "News Center", href: "/company/news" },
          { label: "Investor Relations", href: "https://investor.docusign.com" },
          { label: "Contact Us", href: "/company/contact" },
          { label: "Accessibility", href: "/company/accessibility" },
        ],
      },
    ],
  },
];

const legalLinks = [
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Notice", href: "/privacy" },
  { label: "Notice to California Residents", href: "/privacy/california" },
  { label: "Cookie Settings", href: "#" },
  { label: "Intellectual Property", href: "/intellectual-property" },
  { label: "Modern Slavery Act Statement", href: "/modern-slavery" },
];

const locales = [
  "United States",
  "Canada — English",
  "Canada — Français",
  "France",
  "Australia",
  "Japan",
  "Brasil",
  "Nederland",
  "Deutschland",
  "United Kingdom",
  "España",
  "India",
  "Italia",
  "México",
];

export function MarketingFooter() {
  return (
    <footer
      style={{
        background: "rgb(243,244,246)",
        borderTop: "1px solid rgba(19,0,50,0.08)",
        fontFamily: "'DS Indigo', DSIndigo, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "56px 32px 32px",
        }}
      >
        {/* Logo Row */}
        <div style={{ marginBottom: "40px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <DocuSignLogo size="md" showText={true} />
          </Link>
        </div>

        {/* 5-Column Groups Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "32px 24px",
            marginBottom: "48px",
          }}
        >
          {columnGroups.map((group, gi) => (
            <div key={gi} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {group.sections.map((section) => (
                <div key={section.title}>
                  <h4
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "rgb(19,0,50)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 14px",
                    }}
                  >
                    {section.title}
                  </h4>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          style={{
                            fontSize: "13px",
                            color: "rgba(19,0,50,0.7)",
                            textDecoration: "none",
                            lineHeight: "1.5",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.color = "rgb(76,0,255)";
                            (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(19,0,50,0.7)";
                            (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                          }}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Social + App Store Row */}
        <div
          style={{
            borderTop: "1px solid rgba(19,0,50,0.1)",
            paddingTop: "24px",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Country dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "rgba(19,0,50,0.5)", flexShrink: 0 }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <select
              defaultValue="United States"
              style={{
                fontSize: "12px",
                color: "rgba(19,0,50,0.75)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale}
                </option>
              ))}
            </select>
          </div>

          {/* Social icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "8px" }}>
            {/* Facebook */}
            <a
              href="https://www.facebook.com/docusign"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(19,0,50,0.65)", textDecoration: "none" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* X / Twitter */}
            <a
              href="https://twitter.com/docusign"
              aria-label="X (Twitter)"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(19,0,50,0.65)", textDecoration: "none" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* YouTube */}
            <a
              href="https://www.youtube.com/docusign"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(19,0,50,0.65)", textDecoration: "none" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/docusign"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(19,0,50,0.65)", textDecoration: "none" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>

          {/* App Store badges */}
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <a
              href="https://play.google.com/store/apps/details?id=com.docusign.ink"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "rgb(19,0,50)",
                  color: "white",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: 1.35,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontSize: "9px", opacity: 0.8 }}>GET IT ON</span>
                <span>Google Play</span>
              </div>
            </a>
            <a
              href="https://apps.apple.com/us/app/docusign-esign-and-sign-docs/id474990205"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "rgb(19,0,50)",
                  color: "white",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: 1.35,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontSize: "9px", opacity: 0.8 }}>Download on the</span>
                <span>App Store</span>
              </div>
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0",
            marginBottom: "16px",
          }}
        >
          {legalLinks.map((link, idx) => (
            <span key={link.label} style={{ display: "flex", alignItems: "center" }}>
              {idx > 0 && (
                <span style={{ color: "rgba(19,0,50,0.25)", margin: "0 10px" }}>|</span>
              )}
              <a
                href={link.href}
                style={{
                  fontSize: "12px",
                  color: "rgba(19,0,50,0.6)",
                  textDecoration: "none",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgb(76,0,255)";
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(19,0,50,0.6)";
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                }}
              >
                {link.label}
              </a>
            </span>
          ))}
        </div>

        {/* Copyright */}
        <p
          style={{
            fontSize: "12px",
            color: "rgba(19,0,50,0.5)",
            margin: 0,
            textAlign: "center",
          }}
        >
          Copyright &copy; 2026 Docusign, Inc. All rights reserved
        </p>
      </div>
    </footer>
  );
}
