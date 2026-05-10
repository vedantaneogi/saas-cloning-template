# Docusign Landing Page Extraction
**Source URL:** https://www.docusign.com  
**Extracted:** 2026-05-01  
**Viewport used for extraction:** 1200px wide (desktop default)  
**Screenshots:** `.tasks/screenshots/`

---

## 1. PAGE TITLE & META
- **Title:** Docusign | #1 in Electronic Signature and Intelligent Agreement Management
- **Page height:** ~11,421px (full scroll)
- **Brand font:** `DSIndigo, Helvetica, Arial, sans-serif`

---

## 2. COLOR PALETTE

### Primary Brand Colors
| Color Name | RGB Value | Hex Approx | Usage |
|---|---|---|---|
| Brand Purple (primary) | `rgb(76, 0, 255)` | `#4C00FF` | Buttons, links, CTAs, accent |
| Deep Purple (dark) | `rgb(38, 6, 93)` | `#26065D` | Dark sections, footer bg |
| Navy/Dark Text | `rgb(19, 0, 50)` | `#130032` | Body text, nav text |
| White | `rgb(255, 255, 255)` | `#FFFFFF` | Backgrounds, text on dark |

### Secondary / Accent Colors
| Color Name | RGB Value | Hex Approx | Usage |
|---|---|---|---|
| Lavender Light | `rgb(237, 229, 255)` | `#EDE5FF` | Feature card backgrounds |
| Lavender Mid | `rgb(203, 194, 255)` | `#CBC2FF` | Accents |
| Warm Cream | `rgb(248, 243, 240)` | `#F8F3F0` | Recommended section bg |
| Coral/Red | `rgb(255, 82, 82)` | `#FF5252` | Hero gradient (top end) |

### Gradients Used
```css
/* Hero section background */
background: radial-gradient(100% 100% at 50% -20%, rgb(255, 82, 82) 0%, rgb(76, 0, 255) 100%);

/* Integrations section background */
background: radial-gradient(100% 100% at 50% 0%, rgb(76, 0, 255) 0%, rgb(38, 6, 93) 100%);

/* Recommended for you section */
background: linear-gradient(rgb(248, 243, 240) 0%, rgb(255, 255, 255) 100%);

/* CTA bottom section (half-half) */
background: linear-gradient(0deg, rgb(248, 243, 240) 50%, rgb(255, 255, 255) 50%);
```

### Text Color Variants
- Primary text: `rgb(19, 0, 50)` — `#130032`
- Muted text: `rgba(19, 0, 50, 0.75)` — nav items
- Subtle text: `rgba(19, 0, 50, 0.35)` and `rgba(19, 0, 50, 0.15)` — hints

---

## 3. TYPOGRAPHY

### Font Family
```css
font-family: DSIndigo, Helvetica, Arial, sans-serif;
```

### Heading Scale
| Element | Font Size | Font Weight | Line Height | Color |
|---|---|---|---|---|
| H1 (Hero) | `48px` | `300` (Light) | `51.84px` | `rgb(255,255,255)` |
| H2 (Primary sections) | `48px` | `300` | `51.84px` | `rgb(19,0,50)` |
| H2 (Secondary sections) | `36px` | `400` | `43.2px` | `rgb(19,0,50)` |
| H2 (Dark sections) | `36px` | `400` | `43.2px` | `rgb(255,255,255)` |
| H2 (Award section) | `36px` | `400` | `43.2px` | `rgb(19,0,50)` |
| H2 (CTA bottom) | `36px` | `400` | `43.2px` | `rgb(255,255,255)` |
| H2 (Cards in carousel) | `24px` | `400` | `29.76px` | `rgb(255,255,255)` |
| H2 (Blog articles) | `18px` | `500` | `22.32px` | `rgb(19,0,50)` |
| H3 (Feature cards) | Inherited from h2 | `400` | — | `rgb(19,0,50)` |
| Modal heading | `24px` | `500` | `36px` | `rgb(255,255,255)` |

