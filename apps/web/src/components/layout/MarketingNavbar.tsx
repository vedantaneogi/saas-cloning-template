"use client";

import { useState } from "react";
import Link from "next/link";
import { DocuSignLogo } from "@/components/ui/DocuSignLogo";

const RIGHT_NAV_LINKS = [
  { label: "Sales 1-877-720-2040", href: "tel:18777202040" },
  { label: "Search", href: "/search" },
  { label: "Support", href: "/support" },
  { label: "Access Documents", href: "/access-documents" },
  { label: "Log In", href: "/sign-in" },
];

const NAV_LINKS = [
  { label: "Products", hasDropdown: true },
  { label: "Solutions", hasDropdown: true },
  { label: "Resources", hasDropdown: true },
  { label: "Enterprise", hasDropdown: false },
  { label: "Plans & Pricing", hasDropdown: false },
];

const PRODUCTS_DROPDOWN = [
  { label: "Intelligent Agreement Management", href: "/intelligent-agreement-management" },
  { label: "Contract Lifecycle Management", href: "/products/clm" },
  { label: "Iris (Agreement AI)", href: "/products/platform/ai" },
  { label: "Agreement Preparation", href: "/products/agreement-preparation" },
  { label: "Navigator", href: "/products/platform/navigator" },
  { label: "eSignature", href: "/products/electronic-signature" },
  { label: "Electronic Notarization", href: "/products/notary" },
  { label: "Maestro", href: "/products/platform/maestro" },
  { label: "Web Forms", href: "/products/web-forms" },
  { label: "Multi-channel Delivery", href: "/products/electronic-signature/features/sms-whatsapp-delivery" },
  { label: "App Center", href: "/products/platform/app-center" },
  { label: "Integrations (1000+)", href: "/integrations" },
  { label: "APIs", href: "/products/apis" },
  { label: "Mobile App", href: "/products/mobile" },
  { label: "Explore All Products →", href: "/products" },
];

const SOLUTIONS_DROPDOWN = [
  { label: "By Department", href: "#", isHeader: true },
  { label: "IAM Core", href: "/solutions/iam-core" },
  { label: "Sales", href: "/solutions/departments/sales" },
  { label: "Customer Experience", href: "/solutions/departments/customer-experience" },
  { label: "Human Resources", href: "/solutions/departments/human-resources" },
  { label: "Legal", href: "/solutions/departments/legal" },
  { label: "Procurement", href: "/solutions/departments/procurement" },
  { label: "By Industry", href: "#", isHeader: true },
  { label: "Financial Services", href: "/solutions/industries/financial-services" },
  { label: "Insurance", href: "/solutions/industries/insurance" },
  { label: "Real Estate", href: "/solutions/industries/real-estate" },
  { label: "Government", href: "/solutions/industries/government" },
  { label: "Healthcare", href: "/solutions/industries/healthcare" },
  { label: "Life Sciences", href: "/solutions/industries/life-sciences" },
];

const RESOURCES_DROPDOWN = [
  { label: "Blog", href: "/blog" },
  { label: "Customer Stories", href: "/customer-stories" },
  { label: "Resource Center", href: "/resources" },
  { label: "Legality Guide", href: "/electronic-signature/legality" },
  { label: "Product Releases", href: "/product-releases" },
  { label: "Support Center", href: "https://support.docusign.com" },
  { label: "Developer Center", href: "https://developers.docusign.com/" },
  { label: "Docusign University", href: "/learning" },
  { label: "Events", href: "/events" },
  { label: "Community", href: "https://community.docusign.com/" },
];

type DropdownKey = "Products" | "Solutions" | "Resources" | null;

