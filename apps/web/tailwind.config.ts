import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        sidebar: "var(--bg-sidebar)",
        elevated: "var(--bg-elevated)",
        "elevated-hover": "var(--bg-elevated-hover)",
        "surface-3": "var(--bg-surface-3)",
        "surface-4": "var(--bg-surface-4)",
        "row-hover": "var(--bg-row-hover)",
        "row-selected": "var(--bg-row-selected)",
        input: "var(--bg-input)",
        pill: "var(--bg-pill)",
        tag: "var(--bg-tag)",
        border: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          tertiary: "var(--border-tertiary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          quaternary: "var(--text-quaternary)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          focus: "var(--accent-focus)",
          soft: "var(--accent-soft)",
        },
        brand: {
          secure: "var(--brand-secure)",
        },
        semantic: {
          success: "var(--semantic-success)",
        },
        status: {
          backlog: "var(--status-backlog)",
          todo: "var(--status-todo)",
          "in-progress": "var(--status-in-progress)",
          "in-review": "var(--status-in-review)",
          done: "var(--status-done)",
          canceled: "var(--status-canceled)",
        },
        priority: {
          urgent: "var(--priority-urgent)",
          high: "var(--priority-high)",
          medium: "var(--priority-medium)",
          low: "var(--priority-low)",
          none: "var(--priority-none)",
        },
      },
      fontFamily: {
        sans: "var(--font-default)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        micro: "var(--fs-micro)",
        mini: "var(--fs-mini)",
        small: "var(--fs-small)",
        default: "var(--fs-default)",
        large: "var(--fs-large)",
        title3: "var(--fs-title3)",
        title2: "var(--fs-title2)",
        title1: "var(--fs-title1)",
      },
      fontWeight: {
        normal: "var(--fw-regular)",
        medium: "var(--fw-medium)",
        semibold: "var(--fw-semibold)",
        bold: "var(--fw-bold)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        xxl: "var(--radius-xxl)",
        pill: "var(--radius-pill)",
      },
      spacing: {
        sidebar: "var(--sidebar-width)",
      },
      transitionTimingFunction: {
        quick: "var(--ease-quick)",
        snap: "var(--ease-snap)",
      },
      transitionDuration: {
        fast: "100ms",
        DEFAULT: "150ms",
        slow: "300ms",
      },
      boxShadow: {
        popover: "var(--shadow-popover)",
        button: "var(--shadow-button)",
      },
    },
  },
  plugins: [],
};
export default config;
