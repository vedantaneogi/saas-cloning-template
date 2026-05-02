"use client";

import { Question, Chats, ThumbsUp, Shield } from "@phosphor-icons/react";

export function DashboardFooter() {
  return (
    <footer
      className="flex-shrink-0 mt-auto border-t"
      style={{ background: "white", borderColor: "#E0E0E0" }}
    >
      {/* Research panel row — left text, right vertical link list */}
      <div
        className="px-6 py-5 flex items-start justify-between gap-8 border-b"
        style={{ borderColor: "#E0E0E0" }}
      >
        {/* Left: research panel text */}
        <p className="text-xs text-gray-500 max-w-lg">
          Want to participate in Docusign research studies?{" "}
          <a
            href="https://www.docusign.com/customer-research-panel"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
            style={{ color: "rgba(19,0,50,0.55)" }}
          >
            Join our Product Experience Research Panel
          </a>
        </p>

        {/* Right: vertical flex-col support links with icons */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <a
            href="https://support.docusign.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs hover:underline"
            style={{ color: "rgba(19,0,50,0.55)" }}
          >
            <Question size={14} weight="bold" />
            Support Home
          </a>
          <a
            href="https://community.docusign.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs hover:underline"
            style={{ color: "rgba(19,0,50,0.55)" }}
          >
            <Chats size={14} weight="bold" />
            Community
          </a>
          <a
            href="https://support.docusign.com/s/case-form"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs hover:underline"
            style={{ color: "rgba(19,0,50,0.55)" }}
          >
            <ThumbsUp size={14} weight="bold" />
            Submit Feedback
          </a>
          <a
            href="https://www.docusign.com/trust"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs hover:underline"
            style={{ color: "rgba(19,0,50,0.55)" }}
          >
            <Shield size={14} weight="bold" />
            Trust Center
          </a>
        </div>
      </div>

      {/* Standard footer links row */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>English (US)</span>
        <span className="text-gray-300">|</span>
        <a
          href="https://www.docusign.com/company/contact-us"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-gray-400"
        >
          Contact Us
        </a>
        <span className="text-gray-300">|</span>
        <a
          href="https://www.docusign.com/company/terms-and-conditions/users"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-gray-400"
        >
          Terms of Use
        </a>
        <span className="text-gray-300">|</span>
        <a
          href="https://www.docusign.com/company/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-gray-400"
        >
          Privacy
        </a>
        <span className="text-gray-300">|</span>
        <a
          href="https://www.docusign.com/intellectual-property"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-gray-400"
        >
          Intellectual Property
        </a>
        <span className="text-gray-300">|</span>
        <a
          href="https://www.docusign.com/trust"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-gray-400"
        >
          Trust
        </a>
        <span className="text-gray-300">|</span>
        <span>Copyright &copy; {new Date().getFullYear()} Docusign, Inc.</span>
      </div>
    </footer>
  );
}