### Body Text Scale
| Usage | Font Size | Font Weight | Color |
|---|---|---|---|
| Hero subtitle | `18px` | `400` | `rgb(255,255,255)` |
| Body copy | `16px` | `400` | `rgb(19,0,50)` |
| Nav items (top-level) | `14px` | `400` | `rgba(19,0,50,0.75)` |
| Nav items (dropdown) | `16px` | `400` | `rgb(19,0,50)` |

---

## 4. NAVIGATION STRUCTURE

### Announcement Bar (Top)
- **Background:** `rgb(38, 6, 93)` (deep purple)
- **Text color:** `rgb(255, 255, 255)` (white)
- **Padding:** `0px 32px`
- **Layout:** Full-width bar above primary nav
- **Content:**
  - Left: `NEW` badge + link text: "Deloitte Report: See how AI is driving 43% faster revenue"
  - Link URL: `https://www.docusign.com/deloitte-agreement-study`
  - Right links: Sales `1-877-720-2040`, Search, Support, Access Documents, Log In

### Primary Navigation Bar
- **Background:** `rgb(255, 255, 255)` (white)
- **Height:** `77px`
- **Text color:** `rgb(19, 0, 50)`
- **Total header height (announcement + nav):** ~107px
- **Logo:** Docusign wordmark (img), links to `https://www.docusign.com`
- **Mobile:** Hamburger menu icon (Open Menu button)

#### Primary Nav Links (top-level, desktop)
| Link Text | Color | Padding | Font Size |
|---|---|---|---|
| Products | `rgba(19,0,50,0.75)` | `24px 0px` | `14px` |
| Solutions | `rgba(19,0,50,0.75)` | `24px 0px` | `14px` |
| Resources | `rgba(19,0,50,0.75)` | `24px 0px` | `14px` |
| Enterprise | `rgba(19,0,50,0.75)` | `24px 0px` | `14px` |
| Plans & Pricing | `rgba(19,0,50,0.75)` | `24px 0px` | `14px` |

#### Primary CTA Buttons (right side of nav)
| Button | Background | Text Color | Border Radius | Padding | URL |
|---|---|---|---|---|---|
| Contact Sales | `transparent` | `rgb(76,0,255)` | `8px` | `12px 16px` | `/contact-sales` |
| Buy Now | `rgb(76,0,255)` | `rgb(255,255,255)` | `8px` | `12px 16px` | `https://ecom.docusign.com/plans-and-pricing/esignature` |

#### Products Dropdown Menu Items
- Intelligent Agreement Management — `/intelligent-agreement-management`
- Contract Lifecycle Management — `/products/clm`
- Iris (Agreement AI) — `/products/platform/ai`
- Agreement Preparation — `/products/agreement-preparation`
- Navigator — `/products/platform/navigator`
- eSignature — `/products/electronic-signature`
- Electronic Notarization — `/products/notary`
- Maestro — `/products/platform/maestro`
- Web Forms — `/products/web-forms`
- Multi-channel Delivery — `/products/electronic-signature/features/sms-whatsapp-delivery`
- App Center — `/products/platform/app-center`
- Integrations (1000+) — `/integrations`
- APIs — `/products/apis`
- Mobile App — `/products/mobile`
- [Explore All Products] — `/products`

#### Solutions Dropdown
- By Department: IAM Core, Sales, Customer Experience, Human Resources, Legal, Procurement
- By Industry: Financial Services, Insurance, Real Estate, Government, Healthcare, Life Sciences
- By Size: Enterprise, SMB, Individuals

#### Resources Dropdown
- Blog, Customer Stories, Resource Center, Legality Guide, Product Releases, Roadmap, eSign Resources, Support Center, Customer Success, Docusign University, Trust Center & System Status, Safety Center, Developer Center, Partner Ecosystem, Templates, Community, Events, Docusign Momentum

---

## 5. PAGE SECTIONS (Top to Bottom)

### SECTION 1: Hero
- **Position:** Top of `<main>`, at y=107px
- **Height:** 600px
- **Background:** `radial-gradient(100% 100% at 50% -20%, rgb(255, 82, 82) 0%, rgb(76, 0, 255) 100%)`
  - Coral-red at top center fading to bright purple down through the section
