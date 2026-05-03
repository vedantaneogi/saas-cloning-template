"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import AspectRatioOutlinedIcon from "@mui/icons-material/AspectRatioOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import {
  PX_PER_INCH,
  pxToUnit,
  unitToPx,
  type LengthUnit,
} from "../utils/units";

type Props = {
  initialWidth: number;
  initialHeight: number;
  onApply: (widthPx: number, heightPx: number) => void;
  onClose: () => void;
};

type Preset = "standard" | "custom";

const STANDARD_PRESET_PX = {
  width: 10 * PX_PER_INCH,
  height: 7.5 * PX_PER_INCH,
};

const MIN_PX = 1 * PX_PER_INCH;
const MAX_PX = 50 * PX_PER_INCH;

const round2 = (n: number) => Math.round(n * 100) / 100;

const detectPreset = (widthPx: number, heightPx: number): Preset =>
  Math.abs(widthPx - STANDARD_PRESET_PX.width) < 0.5 &&
  Math.abs(heightPx - STANDARD_PRESET_PX.height) < 0.5
    ? "standard"
    : "custom";

export function PageSetupDialog({
  initialWidth,
  initialHeight,
  onApply,
  onClose,
}: Props) {
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [preset, setPreset] = useState<Preset>(() =>
    detectPreset(initialWidth, initialHeight),
  );
  const [widthStr, setWidthStr] = useState(() =>
    round2(pxToUnit(initialWidth, "in")).toString(),
  );
  const [heightStr, setHeightStr] = useState(() =>
    round2(pxToUnit(initialHeight, "in")).toString(),
  );

  const widthVal = parseFloat(widthStr);
  const heightVal = parseFloat(heightStr);
  const widthPx = Number.isFinite(widthVal) ? unitToPx(widthVal, unit) : NaN;
  const heightPx = Number.isFinite(heightVal) ? unitToPx(heightVal, unit) : NaN;

  const valid =
    Number.isFinite(widthPx) &&
    Number.isFinite(heightPx) &&
    widthPx >= MIN_PX &&
    widthPx <= MAX_PX &&
    heightPx >= MIN_PX &&
    heightPx <= MAX_PX;

  const handleUnitChange = (next: LengthUnit | null) => {
    if (!next || next === unit) return;
    if (Number.isFinite(widthPx) && Number.isFinite(heightPx)) {
      setWidthStr(round2(pxToUnit(widthPx, next)).toString());
      setHeightStr(round2(pxToUnit(heightPx, next)).toString());
    }
    setUnit(next);
  };

  const handlePresetChange = (next: Preset) => {
    setPreset(next);
    if (next === "standard") {
      setWidthStr(round2(pxToUnit(STANDARD_PRESET_PX.width, unit)).toString());
      setHeightStr(round2(pxToUnit(STANDARD_PRESET_PX.height, unit)).toString());
    }
  };

  const handleWidthChange = (value: string) => {
    setWidthStr(value);
    if (preset !== "custom") setPreset("custom");
  };

  const handleHeightChange = (value: string) => {
    setHeightStr(value);
    if (preset !== "custom") setPreset("custom");
  };

  const handleApply = () => {
    if (!valid) return;
    onApply(round2(widthPx), round2(heightPx));
    onClose();
  };

  const unitLabel = unit === "cm" ? "cm" : "in";
  const customDisabled = preset === "standard";

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <AspectRatioOutlinedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
          Page setup
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Typography variant="caption" color="text.secondary">
          Choose a preset or enter custom slide dimensions. Existing elements
          keep their position — only the slide canvas resizes.
        </Typography>

        <FormControl size="small" fullWidth>
          <InputLabel id="page-setup-preset-label">Preset</InputLabel>
          <Select
            labelId="page-setup-preset-label"
            label="Preset"
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as Preset)}
          >
            <MenuItem value="standard">Standard 4:3 (10 × 7.5 in)</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={unit}
            onChange={(_, v: LengthUnit | null) => handleUnitChange(v)}
            aria-label="Units"
          >
            <ToggleButton value="in" aria-label="Inches">
              Inches
            </ToggleButton>
            <ToggleButton value="cm" aria-label="Centimeters">
              Cm
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Width"
            type="number"
            size="small"
            value={widthStr}
            disabled={customDisabled}
            onChange={(e) => handleWidthChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">{unitLabel}</InputAdornment>
                ),
              },
              htmlInput: { step: 0.01, min: 1, max: 50 },
            }}
            fullWidth
          />
          <TextField
            label="Height"
            type="number"
            size="small"
            value={heightStr}
            disabled={customDisabled}
            onChange={(e) => handleHeightChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">{unitLabel}</InputAdornment>
                ),
              },
              htmlInput: { step: 0.01, min: 1, max: 50 },
            }}
            fullWidth
          />
        </Box>

        {!valid && (
          <Typography variant="caption" color="error">
            Width and height must be between 1 and 50 in (2.54–127 cm).
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleApply}
          disabled={!valid}
          disableElevation
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
