export function Footer() {
  return (
    <footer className="bg-white border-t" style={{ borderColor: "#E0E0E0" }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-10">
          {/* Logo column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: "#1B0A3C" }}>
                <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <span className="text-lg font-bold" style={{ color: "#1B0A3C" }}>Docusign</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The world&apos;s #1 way to send and sign from anywhere.
            </p>
            <div className="flex gap-3">
              {["twitter", "linkedin", "facebook", "youtube"].map((social) => (
                <button key={social} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-gray-500 rounded-sm opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "#1B0A3C" }}>Products</h4>
            <ul className="space-y-2">
              {["eSignature", "CLM", "ID Verification", "Notary", "Payments", "Web Forms"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-[#1B0A3C] no-underline">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "#1B0A3C" }}>Solutions</h4>
            <ul className="space-y-2">
              {["Healthcare", "Financial Services", "Real Estate", "Legal", "HR & People Ops", "Government"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-[#1B0A3C] no-underline">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "#1B0A3C" }}>Resources</h4>
            <ul className="space-y-2">
              {["Blog", "Webinars", "Case Studies", "Documentation", "API Docs", "Support"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-[#1B0A3C] no-underline">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "#1B0A3C" }}>Company</h4>
            <ul className="space-y-2">
              {["About Us", "Careers", "Partners", "Newsroom", "Contact Us", "Investors"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-[#1B0A3C] no-underline">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t pt-6" style={{ borderColor: "#E0E0E0" }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <p className="text-xs text-gray-400">
              &copy; 2003-2025 Docusign, Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4">
              {["Privacy Policy", "Terms of Use", "Cookie Preferences", "Accessibility"].map((link) => (
                <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600 no-underline">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