- **Layout:** 2-column (text left, product UI screenshot right)

#### Hero Text Content
- **H1 Heading:** "Find the right plan for your needs"
  - Font: `DSIndigo`, Size: `48px`, Weight: `300` (light), Color: `rgb(255,255,255)`, Line-height: `51.84px`
- **Subtitle paragraph:** "From simple sending and signing to powerful AI and automation, find the perfect plan to optimize your agreement operations."
  - Font size: `18px`, Weight: `400`, Color: `rgb(255,255,255)`

#### Hero CTA Buttons
| Button | Style | Background | Text Color | Border Radius | Padding | URL |
|---|---|---|---|---|---|---|
| View Plans and Pricing | Primary (filled) | `rgb(255,255,255)` | `rgb(76,0,255)` | `8px` | `16px 24px` | `https://ecom.docusign.com/plans-and-pricing/esignature` |
| Explore All Products | Secondary (ghost/text) | `transparent` | `rgb(255,255,255)` | `8px` | `16px 24px` | `/products` |

#### Hero Image
- **Alt text:** "UI displaying Docusign Product Features"
- **Source:** `https://cdn.bfldr.com/HIN7H4LI/at/j83rpzt5q598cqh6xbsrwp/ui-docusign-product-features-en-US.png`
- **Query params:** `?auto=webp&format=avif&quality=90&width=500&max_age=2592000`

---

### SECTION 2: Social Proof Logo Bar
- **Position:** Below hero at y=707px
- **Height:** 102px
- **Background:** `rgb(255,255,255)`
- **Layout:** Horizontal marquee/scroll of customer logos
- **Logos included (marquee, duplicated for animation):**
  United, Santander, Unilever, Canva, Apple, Primerica, Ducati, ThermoFisher Scientific, Calendly, Forest Stewardship Council, Kroger, Domino's Pizza

---

### SECTION 3: Award / Social Proof Banner
- **Position:** y=809px
- **Height:** 757px
- **Background:** `rgb(255,255,255)`
- **Layout:** 2-column (image left, text right)

#### Content
- **Image:** Fast Company "Most Innovative Companies of 2026" badge (Docusign featured)
- **Alt text:** "Docusign recognized as one of Fast Company's Most Innovative Companies of 2026"
- **H2:** "Most Innovative Companies of 2026"
  - Size: `36px`, Weight: `400`, Color: `rgb(19,0,50)`, Line-height: `43.2px`
- **Body text:** "Docusign is proud to have been named to Fast Company's prestigious list of the World's Most Innovative Companies of 2026. This year's list shines a spotlight on businesses that are shaping industry through their innovations."
- **Quote:** "\"Docusign has transformed the humble contract into every company's secret weapon,\" said Allan Thygesen, CEO of Docusign. \"Our AI-native Intelligent Agreement Management platform doesn't just digitize agreements – it unlocks the insights trapped inside them, turning contracts into a strategic advantage. We're honored that Fast Company has recognized our work to redefine what agreements mean to business.\""
- **CTA Link:** "Learn More" → `/blog/fast-company-worlds-most-innovative-companies-2026`
  - Color: `rgb(76,0,255)`, borderRadius: `8px`, padding: `16px 24px`, display: `inline-flex`

---

### SECTION 4: AI Feature Introduction
- **Position:** y=1566px
- **Height:** 332px  
- **Background:** `rgb(255,255,255)`
- **Layout:** Centered text block

#### Content
- **H2:** "AI-powered agreement management"
  - Size: `48px`, Weight: `300`, Color: `rgb(19,0,50)`, Line-height: `51.84px`
- **Body:** "Analyze agreements with AI, sign documents electronically, and automate workflows with the Intelligent Agreement Management (IAM) platform."
- **CTA:** "Explore Docusign IAM" → `/intelligent-agreement-management`
  - Color: `rgb(76,0,255)`, inline-flex with arrow icon

---

