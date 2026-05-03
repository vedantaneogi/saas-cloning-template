/**
 * Theme presets + token resolution.
 *
 * Colors on elements (text.color, shape fill/stroke) and slide backgrounds
 * can be stored either as literal hex strings ("#1a73e8") or as theme tokens
 * ("theme.accent"). Tokens are resolved at render time by `resolveColor`,
 * so swapping `deck.meta.themeId` cascades through the whole deck without
 * a mutation step — and explicit hex overrides are left alone automatically.
 */

import type { SlideBackground } from "../model/types";

export type ThemeColors = {
  background: string;
  surface: string;
  title: string;
  body: string;
  muted: string;
  accent: string;
  accentSoft: string;
};

export type ThemeFonts = {
  heading: string;
  body: string;
};

export type Theme = {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
};

export const THEMES: Theme[] = [
  {
    id: "default",
    name: "Simple Light",
    colors: {
      background: "#ffffff",
      surface: "#f8f9fa",
      title: "#202124",
      body: "#3c4043",
      muted: "#5f6368",
      accent: "#1a73e8",
      accentSoft: "#d3e3fd",
    },
    fonts: {
      heading: "Google Sans, Manrope, sans-serif",
      body: "Manrope, Google Sans, sans-serif",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      background: "#1f1f2e",
      surface: "#2a2a3d",
      title: "#f5f6fa",
      body: "#d0d3e0",
      muted: "#9aa0b5",
      accent: "#8ab4f8",
      accentSoft: "#3a4358",
    },
    fonts: {
      heading: "Google Sans, Manrope, sans-serif",
      body: "Manrope, Google Sans, sans-serif",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      background: "#e8f4f8",
      surface: "#ffffff",
      title: "#0d3b55",
      body: "#1c5a7e",
      muted: "#5e8aa3",
      accent: "#0b84a5",
      accentSoft: "#b8e0ec",
    },
    fonts: {
      heading: "Google Sans, Manrope, sans-serif",
      body: "Manrope, Google Sans, sans-serif",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      background: "#fff4ea",
      surface: "#ffffff",
      title: "#5c2b1a",
      body: "#7a3f23",
      muted: "#a57253",
      accent: "#e76f51",
      accentSoft: "#fbd8c7",
    },
    fonts: {
      heading: "Google Sans, Manrope, sans-serif",
      body: "Manrope, Google Sans, sans-serif",
    },
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string | undefined | null): Theme {
  if (!id) return THEMES[0];
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Resolves a color value that is either a literal hex (passed through) or a
 * theme token of the form "theme.<key>". Unknown tokens fall back to the
 * theme's body color so the slide never renders a broken swatch.
 */
export function resolveColor(
  value: string | undefined,
  theme: Theme,
  fallback?: string,
): string | undefined {
  if (value === undefined) return fallback;
  if (!value.startsWith("theme.")) return value;
  const key = value.slice("theme.".length) as keyof ThemeColors;
  return theme.colors[key] ?? fallback ?? theme.colors.body;
}

/**
 * Resolves a font-family value that is either a literal stack (passed through)
 * or a token of the form "theme.heading" / "theme.body".
 */
export function resolveFontFamily(
  value: string | undefined,
  theme: Theme,
): string | undefined {
  if (!value) return undefined;
  if (value === "theme.heading") return theme.fonts.heading;
  if (value === "theme.body") return theme.fonts.body;
  return value;
}

export function resolveBackground(
  bg: SlideBackground,
  theme: Theme,
): { css: string } {
  if (bg.kind === "solid") {
    return { css: resolveColor(bg.color, theme) ?? theme.colors.background };
  }
  if (bg.kind === "theme") {
    return { css: theme.colors.background };
  }
  return { css: `center / cover no-repeat url("${bg.src}")` };
}

export function isThemeToken(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith("theme.");
}
