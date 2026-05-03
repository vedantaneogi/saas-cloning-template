"use client";

import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { useEditorActions, useToast } from "../state/EditorContext";

export function UndoableToast() {
  const toast = useToast();
  const { undo, dismissToast } = useEditorActions();

  const open = toast.message !== null;

  const handleUndo = () => {
    undo();
    dismissToast();
  };

  return (
    <Snackbar
      key={toast.key}
      open={open}
      autoHideDuration={6000}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        dismissToast();
      }}
      message={toast.message ?? ""}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <>
          {toast.undoable ? (
            <Button
              size="small"
              onClick={handleUndo}
              startIcon={<UndoRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: "#8ab4f8",
                fontWeight: 600,
                textTransform: "none",
                minWidth: 0,
                px: 1.25,
              }}
            >
              Undo
            </Button>
          ) : null}
          <IconButton
            size="small"
            aria-label="Dismiss notification"
            onClick={dismissToast}
            sx={{ color: "rgba(255,255,255,0.72)" }}
          >
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </>
      }
    />
  );
}