### SECTION 5: Product Tab Selector + Feature Cards
- **Position:** y=1983px
- **Height:** 2142px
- **Background:** `rgb(255,255,255)`
- **Layout:** Tab navigation + 2-column feature cards (2 per row)

#### Tab Navigation
Buttons: `Featured`, `Sales`, `Customer Experience`, `Procurement`, `Human Resources`, `Legal`, `More (v)`

#### Feature Cards (6 cards, all "Featured" tab)
Card style: Background `rgb(237,229,255)` (light lavender), border-radius: `8px`
Inner content padding: `48px`

| # | Heading | Description | CTA Link |
|---|---|---|---|
| 1 | Search, manage, and analyze agreements with AI | Use AI to find agreements and terms quickly, receive agreement reminders, and access powerful insights from a central repository. | Explore Navigator → `/products/platform/navigator` |
| 2 | Send, sign, and track documents | Get signatures from anywhere, using almost any device. Finalize agreements faster with collaborative commenting, shared templates, and delivery in the apps your signers already use. | Explore eSignature → `/products/electronic-signature` |
| 3 | Automate agreement processes | Build customized workflows that automate and accelerate the various steps in your agreement processes—no coding required. | Explore Maestro → `/products/platform/maestro` |
| 4 | Build and scale with developer tools and APIs | Integrate, customize, and scale agreement processes—creating solutions tailored to your unique business needs. | Explore Developer Center → `https://developers.docusign.com/` |
| 5 | Bring people, agreements, and information together | Centralize agreements in a secure hub to simplify tasks and collaborate in real-time, eliminating the back-and-forth that frustrates your customers. | Explore Workspaces → `/products/workspaces` |
| 6 | Optimize your contract lifecycle | Accelerate cycle times, maximize agreement value, and eliminate unnecessary contractual risks. | Explore CLM → `/products/clm` |

Each card also has a product UI screenshot image.

---

### SECTION 6: IAM Video CTA ("Do Much More With IAM")
- **Position:** y=4125px
- **Height:** 1002px
- **Background:** `rgb(255,255,255)` (video player: `rgb(21,27,23)` dark)
- **Layout:** Text top, full-width video player below

#### Content
- **H2:** "Do (much) more with IAM"
  - Size: `36px`, Weight: `400`, Color: `rgb(19,0,50)`, Line-height: `43.2px`
- **Body:** "Save time and unlock value from your agreements. With our pre-configured IAM applications, you can automate workflows, manage and analyze documents with AI, and seamlessly connect agreement data across systems."
- **CTA buttons:**
  - "View Plans and Pricing" → `https://ecom.docusign.com/plans-and-pricing/iam`
  - "Explore All Products" → `/products` (with arrow icon)
- **Video player:** Embedded video (VideoJS), dark background `rgb(21,27,23)`, dimensions 1040×585px, with Play button overlay

---

### SECTION 7: Integrations / Build Workflows
- **Position:** ~y=5127px
- **Background:** `radial-gradient(100% 100% at 50% 0%, rgb(76, 0, 255) 0%, rgb(38, 6, 93) 100%)`
  - Bright purple at top → deep purple/indigo at bottom
- **Layout:** Text left, animated integration icons right

#### Content
- **H2:** "Build custom agreement workflows"
  - Size: `36px`, Weight: `400`, Color: `rgb(255,255,255)`
- **Body:** "Extend your workflows with a robust App Center, 1,000+ partner integrations, industry-leading APIs, and seamless connections to cloud storage."
- **CTA:** "Explore Integrations" → `/integrations`
- **Animation:** "Pause animation" button with icon
- Features partner logos/app icons floating in animated layout

---

### SECTION 8: Trust & Security Stats
- **Position:** y=6010px
- **Height:** 876px
- **Background:** `rgb(38, 6, 93)` (deep purple, solid)
- **Layout:** Header + 4-column stat cards

#### Content
- **H2:** "Trusted the world over"
  - Size: `36px`, Weight: `400`, Color: `rgb(255,255,255)`
