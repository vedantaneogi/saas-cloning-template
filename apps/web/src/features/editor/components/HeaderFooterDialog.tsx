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
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import ViewStreamOutlinedIcon from "@mui/icons-material/ViewStreamOutlined";
import TitleOutlinedIcon from "@mui/icons-material/TitleOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import FormatListNumberedOutlinedIcon from "@mui/icons-material/FormatListNumberedOutlined";
import type { DeckMaster } from "../model/types";

type Props = {
  initialMaster?: DeckMaster;
  onApply: (master: DeckMaster) => void;
  onClose: () => void;
};

// Rendered by EditorShell only when headerFooterDialogOpen is true,
// so state initialises fresh on each open.
export function HeaderFooterDialog({ initialMaster, onApply, onClose }: Props) {
  const [footer, setFooter] = useState(initialMaster?.footer ?? "");
  const [titleText, setTitleText] = useState(initialMaster?.titleText ?? "");
  const [showSlideNumber, setShowSlideNumber] = useState(
    initialMaster?.showSlideNumber ?? false,
  );
  const [showDate, setShowDate] = useState(initialMaster?.showDate ?? false);

  const handleApply = () => {
    onApply({
      footer: footer.trim(),
      titleText: titleText.trim(),
      showSlideNumber,
      showDate,
    });
    onClose();
  };

  const handleClear = () => {
    onApply({
      footer: "",
      titleText: "",
      showSlideNumber: false,
      showDate: false,
    });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <ViewStreamOutlinedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
          Header &amp; Footer
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          These master-level overlays appear on every slide in the deck.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <TitleOutlinedIcon sx={{ color: "text.secondary", fontSize: 20, mt: 1.5 }} />
          <TextField
            label="Master title overlay"
            placeholder="e.g. Company Name · Confidential"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            fullWidth
            size="small"
            helperText="Shown as a subtle watermark at the top of every slide"
            slotProps={{
              input: {
                endAdornment: titleText ? (
                  <IconButton
                    size="small"
                    onClick={() => setTitleText("")}
                    aria-label="Clear title"
                    edge="end"
                  >
                    <CloseOutlinedIcon fontSize="small" />
                  </IconButton>
                ) : null,
              },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <ViewStreamOutlinedIcon sx={{ color: "text.secondary", fontSize: 20, mt: 1.5 }} />
          <TextField
            label="Footer"
            placeholder="e.g. Acme Corp · Q1 2026"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            fullWidth
            size="small"
            helperText="Shown in the center of the footer bar on every slide"
            onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
            slotProps={{
              input: {
                endAdornment: footer ? (
                  <IconButton
                    size="small"
                    onClick={() => setFooter("")}
                    aria-label="Clear footer"
                    edge="end"
                  >
                    <CloseOutlinedIcon fontSize="small" />
                  </IconButton>
                ) : null,
              },
            }}
          />
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showSlideNumber}
                onChange={(e) => setShowSlideNumber(e.target.checked)}
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormatListNumberedOutlinedIcon
                  sx={{ color: "text.secondary", fontSize: 18 }}
                />
                <Box>
                  <Typography variant="body2">Slide numbers</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shown on the right of the footer bar
                  </Typography>
                </Box>
              </Box>
            }
            sx={{ m: 0, justifyContent: "space-between", width: "100%" }}
            labelPlacement="start"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showDate}
                onChange={(e) => setShowDate(e.target.checked)}
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarTodayOutlinedIcon
                  sx={{ color: "text.secondary", fontSize: 18 }}
                />
                <Box>
                  <Typography variant="body2">Date</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today&apos;s date, shown on the left of the footer bar
                  </Typography>
                </Box>
              </Box>
            }
            sx={{ m: 0, justifyContent: "space-between", width: "100%" }}
            labelPlacement="start"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          size="small"
          color="inherit"
          onClick={handleClear}
          sx={{ mr: "auto", color: "text.secondary" }}
        >
          Clear all
        </Button>
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={handleApply} disableElevation>
          Apply to all
        </Button>
      </DialogActions>
    </Dialog>
  );
}
