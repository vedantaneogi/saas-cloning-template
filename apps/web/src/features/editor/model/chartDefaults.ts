import type {
  ChartDataPoint,
  ChartElement,
  ChartKind,
  ChartStyle,
} from "./types";

export const DEFAULT_CHART_PALETTE: string[] = [
  "#4285f4",
  "#ea4335",
  "#fbbc04",
  "#34a853",
  "#9c27b0",
  "#00bcd4",
  "#ff7043",
  "#5e35b1",
];

export const DEFAULT_CHART_STYLE: Required<
  Pick<ChartStyle, "showLegend" | "showValues" | "orientation">
> & {
  colors: string[];
} = {
  colors: DEFAULT_CHART_PALETTE,
  showLegend: true,
  showValues: false,
  orientation: "vertical",
};

export function newChartPointId(): string {
  return `cp-${crypto.randomUUID().slice(0, 8)}`;
}

const DEFAULT_LABELS = ["Category A", "Category B", "Category C", "Category D"];
const DEFAULT_VALUES = [25, 30, 20, 25];

export function buildDefaultChartData(): ChartDataPoint[] {
  return DEFAULT_LABELS.map((label, i) => ({
    id: newChartPointId(),
    label,
    value: DEFAULT_VALUES[i],
  }));
}

export function buildDefaultChartElement(params: {
  id: string;
  kind: ChartKind;
  slideWidth: number;
  slideHeight: number;
  z: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}): ChartElement {
  const w = params.w ?? params.slideWidth * 0.5;
  const h = params.h ?? params.slideHeight * 0.5;
  const x = params.x ?? (params.slideWidth - w) / 2;
  const y = params.y ?? (params.slideHeight - h) / 2;
  return {
    id: params.id,
    type: "chart",
    x,
    y,
    w,
    h,
    z: params.z,
    chartKind: params.kind,
    data: buildDefaultChartData(),
    style: {
      colors: [...DEFAULT_CHART_PALETTE],
      showLegend: true,
      showValues: false,
      orientation: "vertical",
    },
  };
}