- **Body:** "We take your agreements as seriously as you do, which is why Docusign meets the most stringent global security standards."
- **CTA:** "Explore Trust Center" → `/trust`

#### Stats (4 cards, bg: `rgb(255,255,255)`, border-radius: `8px`)
1. "1 billion people and 1.7 million customers use Docusign"
2. "95% of Fortune 500 companies use Docusign"
3. "44 languages available for signers, plus 14 for senders"
4. "The No. 1 most trustworthy software company in America, according to Newsweek"

---

### SECTION 9: Compliance & Certifications
- **Position:** Immediately below trust stats (y~6887px)
- **Height:** 349px
- **Background:** `rgb(38, 6, 93)` (continuous dark purple)
- **Label:** "Docusign global compliance & certifications"
- **Badges displayed:** ISO 27001, FedRAMP, APEC PPP, CSA STAR, PCI DSS, SSAE 18

---

### SECTION 10: Customer Testimonials
- **Position:** y=7236px
- **Height:** 442px (carousel)
- **Background:** `rgb(255,255,255)`
- **Layout:** Tab buttons (thumbnail images) + testimonial card carousel

#### Testimonial Tabs (4 stories)
1. Unilever uplevels its procurement processes with Docusign
2. Vestwell Turns Deals Into Revenue 93% Faster with Docusign and Salesforce
3. Primerica Partners with Docusign to Deliver High-Tech, High-Touch Financial Services
4. Flowserve Boosts Speed and Profit Margins with Docusign CLM and Salesforce

#### Testimonial Card 1 — Unilever
- **Video:** 02:19 runtime thumbnail
- **Stats:**
  - 50% — reduction in average contract completion time
  - 80% — Reduction in contract drafting times*
- **Quote:** "People would search their email inbox looking for the last email with a contract attachment, having to make sure it's the right one... We wanted tools and solutions that would harmonize, simplify and bring efficiencies."
- **Attribution:** Wei Ling Lim — General Counsel for Global Supply Chain, Unilever
- **CTA:** "Read the Full Story" → `https://www.docusign.com/customer-stories/unilever-uplevels-its-procurement-processes-with-docusign`
  - Color: `rgb(76,0,255)`, padding: `0px`, inline-flex with arrow

#### Testimonial Card 2 — Vestwell
- **Video:** 01:45 runtime thumbnail
- **Stats:**
  - 5 minutes — To create agreement packages (down from 75)
  - 70% — Fewer drop-offs
- **Quote:** "Before Docusign, getting an agreement out the door was like walking through a maze. Now, it's a clear path."
- **Attribution:** Jon Mark — COO, Vestwell
- **CTA:** "Read the Full Story" → `https://www.docusign.com/customer-stories/vestwell-ramps-up-automation-and-boosts-revenue-by-investing-in-docusign-clm`

#### Testimonial Card 3 — Primerica
- **Video:** 01:33 runtime thumbnail
- **Stats:**
  - 23% — Reduction in paper processing
  - <2 Hrs — Average agreement completion time using mobile sign
- **Quote:** "Given the growing number of sales representatives working with Primerica, our partnership with Docusign has been invaluable in supporting our objective to work with more clients than ever before."
- **Attribution:** Misty Sutton — Senior Vice President of Project Management & Automation, Primerica
- **CTA:** "Read the Full Story" → `https://www.docusign.com/customer-stories/primerica-partners-with-docusign-to-deliver-high-tech-high-touch-financial-services`

#### Testimonial Card 4 — Flowserve
- **Video:** 01:50 runtime thumbnail
- **Stats:**
  - 30% — Growth in profit margins
  - 40% — Faster legal reviews
- **Quote:** "What used to take days and lots of emails now happens in minutes. And CLM reminds people when their contracts are about to expire so we can proactively negotiate and maximize our margins."
- **Attribution:** Dundi Thompson — Project Manager in Legal Operations, Flowserve
- **CTA:** "Read the Full Story" → `https://www.docusign.com/customer-stories/flowserve-boosts-speed-and-profit-margins-with-docusign-clm-and-salesforce`

**Section CTA:** "Browse Customer Stories" → `/customer-stories`

