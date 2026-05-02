"use client";

import { ReactNode, useState } from "react";
import { DocuSignLogo } from "@/components/ui/DocuSignLogo";

const LANGUAGES = [
  "English (US)", "English (UK)", "Bahasa Indonesia", "Bahasa Melayu", "Dansk", "Deutsch",
  "Eesti", "Español", "Español (América Latina)", "Français (Canada)", "Français (France)",
  "Hrvatski", "Italiano", "Latviešu", "Lietuvių", "Magyar", "Nederlands", "Norsk", "Polski",
  "Português (Brasil)", "Português (Portugal)", "Română", "Slovenčina", "Slovenščina",
  "Srpski", "Suomi", "Svenska", "Türkçe", "Việt", "Čeština", "Ελληνικά", "Български",
  "Русский", "Українська", "Հայերէն", "עברית‏", "العربية‏", "فارسی", "हिन्दी",
  "ภาษาไทย", "中文 (简体)", "中文 (繁体)", "日本語", "한국어",
];

function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("English (US)");

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "1px solid rgba(19,0,50,0.15)",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "11px",
          color: "rgba(19,0,50,0.9)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {selected}
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              marginBottom: "4px",
              background: "white",
              border: "1px solid rgba(19,0,50,0.1)",
              borderRadius: "4px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxHeight: "300px",
              overflowY: "auto",
              width: "200px",
              zIndex: 101,
              padding: "4px 0",
            }}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => { setSelected(lang); setOpen(false); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: lang === selected ? "#260559" : "rgba(19,0,50,0.9)",
                  fontWeight: lang === selected ? 600 : 400,
                  background: lang === selected ? "rgba(76,0,255,0.04)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (lang !== selected) e.currentTarget.style.background = "rgba(19,0,50,0.04)"; }}
                onMouseLeave={(e) => { if (lang !== selected) e.currentTarget.style.background = "transparent"; }}
              >
                {lang}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F5F5" }}>
      {/* Header bar — no colored accent line */}
      <header
        className="flex-shrink-0 bg-white flex items-center"
        style={{
          height: "64px",
          borderBottom: "1px solid rgba(19,0,50,0.08)",
          padding: "0 24px",
        }}
      >
        <DocuSignLogo size="lg" showText={true} />
      </header>

      {/* Content — centered */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        {children}
      </div>

      {/* Footer */}
      <footer
        className="flex-shrink-0 px-6 py-3"
        style={{ borderTop: "1px solid rgba(19,0,50,0.08)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "rgba(19,0,50,0.7)" }}>
            <span>Powered by</span>
            <DocuSignLogo size="sm" showText={true} />
          </div>

          <div className="flex items-center" style={{ fontSize: "11px", color: "rgba(19,0,50,0.7)", gap: "6px" }}>
            <LanguageSelector />
            <span style={{ color: "rgba(19,0,50,0.3)", margin: "0 4px" }}>|</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Contact Us</button>
            <span style={{ color: "rgba(19,0,50,0.3)" }}>|</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Terms of Use</button>
            <span style={{ color: "rgba(19,0,50,0.3)" }}>|</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Privacy</button>
            <span style={{ color: "rgba(19,0,50,0.3)" }}>|</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Intellectual Property</button>
            <span style={{ color: "rgba(19,0,50,0.3)" }}>|</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Trust</button>
          </div>

          <p style={{ fontSize: "11px", color: "rgba(19,0,50,0.7)" }}>
            Copyright &copy; 2026 Docusign, Inc. All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
