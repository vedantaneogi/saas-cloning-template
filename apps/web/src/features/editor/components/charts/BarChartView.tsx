"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint, ChartStyle } from "../../model/types";
import { paletteColor } from "./chartPalette";

type Props = {
  data: ChartDataPoint[];
  style: ChartStyle;
  interactive?: boolean;
};

export function BarChartView({ data, style, interactive = true }: Props) {
  const rows = useMemo(
    () =>
      data.map((p) => ({
        name: p.label || "—",
        value: Number.isFinite(p.value) ? p.value : 0,
        id: p.id,
      })),
    [data],
  );
  const horizontal = style.orientation === "horizontal";
  const showLegend = style.showLegend ?? true;
  const showValues = style.showValues ?? false;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: style.title ? 24 : 8, right: 12, left: 4, bottom: 8 }}
      >
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        {interactive ? <Tooltip /> : null}
        {showLegend ? (
          <Legend
            verticalAlign="bottom"
            height={24}
            wrapperStyle={{ fontSize: 11 }}
          />
        ) : null}
        <Bar dataKey="value" isAnimationActive={false}>
          {rows.map((row, i) => (
            <Cell key={row.id} fill={paletteColor(i, style)} />
          ))}
          {showValues ? (
            <LabelList
              dataKey="value"
              position={horizontal ? "right" : "top"}
              style={{ fontSize: 11, fill: "#3c4043" }}
            />
          ) : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