---

### SECTION 11: Recommended for You (Carousel + Blog)
- **Position:** y=7678px
- **Background:** `linear-gradient(rgb(248,243,240) 0%, rgb(255,255,255) 100%)`
  - Warm cream at top → white at bottom

#### Carousel Cards (2-slide carousel)
**Slide 1:**
- Tag: "Momentum26"
- **H2:** "Bringing agreements to life, together"
- **Body:** "Join leaders across Sales, Legal, Procurement, and CX for sessions built for your role. May 20 & 21."
- **CTA:** "Save your seat" → `https://momentum.docusign.com/?ref=recom`
- Background: `rgb(38,6,93)` (deep purple), white text

**Slide 2:**
- Tag: "Docusign Community"
- **H2:** "The smartest way to navigate agreements"
- **Body:** "Ask questions. Swap ideas. Stay ahead. All inside the Community."
- **CTA:** "Dive In Now" → `https://community.docusign.com/`
- Background: Deep purple, white text

#### Blog Articles (3 articles grid)
| Title | URL | Date | Category |
|---|---|---|---|
| How We Built an Autonomous Coding Agent for Repetitive Engineering Tasks | `/blog/how-we-built-an-autonomous-coding-agent-for-repetitive-engineering-tasks` | Apr 29, 2026 | Blog |
| Capturing Value Through Simplicity at Perceptyx | `/blog/capturing-value-through-simplicity-at-perceptyx` | Apr 28, 2026 | Blog |
| Cheers to Docusign's 2026 Customer Award Winners | `/blog/docusign-customer-awards-2026` | Apr 27, 2026 | Blog |

Article card style: H2 size `18px`, weight `500`, color `rgb(19,0,50)`

---

### SECTION 12: Bottom CTA Section
- **Background:** `linear-gradient(0deg, rgb(248,243,240) 50%, rgb(255,255,255) 50%)`
  - Half white (top), half warm cream (bottom) — creates visual split behind CTA card
- **Layout:** Dark card centered (`rgb(38,6,93)` background, white text, image on right)
- **H2:** "Docusign IAM is the agreement platform your business needs"
  - Size: `36px`, Weight: `400`, Color: `rgb(255,255,255)`
- **CTA buttons:**
  - "Start for Free" → `https://trial.docusign.com`
  - "Explore Docusign IAM" → `/intelligent-agreement-management`
- **Images:** Decorative image + photo of man in mustard-colored shirt (human element)
  - Alt: "A man in a mustard-colored shirt sits indoors, engaged in a discussion about Docusign. Green plants are visible in the background."

---

## 6. FOOTER (contentinfo)

### Footer Top Section — Links Grid (5-column layout)
**Column 1 — Applications**
- Intelligent Agreement Management → `/intelligent-agreement-management`
- IAM Core → `/solutions/iam-core`
- IAM for Customer Experience → `/solutions/departments/customer-experience`
- IAM for Sales → `/solutions/departments/sales`
- All IAM Applications → `/solutions`

**Also Column 1 — Products**
- eSignature → `/products/electronic-signature`
- Contract Lifecycle Management → `/products/clm`
- Identify → `/products/identify`
- Agreement Preparation → `/products/agreement-preparation`
- Web Forms → `/products/web-forms`
- All Products → `/products`

**Column 2 — Pricing**
- IAM Plans → `https://ecom.docusign.com/plans-and-pricing/iam`
- eSignature Plans → `https://ecom.docusign.com/plans-and-pricing/esignature?ipbr=1`
- Real Estate Plans → `https://ecom.docusign.com/plans-and-pricing/real-estate`
- API Plans → `https://ecom.docusign.com/plans-and-pricing/developer`
- Special Offers & Promos → `/products/special-offers`

**Also Column 2 — Industries**
- Financial Services, Insurance, Real Estate, Government, All Industries

**Also Column 2 — Business Size**
- Enterprise, Small & Medium-Sized Business, Individuals

