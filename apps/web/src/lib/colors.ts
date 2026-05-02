/**
 * DocuSign Design System Color Tokens
 *
 * Extracted from live DocuSign application screenshots and HTML source.
 * Font: DSIndigo (DocuSign's proprietary typeface)
 * Primary brand font stack: 'DSIndigo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
 */

export const colors = {
  // ── Brand / Logo ─────────────────────────────────────────────────────────
  /** DocuSign logo icon: red/coral square (top-left of "d" mark) */
  logoRed: '#E8342A',
  /** DocuSign logo icon: indigo/purple square (bottom-right of "d" mark) */
  logoIndigo: '#3B1FA3',

  // ── Primary Purple / Indigo ───────────────────────────────────────────────
  /** Primary action color — buttons, active nav underline, links */
  purplePrimary: '#4C00FF',
  /** Dark navy — hero background ("Welcome" banner), primary CTA button */
  purpleDark: '#1B0A3C',
  /** Deep indigo — "Buy Now" pill, sidebar active, "Start Now" button */
  indigoDark: '#2D0F6B',
  /** Medium purple — progress bar fill, toggle active state */
  purpleMedium: '#6B2CF5',
  /** Light purple — hover backgrounds, selected row tint */
  purpleLight: '#EDE8FF',

  // ── Neutral / Gray ────────────────────────────────────────────────────────
  /** Page backgrounds, sidebar background */
  grayBg: '#F4F4F4',
  /** Card/panel backgrounds */
  grayCard: '#FFFFFF',
  /** Table row dividers, card borders, input borders */
  grayBorder: '#E0E0E0',
  /** Input focused border (matches purplePrimary) */
  inputFocusBorder: '#4C00FF',
  /** Secondary text — labels, meta, timestamps */
  textSecondary: '#6B6B6B',
  /** Primary text — headings, body, nav links */
  textPrimary: '#130F2E',
  /** Muted text — placeholder text, disabled states */
  textMuted: '#9EA5AD',
  /** Scrollbar thumb */
  scrollbarThumb: '#C5CCD6',

  // ── Status Colors ─────────────────────────────────────────────────────────
  /** Completed status — green checkmark circle */
  successGreen: '#00B851',
  /** Light success background */
  successLight: '#E6F9EE',
  /** Error / required asterisk */
  errorRed: '#D93025',
  /** Light error background */
  errorLight: '#FDECEA',
  /** Warning / expiring soon */
  warningOrange: '#FF6D00',
  /** Light warning background */
  warningLight: '#FFF3E0',
  /** Informational — links, notification dot (red pill) */
  infoPurple: '#4C00FF',
  /** Notification dot on help icon (coral red) */
  notificationDot: '#E8342A',

  // ── Action Button Colors ──────────────────────────────────────────────────
  /** Primary CTA button bg (dark navy/indigo) */
  btnPrimaryBg: '#1B0A3C',
  /** Primary CTA button hover */
  btnPrimaryHover: '#2D0F6B',
  /** Secondary/outline button border */
  btnSecondaryBorder: '#C5CCD6',
  /** Secondary/outline button text */
  btnSecondaryText: '#130F2E',
  /** Secondary/outline button hover bg */
  btnSecondaryHover: '#F4F4F4',
  /** "Sign Up for Free" button bg (light gray) */
  btnGrayBg: '#EBEBEB',

  // ── Navigation ───────────────────────────────────────────────────────────
  /** Nav bar background */
  navBg: '#FFFFFF',
  /** Nav link active underline */
  navActiveUnderline: '#4C00FF',
  /** Nav link text */
  navText: '#130F2E',
  /** Nav link active text (bold) */
  navTextActive: '#130F2E',
  /** Hero banner gradient start */
  heroBannerStart: '#1B0A3C',
  /** Hero banner gradient end */
  heroBannerEnd: '#4C00FF',

  // ── Recipient Role Colors ─────────────────────────────────────────────────
  /** Recipient 1 color */
  recipient1: '#4C00FF',
  /** Recipient 2 color */
  recipient2: '#00B851',
  /** Recipient 3 color */
  recipient3: '#FF6D00',
  /** Recipient 4 color */
  recipient4: '#D93025',
  /** Recipient 5 color */
  recipient5: '#0288D1',
} as const;

export type ColorKey = keyof typeof colors;

/**
 * DocuSign CSS Custom Properties mapping.
 * These match the variables defined in globals.css.
 */
export const cssVars = {
  purplePrimary: 'var(--ds-purple-primary)',
  purpleDark: 'var(--ds-purple-dark)',
  purpleGradient: 'var(--ds-purple-gradient)',
  white: 'var(--ds-white)',
  grayBg: 'var(--ds-gray-bg)',
  grayBorder: 'var(--ds-gray-border)',
  textPrimary: 'var(--ds-text-primary)',
  textSecondary: 'var(--ds-text-secondary)',
  success: 'var(--ds-success)',
  error: 'var(--ds-error)',
  warning: 'var(--ds-warning)',
  info: 'var(--ds-info)',
} as const;

/**
 * DocuSign Font Stack
 *
 * Primary typeface is "DSIndigo" — DocuSign's proprietary font family.
 * Weights available: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold).
 * Font files hosted at: https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-*.woff2
 *
 * Fallback stack for system rendering without the custom font.
 */
export const fontStack = {
  primary: "'DSIndigo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
};

/**
 * DocuSign Spacing / Layout tokens
 */
export const layout = {
  navHeight: '56px',
  sidebarWidth: '260px',
  sidebarCollapsedWidth: '60px',
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    pill: '9999px',
  },
};
