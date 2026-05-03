"use client";

import { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useEditorActions, useEditorState } from "../state/EditorContext";
import type {
  ChartDataPoint,
  ChartElement,
  ElementId,
  SlideId,
} from "../model/types";
import { ChartElementView } from "./ChartElementView";

type Props = {
  open: boolean;
  onClose: () => void;
  slideId: SlideId;
  chartId: ElementId;
};

function findChart(
  deck: ReturnType<typeof useEditorState>["deck"],
  slideId: SlideId,
  chartId: ElementId,
): ChartElement | null {
  const slide = deck.slides.find((s) => s.id === slideId);
  const el = slide?.elements.find((e) => e.id === chartId);
  return el && el.type === "chart" ? el : null;
}

export function ChartDataDialog({ open, onClose, slideId, chartId }: Props) {
  const { deck } = useEditorState();
  const chart = useMemo(
    () => (open ? findChart(deck, slideId, chartId) : null),
    [open, deck, slideId, chartId],
  );
  const { updateChartPoint, addChartPoint, removeChartPoint } =
    useEditorActions();

  if (!chart) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit chart data</DialogTitle>
        <DialogContent>Chart not found.</DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const handleLabel = (pointId: string, label: string) => {
    updateChartPoint(slideId, chartId, pointId, { label });
  };
  const handleValue = (pointId: string, raw: string) => {
    const parsed = Number.parseFloat(raw);
    updateChartPoint(slideId, chartId, pointId, {
      value: Number.isFinite(parsed) ? parsed : 0,
    });
  };
  const handleAdd = () => addChartPoint(slideId, chartId);
  const handleRemove = (pointId: string) =>
    removeChartPoint(slideId, chartId, pointId);

  const handleValueKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    if (e.key === "Enter" && idx === chart.data.length - 1) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit chart data</DialogTitle>
      <DialogContent dividers>
        <div
          style={{
            width: "100%",
            height: 200,
            marginBottom: 16,
            background: "#fafafa",
            borderRadius: 8,
            padding: 8,
            boxSizing: "border-box",
          }}
        >
          <ChartElementView element={chart} interactive={false} />
        </div>

        <ChartDataGrid
          data={chart.data}
          onLabelChange={handleLabel}
          onValueChange={handleValue}
          onRemove={handleRemove}
          onValueKeyDown={handleValueKeyDown}
        />

        <Button
          onClick={handleAdd}
          startIcon={<AddRoundedIcon />}
          size="small"
          sx={{ mt: 1 }}
        >
          Add row
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ChartDataGrid({
  data,
  onLabelChange,
  onValueChange,
  onRemove,
  onValueKeyDown,
}: {
  data: ChartDataPoint[];
  onLabelChange: (pointId: string, label: string) => void;
  onValueChange: (pointId: string, raw: string) => void;
  onRemove: (pointId: string) => void;
  onValueKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => void;
}) {
  const canRemove = data.length > 1;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "#5f6368", fontWeight: 600 }}>
        Label
      </div>
      <div style={{ fontSize: 12, color: "#5f6368", fontWeight: 600 }}>
        Value
      </div>
      <div />
      {data.map((p, idx) => (
        <ChartDataRow
          key={p.id}
          point={p}
          idx={idx}
          canRemove={canRemove}
          onLabelChange={onLabelChange}
          onValueChange={onValueChange}
          onRemove={onRemove}
          onValueKeyDown={onValueKeyDown}
        />
      ))}
    </div>
  );
}

function ChartDataRow({
  point,
  idx,
  canRemove,
  onLabelChange,
  onValueChange,
  onRemove,
  onValueKeyDown,
}: {
  point: ChartDataPoint;
  idx: number;
  canRemove: boolean;
  onLabelChange: (pointId: string, label: string) => void;
  onValueChange: (pointId: string, raw: string) => void;
  onRemove: (pointId: string) => void;
  onValueKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => void;
}) {
  return (
    <>
      <TextField
        size="small"
        variant="outlined"
        value={point.label}
        placeholder="Label"
        onChange={(e) => onLabelChange(point.id, e.target.value)}
        fullWidth
      />
      <TextField
        size="small"
        variant="outlined"
        type="number"
        value={Number.isFinite(point.value) ? point.value : 0}
        onChange={(e) => onValueChange(point.id, e.target.value)}
        onKeyDown={(e) =>
          onValueKeyDown(e as React.KeyboardEvent<HTMLInputElement>, idx)
        }
        slotProps={{ htmlInput: { step: "any" } }}
        fullWidth
      />
      <Tooltip title={canRemove ? "Remove row" : "At least one row required"}>
        <span>
          <IconButton
            size="small"
            onClick={() => onRemove(point.id)}
            disabled={!canRemove}
            aria-label="Remove row"
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
