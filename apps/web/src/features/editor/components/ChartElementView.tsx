"use client";

import type { ChartElement } from "../model/types";
import { BarChartView } from "./charts/BarChartView";
import { PieChartView } from "./charts/PieChartView";

type Props = {
  element: ChartElement;
  interactive?: boolean;
};

export function ChartElementView({ element, interactive = true }: Props) {
  const commonStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    userSelect: "none",
    pointerEvents: interactive ? "auto" : "none",
  };
  return (
    <div style={commonStyle} data-chart-kind={element.chartKind}>
      {element.chartKind === "pie" ? (
        <PieChartView
          data={element.data}
          style={element.style}
          interactive={interactive}
        />
      ) : (
        <BarChartView
          data={element.data}
          style={element.style}
          interactive={interactive}
        />
      )}
    </div>
  );
}
