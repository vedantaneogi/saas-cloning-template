"use client";

import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartDataPoint, ChartStyle } from "../../model/types";
import { paletteColor } from "./chartPalette";

type Props = {
  data: ChartDataPoint[];
  style: ChartStyle;
  interactive?: boolean;
};

export function PieChartView({ data, style, interactive = true }: Props) {
  const rows = useMemo(
    () =>
      data.map((p) => ({
        name: p.label || "—",
        value: Number.isFinite(p.value) ? p.value : 0,
        id: p.id,
      })),
    [data],
  );
  const total = useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, r.value), 0),
    [rows],
  );
  const showLegend = style.showLegend ?? true;
  const showValues = style.showValues ?? false;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        {style.title ? (
          <text
            x="50%"
            y="14"
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            fill="#202124"
          >
            {style.title}
          </text>
        ) : null}
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="75%"
          label={
            showValues
              ? ({ value }: { value?: number }) => {
                  const v = typeof value === "number" ? value : 0;
                  if (total <= 0) return "";
                  return `${Math.round((v / total) * 100)}%`;
                }
              : false
          }
          isAnimationActive={false}
        >
          {rows.map((row, i) => (
            <Cell key={row.id} fill={paletteColor(i, style)} />
          ))}
        </Pie>
        {interactive ? <Tooltip /> : null}
        {showLegend ? (
          <Legend
            verticalAlign="bottom"
            height={24}
            wrapperStyle={{ fontSize: 11 }}
          />
        ) : null}
      </PieChart>
    </ResponsiveContainer>
  );
}
