"use client";

import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

type Props = {
  open: boolean;
  title?: string;
  initialValue?: string;
  submitLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (label: string) => void;
};

export function NameVersionDialog({
  open,
  title = "Name this version",
  initialValue = "",
  submitLabel = "Save",
  busy = false,
  onClose,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= 200 && !busy;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Version name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) {
              e.preventDefault();
              onSubmit(trimmed);
            }
          }}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() => canSubmit && onSubmit(trimmed)}
          variant="contained"
          disabled={!canSubmit}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
