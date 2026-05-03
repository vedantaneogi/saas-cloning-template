import type { ChartElement } from "../model/types";
import { DEFAULT_CHART_PALETTE } from "../model/chartDefaults";

const PX_PER_INCH = 96;
const pxToIn = (px: number): number => px / PX_PER_INCH;

const stripHash = (c: string): string => (c.startsWith("#") ? c.slice(1) : c);

type PptxChartSlide = {
  addChart: (chartType: string, data: unknown, options: unknown) => unknown;
};

/**
 * Render a ChartElement as a native editable PPTX chart via `slide.addChart`.
 * Never flattens to an image — the output is a round-trippable chart object
 * with an embedded data table.
 */
export function renderChartElement(
  slide: PptxChartSlide,
  el: ChartElement,
): void {
  const style = el.style;
  const colors = (style.colors && style.colors.length > 0
    ? style.colors
    : DEFAULT_CHART_PALETTE
  ).map(stripHash);

  const isPie = el.chartKind === "pie";
  const isHorizontal = style.orientation === "horizontal";

  const chartType = isPie ? "pie" : "bar";

  const data = [
    {
      name: style.title && style.title.length > 0 ? style.title : "Series 1",
      labels: el.data.map((p) => p.label),
      values: el.data.map((p) =>
        Number.isFinite(p.value) ? p.value : 0,
      ),
    },
  ];

  const options: Record<string, unknown> = {
    x: pxToIn(el.x),
    y: pxToIn(el.y),
    w: pxToIn(el.w),
    h: pxToIn(el.h),
    showLegend: style.showLegend ?? true,
    legendPos: "b",
    chartColors: colors,
  };

  if (style.title && style.title.length > 0) {
    options.showTitle = true;
    options.title = style.title;
  }

  if (isPie) {
    options.showPercent = style.showValues ?? false;
  } else {
    options.barDir = isHorizontal ? "bar" : "col";
    options.showValue = style.showValues ?? false;
    options.catAxisLabelFontSize = 10;
    options.valAxisLabelFontSize = 10;
  }

  slide.addChart(chartType, data, options);
}
