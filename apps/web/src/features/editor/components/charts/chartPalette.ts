import { DEFAULT_CHART_PALETTE } from "../../model/chartDefaults";
import type { ChartStyle } from "../../model/types";

export { DEFAULT_CHART_PALETTE };

export const PRESET_PALETTES: Record<string, string[]> = {
  Default: DEFAULT_CHART_PALETTE,
  Warm: ["#ef5350", "#ff7043", "#ffa726", "#ffca28", "#ffee58", "#d4e157"],
  Cool: ["#42a5f5", "#26c6da", "#26a69a", "#66bb6a", "#9ccc65", "#5c6bc0"],
  Mono: ["#263238", "#455a64", "#607d8b", "#90a4ae", "#b0bec5", "#cfd8dc"],
};

export function paletteColor(index: number, style: ChartStyle): string {
  const palette =
    style.colors && style.colors.length > 0
      ? style.colors
      : DEFAULT_CHART_PALETTE;
  return palette[index % palette.length];
}