**Column 3 — Support**
- Support Center → `https://support.docusign.com/s/?language=en_US`
- Customer Success → `/customer-success`
- Community → `https://community.docusign.com/`
- Trust Portal → `/trust/trust-portal`

**Also Column 3 — Developers**
- Developer Center → `https://developers.docusign.com/`
- Free Developer Account → `/developers/sandbox`
- API Overview → `/products/apis`

**Also Column 3 — Partners**
- Partner Portal → `https://partners.docusign.com/s/login/`
- Partner Login → `https://partners.docusign.com/s/login/`
- ISV Embedded eSignature → `/partners/isv-embed`

**Column 4 — Resources**
- Resource Center, eSign Resources, Templates, Blog, Customer Stories, Events, Webinars, Docusign University, Legality Guide, Trust Center & System Status, Safety Center, Online Signature Generator

**Column 5 — Company**
- About Us, Product Releases, Docusign Momentum, Careers, Leadership, News Center, Investor Relations, Contact Us, Accessibility

### Footer Bottom Row
- **Locale selector:** "United States" dropdown (15+ locales: Canada-EN, Canada-FR, France, Australia, Japan, Brasil, Nederland, Deutschland, UK, España, India, Italia, México, Asia-English, + more)
- **Social media links:** Facebook, X (Twitter), YouTube, LinkedIn
- **App download links:** Google Play Store, Apple App Store

### Footer Legal Bar (bottom strip)
- Terms of Use
- Privacy Notice
- Notice to California Residents
- Cookie Settings (button)
- Intellectual Property
- Modern Slavery Act Statement
- Copyright: "© Docusign, Inc. 2026"

---

## 7. BUTTON STYLES (Complete Reference)

### Primary Button (Filled Purple)
```css
background-color: rgb(76, 0, 255);
color: rgb(255, 255, 255);
border-radius: 8px;
padding: 16px 24px;
font-family: DSIndigo, Helvetica, Arial, sans-serif;
display: inline-flex;
align-items: center;
```
Example: "Buy Now", "View Plans and Pricing" (on dark bg = white fill)

### Primary Button (White Fill — on dark/purple bg)
```css
background-color: rgb(255, 255, 255);
color: rgb(76, 0, 255);
border-radius: 8px;
padding: 16px 24px;
```
Example: "View Plans and Pricing" on hero

### Secondary Button (Ghost/Outline)
```css
background-color: transparent;
color: rgb(255, 255, 255); /* or rgb(76, 0, 255) on white bg */
border-radius: 8px;
padding: 16px 24px;
```
Example: "Explore All Products" on hero

### Tertiary/Text Link with Arrow
```css
background-color: transparent;
color: rgb(76, 0, 255);
border-radius: 4px;
padding: 0px;
display: inline-flex;
```
Example: Feature card CTAs like "Explore Navigator"

### Nav CTA — Contact Sales
```css
background-color: transparent;
color: rgb(76, 0, 255);
border-radius: 8px;
padding: 12px 16px;
```

### Nav CTA — Buy Now
```css
background-color: rgb(76, 0, 255);
color: rgb(255, 255, 255);
border-radius: 8px;
padding: 12px 16px;
```

---

## 8. RESPONSIVE BEHAVIOR NOTES

### Desktop (1200px viewport observed)
- Full horizontal nav with all links visible
- 2-column hero layout (text + image)
- 2-column feature card grid
- 4-column trust stats
- 5-column footer
- Logo bar as horizontal marquee

### Mobile (375px — inferred from snapshot)
- Hamburger menu replaces full nav (`Open Menu` button with hamburger icon)
- Navigation collapses to slide-in drawer
- Single column layouts throughout
- Feature tabs scroll horizontally

### Breakpoints observed from CSS rules
- `48rem` (768px) — mobile padding adjusts
- `64rem` (1024px) — desktop padding, vertical padding zeroed for hero

---

## 9. MODAL / POPUP

### Momentum26 Popup (shown on page load)
- **Trigger:** Automatic on page load (dialog element)
- **Background:** Dark (deep purple)
- **H2:** "Join Michael Lewis at Momentum26"
  - Size: `24px`, Weight: `500`, Color: `rgb(255,255,255)`, Line-height: `36px`