export function MarketingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  const handleMouseEnter = (label: string) => {
    if (["Products", "Solutions", "Resources"].includes(label)) {
      setOpenDropdown(label as DropdownKey);
    }
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
  };

  const getDropdownItems = (label: DropdownKey) => {
    if (label === "Products") return PRODUCTS_DROPDOWN;
    if (label === "Solutions") return SOLUTIONS_DROPDOWN;
    if (label === "Resources") return RESOURCES_DROPDOWN;
    return [];
  };

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50 }}>
      {/* Utility Bar */}
      <div
        style={{
          background: "#260559",
          color: "rgb(255,255,255)",
          padding: "0 32px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          fontSize: "13px",
        }}
      >
        {RIGHT_NAV_LINKS.map((link, idx) => (
          <span key={link.label} style={{ display: "flex", alignItems: "center" }}>
            {idx > 0 && (
              <span style={{ color: "rgba(255,255,255,0.35)", margin: "0 12px", fontSize: "12px" }}>|</span>
            )}
            <a
              href={link.href}
              style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "13px" }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {link.label}
            </a>
          </span>
        ))}
      </div>

      {/* Primary Navigation */}
      <nav
        style={{
          background: "rgb(255,255,255)",
          height: "77px",
          borderBottom: "1px solid rgba(19,0,50,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          position: "relative",
        }}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left: Logo + Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <DocuSignLogo size="md" showText={true} />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex" style={{ alignItems: "center", gap: "0" }}>
            {NAV_LINKS.map((link) => (
              <div
                key={link.label}
                style={{ position: "relative" }}
                onMouseEnter={() => handleMouseEnter(link.label)}
              >
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(19,0,50,0.75)",
                    fontSize: "14px",
                    fontWeight: 400,
                    padding: "24px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                  )}
                </button>

                {/* Dropdown */}
                {link.hasDropdown && openDropdown === link.label && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      background: "rgb(255,255,255)",
                      border: "1px solid rgba(19,0,50,0.1)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 32px rgba(19,0,50,0.12)",
                      minWidth: "240px",
                      padding: "8px 0",
                      zIndex: 100,
                    }}
                  >
                    {getDropdownItems(openDropdown).map((item) => (
                      "isHeader" in item && item.isHeader ? (
                        <div
                          key={item.label}
                          style={{
                            padding: "8px 16px 4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "rgba(19,0,50,0.45)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {item.label}
                        </div>
                      ) : (
                        <a
                          key={item.label}
                          href={item.href}
                          style={{
                            display: "block",
                            padding: "9px 16px",
                            fontSize: "14px",
                            color: "rgb(19,0,50)",
                            textDecoration: "none",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = "rgb(237,229,255)";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                          }}
                        >
                          {item.label}
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a
            href="/contact-sales"
            className="hidden lg:block"
            style={{
              color: "rgb(76,0,255)",
              background: "transparent",
              border: "none",
              padding: "10px 4px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Contact Sales
          </a>
          <a
            href="https://ecom.docusign.com/plans-and-pricing/esignature"
            className="hidden lg:block"
            style={{
              color: "rgb(255,255,255)",
              background: "#003087",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Buy Now
          </a>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              color: "rgb(19,0,50)",
            }}
            aria-label="Open Menu"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            className="lg:hidden"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "rgb(255,255,255)",
              borderTop: "1px solid rgba(19,0,50,0.1)",
              borderBottom: "1px solid rgba(19,0,50,0.1)",
              padding: "16px 24px",
              boxShadow: "0 8px 24px rgba(19,0,50,0.1)",
              zIndex: 99,
            }}
          >
            {NAV_LINKS.map((link) => (
              <div key={link.label} style={{ borderBottom: "1px solid rgba(19,0,50,0.06)", padding: "12px 0" }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgb(19,0,50)",
                    fontSize: "16px",
                    fontWeight: 400,
                    width: "100%",
                    textAlign: "left",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
            <div style={{ paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <a href="/contact-sales" style={{ color: "rgb(76,0,255)", border: "none", padding: "12px 16px", fontSize: "13px", fontWeight: 600, textDecoration: "none", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Contact Sales
              </a>
              <a href="https://ecom.docusign.com/plans-and-pricing/esignature" style={{ color: "rgb(255,255,255)", background: "#003087", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", fontWeight: 600, textDecoration: "none", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Buy Now
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
