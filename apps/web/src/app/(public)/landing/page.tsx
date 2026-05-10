"use client";

import { useState } from "react";

// ─── Arrow icon (inline, reusable) ──────────────────────────────────────────
function ArrowRight({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ─── Chevron down ─────────────────────────────────────────────────────────────
function ChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ─── Feature tab data ─────────────────────────────────────────────────────────
type FeatureCard = {
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
};

type TabData = {
  label: string;
  cards: FeatureCard[];
};

const tabsData: TabData[] = [
  {
    label: "Featured",
    cards: [
      {
        heading: "Search, manage, and analyze agreements with AI",
        description:
          "Use AI to find agreements and terms quickly, receive agreement reminders, and access powerful insights from a central repository.",
        ctaLabel: "Explore Navigator",
        ctaHref: "/products/platform/navigator",
        image: "/assets/images/feature-navigator.png",
      },
      {
        heading: "Send, sign, and track documents",
        description:
          "Get signatures from anywhere, using almost any device. Finalize agreements faster with collaborative commenting, shared templates, and delivery in the apps your signers already use.",
        ctaLabel: "Explore eSignature",
        ctaHref: "/products/electronic-signature",
        image: "/assets/images/feature-mobile.png",
      },
      {
        heading: "Automate agreement processes",
        description:
          "Build customized workflows that automate and accelerate the various steps in your agreement processes—no coding required.",
        ctaLabel: "Explore Maestro",
        ctaHref: "/products/platform/maestro",
        image: "/assets/images/feature-workflow.png",
      },
      {
        heading: "Build and scale with developer tools and APIs",
        description:
          "Integrate, customize, and scale agreement processes—creating solutions tailored to your unique business needs.",
        ctaLabel: "Explore Developer Center",
        ctaHref: "https://developers.docusign.com/",
        image: "/assets/images/feature-api.png",
      },
      {
        heading: "Bring people, agreements, and information together",
        description:
          "Centralize agreements in a secure hub to simplify tasks and collaborate in real-time, eliminating the back-and-forth that frustrates your customers.",
        ctaLabel: "Explore Workspaces",
        ctaHref: "/products/workspaces",
        image: "/assets/images/feature-workspaces.png",
      },
      {
        heading: "Optimize your contract lifecycle",
        description:
          "Accelerate cycle times, maximize agreement value, and eliminate unnecessary contractual risks.",
        ctaLabel: "Explore CLM",
        ctaHref: "/products/clm",
        image: "/assets/images/feature-clm.png",
      },
    ],
  },
  {
    label: "Sales",
    cards: [
      {
        heading: "Close deals faster with automated proposals",
        description:
          "Empower your sales team to generate, send, and track proposals with built-in e-signature, reducing the time from proposal to close.",
        ctaLabel: "Explore Sales Solutions",
        ctaHref: "/solutions/departments/sales",
        image: "/assets/images/feature-navigator.png",
      },
      {
        heading: "Integrate with your CRM",
        description:
          "Connect Docusign to Salesforce, HubSpot, and more to trigger agreement workflows directly from your existing sales tools.",
        ctaLabel: "Explore Integrations",
        ctaHref: "/integrations",
        image: "/assets/images/feature-workflow.png",
      },
      {
        heading: "Track every agreement in real time",
        description:
          "Know exactly where each deal stands with real-time status updates, automated reminders, and full audit trails for every signature.",
        ctaLabel: "Explore eSignature",
        ctaHref: "/products/electronic-signature",
        image: "/assets/images/feature-mobile.png",
      },
      {
        heading: "Build and scale with developer tools and APIs",
        description:
          "Embed agreement workflows directly into your sales portal or custom CRM with Docusign's industry-leading APIs.",
        ctaLabel: "Explore Developer Center",
        ctaHref: "https://developers.docusign.com/",
        image: "/assets/images/feature-api.png",
      },
    ],
  },
  {
    label: "Customer Experience",
    cards: [
      {
        heading: "Delight customers with seamless digital agreements",
        description:
          "Offer your customers a frictionless experience with guided signing flows, mobile-friendly documents, and real-time status updates.",
        ctaLabel: "Explore Customer Experience",
        ctaHref: "/solutions/departments/customer-experience",
        image: "/assets/images/feature-mobile.png",
      },
      {
        heading: "Collaborate with customers in shared workspaces",
        description:
          "Give customers a secure hub to view, comment on, and sign agreements — no account required.",
        ctaLabel: "Explore Workspaces",
        ctaHref: "/products/workspaces",
        image: "/assets/images/feature-workspaces.png",
      },
      {
        heading: "Automate customer-facing agreement workflows",
        description:
          "Trigger onboarding, renewal, and approval workflows automatically, keeping customers informed at every step.",
        ctaLabel: "Explore Maestro",
        ctaHref: "/products/platform/maestro",
        image: "/assets/images/feature-workflow.png",
      },
      {
        heading: "Gain AI-powered insights into customer agreements",
        description:
          "Surface trends, risks, and renewal opportunities across all your customer agreements with Docusign's AI analytics.",
        ctaLabel: "Explore Navigator",
        ctaHref: "/products/platform/navigator",
        image: "/assets/images/feature-navigator.png",
      },
    ],
  },
  {
    label: "Procurement",
    cards: [
      {
        heading: "Streamline vendor contracts and approvals",
        description:
          "Automate the full procurement lifecycle from RFP to signed contract, cutting cycle times and reducing manual errors.",
        ctaLabel: "Explore Procurement Solutions",
        ctaHref: "/solutions/departments/procurement",
        image: "/assets/images/feature-clm.png",
      },
      {
        heading: "Centralize supplier agreements with AI",
        description:
          "Use AI to extract key terms, track obligations, and flag renewal dates across your entire supplier agreement portfolio.",
        ctaLabel: "Explore Navigator",
        ctaHref: "/products/platform/navigator",
        image: "/assets/images/feature-navigator.png",
      },
      {
        heading: "Automate PO and contract workflows",
        description:
          "Build no-code workflows that route purchase orders, contracts, and approvals to the right people at the right time.",
        ctaLabel: "Explore Maestro",
        ctaHref: "/products/platform/maestro",
        image: "/assets/images/feature-workflow.png",
      },
      {
        heading: "Connect procurement data across your systems",
        description:
          "Integrate with SAP, Oracle, Workday, and 1,000+ other tools to keep agreement data synchronized across your procurement stack.",
        ctaLabel: "Explore Integrations",
        ctaHref: "/integrations",
        image: "/assets/images/feature-api.png",
      },
    ],
  },
  {
    label: "Human Resources",
    cards: [
      {
        heading: "Onboard new hires faster with digital agreements",
        description:
          "Replace paper-based onboarding with digital offer letters, NDAs, and policies — fully signed before day one.",
        ctaLabel: "Explore HR Solutions",
        ctaHref: "/solutions/departments/human-resources",
        image: "/assets/images/feature-mobile.png",
      },
      {
        heading: "Automate HR approval workflows",
        description:
          "Route performance reviews, promotions, and policy acknowledgements through automated approval chains — no email required.",
        ctaLabel: "Explore Maestro",
        ctaHref: "/products/platform/maestro",
        image: "/assets/images/feature-workflow.png",
      },
      {
        heading: "Manage employee agreements at scale",
        description:
          "Store, search, and audit every employee agreement in a centralized repository with AI-powered search and obligation tracking.",
        ctaLabel: "Explore Navigator",
        ctaHref: "/products/platform/navigator",
        image: "/assets/images/feature-navigator.png",
      },
      {
        heading: "Stay compliant with global HR regulations",
        description:
          "Ensure every employee agreement meets local legal requirements with Docusign's built-in compliance and audit trail capabilities.",
        ctaLabel: "Explore Trust Center",
        ctaHref: "/trust",
        image: "/assets/images/feature-clm.png",
      },
    ],
  },
  {
    label: "Legal",
    cards: [
      {
        heading: "Manage the full contract lifecycle",
        description:
          "From drafting to execution to renewal, CLM gives your legal team full visibility and control over every agreement.",
        ctaLabel: "Explore CLM",
        ctaHref: "/products/clm",
        image: "/assets/images/feature-clm.png",
      },
      {
        heading: "Analyze contracts with AI",
        description:
          "Extract key terms, identify risks, and benchmark contract language against your playbook with Docusign's AI-powered contract analysis.",
        ctaLabel: "Explore Navigator",
        ctaHref: "/products/platform/navigator",
        image: "/assets/images/feature-navigator.png",
      },
      {
        heading: "Collaborate with redlines and comments",
        description:
          "Mark up, negotiate, and finalize contracts in a shared workspace — no more email attachments or version confusion.",
        ctaLabel: "Explore Workspaces",
        ctaHref: "/products/workspaces",
        image: "/assets/images/feature-workspaces.png",
      },
      {
        heading: "Automate legal review and approval workflows",
        description:
          "Route contracts through your legal review process automatically, with escalation rules, deadlines, and full audit trails.",
        ctaLabel: "Explore Maestro",
        ctaHref: "/products/platform/maestro",
        image: "/assets/images/feature-workflow.png",
      },
    ],
  },
];

const moreTabItems = [
  "Accounting and Tax",
  "Education",
  "Life Sciences",
  "Nonprofit",
  "Healthcare",
  "Manufacturing",
  "Construction",
  "Financial Services",
  "IT and Operations",
  "Government",
  "Retail",
  "Insurance",
];

// ─── Trust stats ──────────────────────────────────────────────────────────────
const trustStats = [
  {
    stat: "1B+",
    label: "people and 1.7 million customers use Docusign",
  },
  {
    stat: "95%",
    label: "of Fortune 500 companies use Docusign",
  },
  {
    stat: "44",
    label: "languages available for signers, plus 14 for senders",
  },
  {
    stat: "#1",
    label: "most trustworthy software company in America, according to Newsweek",
  },
];

// ─── Compliance badges ────────────────────────────────────────────────────────
const complianceBadges = ["ISO 27001", "FedRAMP", "APEC PPP", "CSA STAR", "PCI DSS", "SSAE 18"];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  {
    company: "Unilever",
    stats: [
      { value: "50%", label: "reduction in average contract completion time" },
      { value: "80%", label: "Reduction in contract drafting times*" },
    ],
    quote:
      "People would search their email inbox looking for the last email with a contract attachment, having to make sure it's the right one... We wanted tools and solutions that would harmonize, simplify and bring efficiencies.",
    attribution: "Wei Ling Lim",
    title: "General Counsel for Global Supply Chain, Unilever",
    ctaHref:
      "https://www.docusign.com/customer-stories/unilever-uplevels-its-procurement-processes-with-docusign",
    logo: "/assets/images/logo-unilever.svg",
  },
  {
    company: "Vestwell",
    stats: [
      { value: "5 min", label: "To create agreement packages (down from 75)" },
      { value: "70%", label: "Fewer drop-offs" },
    ],
    quote:
      "Before Docusign, getting an agreement out the door was like walking through a maze. Now, it's a clear path.",
    attribution: "Jon Mark",
    title: "COO, Vestwell",
    ctaHref:
      "https://www.docusign.com/customer-stories/vestwell-ramps-up-automation-and-boosts-revenue-by-investing-in-docusign-clm",
    logo: null,
  },
  {
    company: "Primerica",
    stats: [
      { value: "23%", label: "Reduction in paper processing" },
      { value: "<2 Hrs", label: "Average agreement completion time using mobile sign" },
    ],
    quote:
      "Given the growing number of sales representatives working with Primerica, our partnership with Docusign has been invaluable in supporting our objective to work with more clients than ever before.",
    attribution: "Misty Sutton",
    title: "Senior Vice President of Project Management & Automation, Primerica",
    ctaHref:
      "https://www.docusign.com/customer-stories/primerica-partners-with-docusign-to-deliver-high-tech-high-touch-financial-services",
    logo: "/assets/images/logo-primerica.svg",
  },
  {
    company: "Flowserve",
    stats: [
      { value: "30%", label: "Growth in profit margins" },
      { value: "40%", label: "Faster legal reviews" },
    ],
    quote:
      "What used to take days and lots of emails now happens in minutes. And CLM reminds people when their contracts are about to expire so we can proactively negotiate and maximize our margins.",
    attribution: "Dundi Thompson",
    title: "Project Manager in Legal Operations, Flowserve",
    ctaHref:
      "https://www.docusign.com/customer-stories/flowserve-boosts-speed-and-profit-margins-with-docusign-clm-and-salesforce",
    logo: null,
  },
];

// ─── Blog articles ─────────────────────────────────────────────────────────────
const blogArticles = [
  {
    title: "How We Built an Autonomous Coding Agent for Repetitive Engineering Tasks",
    href: "/blog/how-we-built-an-autonomous-coding-agent-for-repetitive-engineering-tasks",
    date: "Apr 29, 2026",
    category: "Blog",
    image: "/assets/images/blog-1.png",
  },
  {
    title: "Capturing Value Through Simplicity at Perceptyx",
    href: "/blog/capturing-value-through-simplicity-at-perceptyx",
    date: "Apr 28, 2026",
    category: "Blog",
    image: "/assets/images/blog-2.png",
  },
  {
    title: "Cheers to Docusign's 2026 Customer Award Winners",
    href: "/blog/docusign-customer-awards-2026",
    date: "Apr 27, 2026",
    category: "Blog",
    image: "/assets/images/blog-3.png",
  },
];

// ─── Customer logos for marquee ──────────────────────────────────────────────
const customerLogos = [
  { name: "Kroger", src: "/assets/images/logo-kroger.svg" },
  { name: "RE/MAX", src: "/assets/images/logo-remax.svg" },
  { name: "Domino's", src: "/assets/images/logo-dominos.svg" },
  { name: "United", src: "/assets/images/logo-united.svg" },
  { name: "Santander", src: "/assets/images/logo-santander.svg" },
  { name: "Unilever", src: "/assets/images/logo-unilever.svg" },
  { name: "Canva", src: "/assets/images/logo-canva.svg" },
  { name: "Apple", src: "/assets/images/logo-apple.svg" },
  { name: "Primerica", src: "/assets/images/logo-primerica.svg" },
  { name: "Ducati", src: "/assets/images/logo-ducati.svg" },
  { name: "ThermoFisher", src: "/assets/images/logo-thermofisher.svg" },
  { name: "Calendly", src: "/assets/images/logo-calendly.svg" },
];

// ─── Integration partners (text-based grid) ───────────────────────────────────
const integrationPartners = [
  "Salesforce",
  "Microsoft",
  "Google",
  "SAP",
  "Oracle",
  "Workday",
  "ServiceNow",
  "Slack",
  "Box",
  "Dropbox",
  "HubSpot",
  "Stripe",
];


// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [carouselDot, setCarouselDot] = useState(0);

  const currentTabData = tabsData[activeTab] ?? tabsData[0]!;

  return (
    <div
      style={{
        fontFamily: "'DS Indigo', DSIndigo, Helvetica, Arial, sans-serif",
        color: "rgb(19,0,50)",
        overflowX: "hidden",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background:
            "radial-gradient(100% 100% at 50% -20%, #FF5252 0%, #4C00FF 100%)",
          height: "600px",
          padding: "0 32px",
          position: "relative",
          overflow: "visible",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "40% 60%",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Left: Text + CTAs */}
          <div>
            <h1
              style={{
                fontSize: "48px",
                fontWeight: 300,
                lineHeight: "51.84px",
                color: "rgb(255,255,255)",
                margin: "0 0 24px",
              }}
            >
              Find the right plan for your needs
            </h1>
            <p
              style={{
                fontSize: "18px",
                fontWeight: 400,
                color: "rgb(255,255,255)",
                margin: "0 0 40px",
                lineHeight: "1.6",
              }}
            >
              From simple sending and signing to powerful AI and automation, find the perfect plan to
              optimize your agreement operations.
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {/* Filled purple button */}
              <a
                href="https://ecom.docusign.com/plans-and-pricing/esignature"
                style={{
                  background: "#4C00FF",
                  color: "rgb(255,255,255)",
                  borderRadius: "8px",
                  padding: "16px 24px",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                View Plans and Pricing
              </a>
              {/* White outlined button */}
              <a
                href="/products"
                style={{
                  background: "transparent",
                  color: "rgb(255,255,255)",
                  border: "1px solid rgb(255,255,255)",
                  borderRadius: "8px",
                  padding: "16px 24px",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                Explore All Products
              </a>
            </div>
          </div>

          {/* Right: Product UI Screenshot — positioned absolutely to overflow hero */}
          <div
            style={{
              position: "absolute",
              right: "32px",
              top: "80px",
              width: "55%",
              zIndex: 2,
            }}
          >
            <img
              src="/assets/images/hero-product.png"
              alt="UI displaying Docusign Product Features"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "12px",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)",
                display: "block",
              }}
            />
          </div>
        </div>
      </section>

      {/* Spacer to accommodate the 200px hero image overflow */}
      <div style={{ height: "200px", background: "rgb(255,255,255)" }} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — SOCIAL PROOF LOGO BAR (Marquee)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(255,255,255)",
          overflow: "hidden",
          borderBottom: "1px solid rgba(19,0,50,0.08)",
        }}
      >
        <div
          style={{
            height: "102px",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Fade edge left */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "100px",
              background: "linear-gradient(to right, rgb(255,255,255) 20%, transparent)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
          {/* Fade edge right */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "100px",
              background: "linear-gradient(to left, rgb(255,255,255) 20%, transparent)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
          {/* Scrolling track — duplicated for seamless loop */}
          <div
            style={{
              display: "flex",
              gap: "56px",
              animation: "marquee 32s linear infinite",
              whiteSpace: "nowrap",
              alignItems: "center",
            }}
          >
            {[...customerLogos, ...customerLogos].map((logo, i) => (
              <img
                key={`${logo.name}-${i}`}
                src={logo.src}
                alt={logo.name}
                style={{
                  height: "36px",
                  width: "auto",
                  maxWidth: "120px",
                  objectFit: "contain",
                  opacity: 0.6,
                  flexShrink: 0,
                  filter: "grayscale(100%)",
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — FAST COMPANY AWARD BANNER
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(255,255,255)",
          padding: "80px 32px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "80px",
            alignItems: "center",
          }}
        >
          {/* Left: Award image */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src="/assets/images/fast-company-award.png"
              alt="Docusign recognized as one of Fast Company's Most Innovative Companies of 2026"
              style={{
                maxWidth: "420px",
                width: "100%",
                height: "auto",
                borderRadius: "12px",
              }}
            />
          </div>

          {/* Right: Text */}
          <div>
            <h2
              style={{
                fontSize: "36px",
                fontWeight: 400,
                lineHeight: "43.2px",
                color: "rgb(19,0,50)",
                margin: "0 0 20px",
              }}
            >
              Most Innovative Companies of 2026
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "rgb(19,0,50)",
                lineHeight: "1.7",
                margin: "0 0 20px",
              }}
            >
              Docusign is proud to have been named to Fast Company&apos;s prestigious list of the
              World&apos;s Most Innovative Companies of 2026. This year&apos;s list shines a
              spotlight on businesses that are shaping industry through their innovations.
            </p>
            <blockquote
              style={{
                borderLeft: "3px solid rgb(76,0,255)",
                paddingLeft: "20px",
                margin: "0 0 32px",
                color: "rgba(19,0,50,0.8)",
                fontSize: "15px",
                lineHeight: "1.7",
                fontStyle: "italic",
              }}
            >
              &ldquo;Docusign has transformed the humble contract into every company&apos;s secret
              weapon,&rdquo; said Allan Thygesen, CEO of Docusign. &ldquo;Our AI-native Intelligent
              Agreement Management platform doesn&apos;t just digitize agreements – it unlocks the
              insights trapped inside them, turning contracts into a strategic advantage. We&apos;re
              honored that Fast Company has recognized our work to redefine what agreements mean to
              business.&rdquo;
            </blockquote>
            <a
              href="/blog/fast-company-worlds-most-innovative-companies-2026"
              style={{
                color: "rgb(76,0,255)",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Learn More &gt;
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — AI-POWERED AGREEMENT MANAGEMENT (centered)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(255,255,255)",
          padding: "80px 32px",
          borderTop: "1px solid rgba(19,0,50,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "48px",
              fontWeight: 300,
              lineHeight: "51.84px",
              color: "rgb(76,0,255)",
              margin: "0 0 24px",
            }}
          >
            AI-powered agreement management
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "rgba(19,0,50,0.8)",
              lineHeight: "1.7",
              margin: "0 0 32px",
            }}
          >
            Analyze agreements with AI, sign documents electronically, and automate workflows with
            the Intelligent Agreement Management (IAM) platform.
          </p>
          <a
            href="/intelligent-agreement-management"
            style={{
              color: "rgb(76,0,255)",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Explore Docusign IAM &gt;
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — TABBED FEATURE CARDS (interactive)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(237,229,255)",
          padding: "0 32px 80px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* ── Tab Navigation ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "32px 0 24px",
              overflowX: "auto",
              scrollbarWidth: "none" as const,
              position: "sticky",
              top: 0,
              background: "rgb(237,229,255)",
              zIndex: 10,
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(19,0,50,0.7)",
                whiteSpace: "nowrap" as const,
                marginRight: "8px",
                flexShrink: 0,
              }}
            >
              View solutions
            </span>
            {tabsData.map((tab, i) => {
              const isActive = activeTab === i;
              return (
                <button
                  key={tab.label}
                  onClick={() => {
                    setActiveTab(i);
                    setShowMoreDropdown(false);
                  }}
                  style={{
                    background: isActive ? "rgb(76,0,255)" : "transparent",
                    border: isActive
                      ? "2px solid rgb(76,0,255)"
                      : "2px solid rgba(19,0,50,0.25)",
                    cursor: "pointer",
                    padding: "8px 18px",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "rgb(255,255,255)" : "rgba(19,0,50,0.7)",
                    borderRadius: "9999px",
                    whiteSpace: "nowrap" as const,
                    fontFamily: "inherit",
                    transition: "background 0.15s, color 0.15s, border-color 0.15s",
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            {/* More dropdown button */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setShowMoreDropdown((v) => !v)}
                style={{
                  background: "transparent",
                  border: "2px solid rgba(19,0,50,0.25)",
                  cursor: "pointer",
                  padding: "8px 18px",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "rgba(19,0,50,0.7)",
                  borderRadius: "9999px",
                  whiteSpace: "nowrap" as const,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                &#8943; More
                <ChevronDown size={14} />
              </button>
              {showMoreDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    background: "rgb(255,255,255)",
                    boxShadow: "0 8px 32px rgba(19,0,50,0.16)",
                    borderRadius: "12px",
                    padding: "20px 24px 24px",
                    zIndex: 20,
                    width: "480px",
                    border: "1px solid rgba(19,0,50,0.08)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "rgba(19,0,50,0.5)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      margin: "0 0 16px",
                    }}
                  >
                    Other industries and departments
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "4px 16px",
                    }}
                  >
                    {moreTabItems.map((item) => (
                      <a
                        key={item}
                        href={`/solutions/industry/${item.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={() => setShowMoreDropdown(false)}
                        style={{
                          display: "block",
                          padding: "8px 10px",
                          fontSize: "14px",
                          color: "rgb(19,0,50)",
                          textDecoration: "none",
                          borderRadius: "6px",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLAnchorElement).style.background =
                            "rgb(237,229,255)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")
                        }
                      >
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Feature Cards Grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "24px",
            }}
          >
            {currentTabData.cards.map((card) => (
              <div
                key={card.heading}
                style={{
                  background: "rgb(237,229,255)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(76,0,255,0.1)",
                }}
              >
                {/* Card content (text at top) */}
                <div style={{ padding: "40px 40px 32px", flex: "1" }}>
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 500,
                      color: "rgb(19,0,50)",
                      margin: "0 0 16px",
                      lineHeight: "1.3",
                    }}
                  >
                    {card.heading}
                  </h3>
                  <p
                    style={{
                      fontSize: "15px",
                      color: "rgba(19,0,50,0.75)",
                      lineHeight: "1.65",
                      margin: "0 0 24px",
                    }}
                  >
                    {card.description}
                  </p>
                  <a
                    href={card.ctaHref}
                    style={{
                      color: "rgb(76,0,255)",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {card.ctaLabel} &gt;
                  </a>
                </div>
                {/* Card screenshot image at the bottom */}
                <div style={{ padding: "0 24px 24px" }}>
                  <img
                    src={card.image}
                    alt={card.heading}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "220px",
                      objectFit: "cover",
                      objectPosition: "top center",
                      borderRadius: "8px",
                      boxShadow: "0 4px 20px rgba(19,0,50,0.12)",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — "DO (MUCH) MORE WITH IAM" + VIDEO
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(255,255,255)",
          padding: "80px 32px",
          borderTop: "1px solid rgba(19,0,50,0.06)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Centered text + CTAs */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            <h2
              style={{
                fontSize: "36px",
                fontWeight: 400,
                lineHeight: "43.2px",
                color: "rgb(19,0,50)",
                margin: "0 0 20px",
              }}
            >
              Do (much) more with IAM
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(19,0,50,0.8)",
                lineHeight: "1.7",
                margin: "0 auto 32px",
                maxWidth: "640px",
              }}
            >
              Save time and unlock value from your agreements. With our pre-configured IAM
              applications, you can automate workflows, manage and analyze documents with AI, and
              seamlessly connect agreement data across systems.
            </p>
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap" as const,
              }}
            >
              <a
                href="https://ecom.docusign.com/plans-and-pricing/iam"
                style={{
                  background: "rgb(76,0,255)",
                  color: "rgb(255,255,255)",
                  borderRadius: "8px",
                  padding: "16px 24px",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  whiteSpace: "nowrap" as const,
                }}
              >
                View Plans and Pricing
              </a>
              <a
                href="/products"
                style={{
                  color: "rgb(76,0,255)",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Explore All Products
                <ArrowRight size={16} color="rgb(76,0,255)" />
              </a>
            </div>
          </div>

          {/* Video player (static thumbnail with play button) */}
          <div
            style={{
              background: "#1A0533",
              borderRadius: "16px",
              width: "100%",
              aspectRatio: "16/9",
              maxHeight: "600px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            {/* Thumbnail image behind */}
            <img
              src="/assets/images/hero-product.png"
              alt="Docusign IAM Platform walkthrough"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                opacity: 0.55,
              }}
            />
            {/* Dark overlay to deepen the background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(26,5,51,0.45)",
              }}
            />
            {/* Play button overlay */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  background: "rgba(255,255,255,0.18)",
                  border: "2.5px solid rgba(255,255,255,0.85)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                  transition: "background 0.2s",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                Watch the IAM Platform Demo
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 7 — INTEGRATIONS / BUILD WORKFLOWS
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background:
            "radial-gradient(100% 100% at 50% 0%, #4C00FF 0%, #26065D 100%)",
          padding: "80px 32px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* Top: centered text area */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "56px",
            }}
          >
            <h2
              style={{
                fontSize: "36px",
                fontWeight: 400,
                lineHeight: "43.2px",
                color: "rgb(255,255,255)",
                margin: "0 0 20px",
              }}
            >
              Build custom agreement workflows
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.85)",
                lineHeight: "1.7",
                margin: "0 auto 32px",
                maxWidth: "600px",
              }}
            >
              Extend your workflows with a robust App Center, 1,000+ partner integrations,
              industry-leading APIs, and seamless connections to cloud storage.
            </p>
            <a
              href="/integrations"
              style={{
                color: "rgb(255,255,255)",
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.75)",
                borderRadius: "8px",
                padding: "14px 28px",
                fontSize: "15px",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Explore Integrations
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Bottom: two rows of integration logo cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Row 1 — first 6 partners */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "12px",
              }}
            >
              {integrationPartners.slice(0, 6).map((partner) => (
                <div
                  key={`row1-${partner}`}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "12px",
                    padding: "20px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgb(255,255,255)",
                    textAlign: "center" as const,
                    backdropFilter: "blur(8px)",
                    minHeight: "72px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {partner}
                </div>
              ))}
            </div>
            {/* Row 2 — remaining 6 partners */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "12px",
              }}
            >
              {integrationPartners.slice(6).map((partner) => (
                <div
                  key={`row2-${partner}`}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "12px",
                    padding: "20px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgb(255,255,255)",
                    textAlign: "center" as const,
                    backdropFilter: "blur(8px)",
                    minHeight: "72px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {partner}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 — TRUST & SECURITY STATS
          + SECTION 9 — COMPLIANCE BADGES (continuous dark purple)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(38,6,93)",
          padding: "80px 32px 0",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Two-column layout: text LEFT, 2x2 white cards RIGHT */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "64px",
              alignItems: "center",
            }}
          >
            {/* Left: heading + subtitle + white link */}
            <div>
              <h2
                style={{
                  fontSize: "36px",
                  fontWeight: 400,
                  lineHeight: "43.2px",
                  color: "rgb(255,255,255)",
                  margin: "0 0 20px",
                }}
              >
                Trusted the world over
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.8)",
                  lineHeight: "1.7",
                  margin: "0 0 28px",
                }}
              >
                We take your agreements as seriously as you do, which is why Docusign meets the most
                stringent global security standards.
              </p>
              <a
                href="/trust"
                style={{
                  color: "rgb(255,255,255)",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Explore Trust Center &gt;
              </a>
            </div>

            {/* Right: 2x2 grid of white stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {trustStats.map((item) => (
                <div
                  key={item.stat}
                  style={{
                    background: "rgb(255,255,255)",
                    borderRadius: "12px",
                    padding: "28px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* Small colored icon badge at top */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgb(76,0,255)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  {/* Purple highlighted number + label */}
                  <div
                    style={{
                      fontSize: "15px",
                      color: "rgb(19,0,50)",
                      lineHeight: "1.55",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "rgb(76,0,255)" }}>
                      {item.stat}{" "}
                    </span>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 9 — Compliance badges (continuous bg) ── */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "64px 0 80px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              margin: "0 0 24px",
            }}
          >
            DOCUSIGN GLOBAL COMPLIANCE &amp; CERTIFICATIONS
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "12px" }}>
            {complianceBadges.map((badge) => (
              <div
                key={badge}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "14px 24px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {/* Green checkmark circle */}
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "rgb(34,197,94)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 10 — CUSTOMER TESTIMONIALS
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "rgb(255,255,255)",
          padding: "80px 32px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Centered heading + subtitle + link */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2
            style={{
              fontSize: "36px",
              fontWeight: 400,
              lineHeight: "43.2px",
              color: "rgb(19,0,50)",
              margin: "0 0 16px",
            }}
          >
            Companies do better with Docusign
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "rgba(19,0,50,0.7)",
              lineHeight: "1.65",
              margin: "0 auto 20px",
              maxWidth: "600px",
            }}
          >
            1.7 million businesses, one solution for every agreement challenge.
          </p>
          <a
            href="/customer-stories"
            style={{
              color: "rgb(76,0,255)",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Browse Customer Stories &gt;
          </a>
          </div>

          {/* Company logo tab buttons */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "32px",
              overflowX: "auto",
              scrollbarWidth: "none" as const,
            }}
          >
            {testimonials.map((t, i) => {
              const isActive = activeTestimonial === i;
              return (
                <button
                  key={t.company}
                  onClick={() => setActiveTestimonial(i)}
                  style={{
                    background: isActive ? "rgb(237,229,255)" : "transparent",
                    border: isActive ? "2px solid rgb(76,0,255)" : "2px solid rgba(19,0,50,0.15)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "rgb(76,0,255)" : "rgba(19,0,50,0.6)",
                    whiteSpace: "nowrap" as const,
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {t.company}
                </button>
              );
            })}
          </div>

          {/* Active testimonial card */}
          {testimonials[activeTestimonial] && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 3fr",
                gap: "0",
                alignItems: "stretch",
                background: "rgb(248,246,255)",
                borderRadius: "12px",
                overflow: "hidden",
                minHeight: "420px",
              }}
            >
              {/* Left: person photo with video play button overlay */}
              <div
                style={{
                  position: "relative",
                  background: "rgb(21,27,23)",
                  overflow: "hidden",
                  minHeight: "420px",
                }}
              >
                {/* Gradient background as photo placeholder */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgb(76,0,255) 0%, rgb(38,6,93) 100%)",
                    opacity: 0.85,
                  }}
                />
                {/* Company name at bottom-left */}
                <div style={{ position: "absolute", bottom: "24px", left: "24px" }}>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {testimonials[activeTestimonial]!.company}
                  </span>
                </div>
                {/* Play button + timestamp */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                      border: "2px solid rgba(255,255,255,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "4px",
                      padding: "3px 8px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    01:50
                  </span>
                </div>
              </div>

              {/* Right: large quote + name/title + stat cards */}
              <div
                style={{
                  padding: "48px 56px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                {/* Large quote text */}
                <blockquote
                  style={{
                    margin: "0 0 28px",
                    fontSize: "20px",
                    fontWeight: 400,
                    color: "rgb(19,0,50)",
                    lineHeight: "1.6",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{testimonials[activeTestimonial]!.quote}&rdquo;
                </blockquote>

                {/* Person name + title */}
                <div style={{ marginBottom: "36px" }}>
                  <div
                    style={{ fontSize: "15px", fontWeight: 700, color: "rgb(19,0,50)", marginBottom: "4px" }}
                  >
                    {testimonials[activeTestimonial]!.attribution}
                  </div>
                  <div style={{ fontSize: "13px", color: "rgba(19,0,50,0.6)" }}>
                    {testimonials[activeTestimonial]!.title}
                  </div>
                </div>

                {/* Stat cards row */}
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" as const }}>
                  {testimonials[activeTestimonial]!.stats.map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "rgb(255,255,255)",
                        borderRadius: "10px",
                        padding: "20px 24px",
                        minWidth: "160px",
                        boxShadow: "0 2px 8px rgba(19,0,50,0.07)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: 700,
                          color: "rgb(76,0,255)",
                          lineHeight: 1.1,
                          marginBottom: "6px",
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgba(19,0,50,0.65)",
                          lineHeight: "1.4",
                          maxWidth: "160px",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 11 — RECOMMENDED FOR YOU (carousel + blog articles)
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "linear-gradient(#F8F3F0 0%, #FFF 100%)",
          padding: "80px 32px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "36px",
              fontWeight: 400,
              color: "rgb(19,0,50)",
              margin: "0 0 32px",
            }}
          >
            Recommended for you
          </h2>

          {/* Featured carousel — one large purple card */}
          <div style={{ marginBottom: "56px" }}>
            {/* Carousel card */}
            <div
              style={{
                background: "rgb(76,0,255)",
                borderRadius: "16px",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "1fr 420px",
                minHeight: "340px",
              }}
            >
              {/* Left: text content */}
              <div
                style={{
                  padding: "56px 60px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "rgba(255,255,255,0.95)",
                      borderRadius: "4px",
                      padding: "4px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      display: "inline-block",
                      marginBottom: "24px",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    Momentum26
                  </span>
                  <h3
                    style={{
                      fontSize: "28px",
                      fontWeight: 400,
                      lineHeight: "1.3",
                      color: "rgb(255,255,255)",
                      margin: "0 0 16px",
                      maxWidth: "420px",
                    }}
                  >
                    Bringing agreements to life, together
                  </h3>
                  <p
                    style={{
                      fontSize: "15px",
                      color: "rgba(255,255,255,0.82)",
                      margin: "0 0 32px",
                      lineHeight: "1.65",
                      maxWidth: "380px",
                    }}
                  >
                    Join leaders across Sales, Legal, Procurement, and CX for sessions built for
                    your role. May 20 &amp; 21.
                  </p>
                </div>
                <a
                  href="https://momentum.docusign.com/?ref=recom"
                  style={{
                    color: "rgb(76,0,255)",
                    background: "rgb(255,255,255)",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    alignSelf: "flex-start",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  Save your seat
                </a>
              </div>

              {/* Right: event image */}
              <div style={{ overflow: "hidden" }}>
                <img
                  src="/assets/images/blog-1.png"
                  alt="Momentum26 — Bringing agreements to life, together"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* Carousel dots */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              {[0, 1, 2].map((dot) => (
                <button
                  key={dot}
                  onClick={() => setCarouselDot(dot)}
                  aria-label={`Slide ${dot + 1}`}
                  style={{
                    width: carouselDot === dot ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background: carouselDot === dot ? "rgb(76,0,255)" : "rgba(19,0,50,0.2)",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "width 0.2s, background 0.2s",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Blog articles grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
            }}
          >
            {blogArticles.map((article) => (
              <a
                key={article.title}
                href={article.href}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div
                  style={{
                    background: "rgb(255,255,255)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(19,0,50,0.08)",
                  }}
                >
                  <div style={{ height: "200px", overflow: "hidden", borderRadius: "12px 12px 0 0" }}>
                    <img
                      src={article.image}
                      alt={article.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px 12px 0 0" }}
                    />
                  </div>
                  <div style={{ padding: "24px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "rgba(19,0,50,0.55)",
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {article.category}
                      </span>
                      <span style={{ fontSize: "11px", color: "rgba(19,0,50,0.4)" }}>
                        Published {article.date}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: "17px",
                        fontWeight: 500,
                        lineHeight: "1.45",
                        color: "rgb(19,0,50)",
                        margin: 0,
                      }}
                    >
                      {article.title}
                    </h3>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 12 — BOTTOM CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "#F8F3F0",
          padding: "0 32px 80px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              background: "#4C00FF",
              borderRadius: "16px",
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "stretch",
              minHeight: "360px",
            }}
          >
            {/* Left: Text + CTAs */}
            <div style={{ padding: "64px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h2
                style={{
                  fontSize: "36px",
                  fontWeight: 400,
                  lineHeight: "43.2px",
                  color: "rgb(255,255,255)",
                  margin: "0 0 32px",
                  maxWidth: "480px",
                }}
              >
                Docusign IAM is the agreement platform your business needs
              </h2>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" as const }}>
                <a
                  href="https://trial.docusign.com"
                  style={{
                    background: "transparent",
                    color: "rgb(255,255,255)",
                    border: "2px solid rgb(255,255,255)",
                    borderRadius: "8px",
                    padding: "14px 24px",
                    fontSize: "15px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  Start for Free
                </a>
                <a
                  href="/intelligent-agreement-management"
                  style={{
                    color: "rgb(76,0,255)",
                    background: "rgb(255,255,255)",
                    borderRadius: "8px",
                    padding: "14px 24px",
                    fontSize: "15px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  Explore Docusign IAM
                  <ArrowRight size={16} color="rgb(76,0,255)" />
                </a>
              </div>
            </div>

            {/* Right: Person image with coral hexagonal frame overlay */}
            <div
              style={{
                width: "320px",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <svg
                viewBox="0 0 320 360"
                width="320"
                height="360"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}
                aria-hidden="true"
              >
                <polygon
                  points="160,10 310,95 310,265 160,350 10,265 10,95"
                  fill="none"
                  stroke="#FF5252"
                  strokeWidth="6"
                  opacity="0.75"
                />
              </svg>
              <img
                src="/assets/images/cta-person.png"
                alt="A person in a mustard-colored shirt engaged in a discussion about Docusign."
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
