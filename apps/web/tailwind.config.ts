import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ds: {
          purple: {
            DEFAULT: "#4C00FF",
            dark: "#1B0A3C",
            light: "#6B2CF5",
            50: "#F0EBFF",
            100: "#D9CCFF",
            200: "#B399FF",
            500: "#4C00FF",
            600: "#3D00CC",
            700: "#2D0099",
          },
          gray: {
            bg: "#F8F8F8",
            border: "#E0E0E0",
            light: "#F5F5F5",
            medium: "#9E9E9E",
            dark: "#6B6B6B",
          },
          text: {
            primary: "#1B0A3C",
            secondary: "#6B6B6B",
          },
          success: "#00B851",
          error: "#D93025",
          warning: "#FF6D00",
          info: "#0288D1",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
      spacing: {
        "sidebar": "260px",
        "navbar": "56px",
      },
      boxShadow: {
        ds: "0 2px 8px rgba(0,0,0,0.08)",
        "ds-md": "0 4px 16px rgba(0,0,0,0.12)",
        "ds-lg": "0 8px 32px rgba(0,0,0,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