- **Body:** "The No. 1 New York Times bestselling author will be joining us in NYC on May 21. Don't miss out!"
- **CTA:** "Register for free" → `https://momentum.docusign.com/?ref=popup`
  - Background: `rgb(76,0,255)`, White text, border-radius: `8px`
- **Image:** Headshot of Michael Lewis (on right half of modal)
- **Close button:** "Dismiss dialog" (X button, top right)

---

## 10. MISCELLANEOUS ELEMENTS

### Docusign AI Assistant Widget
- **Type:** Floating button (bottom right of page)
- **Text:** "Docusign Assistant"
- **Background:** `rgb(76,0,255)` (purple)
- **Contains:** Logo/bot icon + text label

### "New" Tag/Badge (Announcement bar)
- Text: "New" (styled as a badge)
- Appears before announcement text

### Product Tab Filter (Feature section)
- Tab buttons: Featured, Sales, Customer Experience, Procurement, Human Resources, Legal, More
- Active tab appears with underline or filled state

### Video Player (VideoJS)
- Background: `rgb(21,27,23)` (very dark green-black)
- Contains play button overlay, HD quality indicator
- Embedded via VideoJS library

---

## 11. IMAGES AND ASSETS

### Hero Product UI Image
- **URL:** `https://cdn.bfldr.com/HIN7H4LI/at/j83rpzt5q598cqh6xbsrwp/ui-docusign-product-features-en-US.png?auto=webp&format=avif&quality=90&width=500&max_age=2592000`
- **CDN:** bfldr.com (Brandfolder CDN)
- **Format:** AVIF/WebP with fallback PNG

### Customer Logos (Social Proof Bar)
- United, Santander, Unilever, Canva, Apple, Primerica, Ducati, ThermoFisher Scientific, Calendly, Forest Stewardship Council, Kroger, Domino's Pizza

### Mobile App Badges
- Google Play Store badge
- Apple App Store badge

---

## 12. SECTION BACKGROUND SUMMARY (Quick Reference for Implementation)

| Section | Heading | Background |
|---|---|---|
| Announcement Bar | Deloitte Report CTA | `rgb(38,6,93)` solid dark purple |
| Navigation | — | `rgb(255,255,255)` white |
| Hero | "Find the right plan..." | `radial-gradient(100% 100% at 50% -20%, rgb(255,82,82) 0%, rgb(76,0,255) 100%)` |
| Logo Bar | — | `rgb(255,255,255)` white |
| Award Section | "Most Innovative Companies 2026" | `rgb(255,255,255)` white |
| AI Introduction | "AI-powered agreement management" | `rgb(255,255,255)` white |
| Feature Cards | "Search, manage..." etc. | `rgb(255,255,255)` white; Cards: `rgb(237,229,255)` lavender |
| IAM Video CTA | "Do (much) more with IAM" | `rgb(255,255,255)` white |
| Integrations | "Build custom agreement workflows" | `radial-gradient(100% 100% at 50% 0%, rgb(76,0,255) 0%, rgb(38,6,93) 100%)` |
| Trust Stats | "Trusted the world over" | `rgb(38,6,93)` deep purple |
| Compliance Badges | "Docusign global compliance..." | `rgb(38,6,93)` deep purple (continuous) |
| Testimonials | "Companies do better with Docusign" | `rgb(255,255,255)` white |
| Recommended / Blog | "Recommended for you" | `linear-gradient(rgb(248,243,240) 0%, rgb(255,255,255) 100%)` |
| Bottom CTA | "Docusign IAM is the agreement platform..." | `linear-gradient(0deg, rgb(248,243,240) 50%, rgb(255,255,255) 50%)` |
| Footer | — | White background with `rgb(19,0,50)` text |

---

## 13. SCREENSHOTS TAKEN
- `docusign-full-page-desktop.png` — Full-page screenshot at ~1200px viewport
- `docusign-hero-section.png` — Hero section close-up showing gradient background and modal
