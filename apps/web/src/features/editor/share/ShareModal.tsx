"use client";

import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";

import { useAuthStore } from "@/features/auth/store";
import {
  useAddCollaborator,
  usePresentation,
  useRemoveCollaborator,
  useSetVisibility,
} from "@/features/presentations";

import { PeopleRow } from "./PeopleRow";
import styles from "./ShareModal.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  deckId: string;
  /**
   * When false, the modal renders as a read-only view: inputs and role
   * controls are disabled and remove buttons are hidden. Used for
   * non-owners who can still read deck metadata.
   */
  canEdit?: boolean;
};

export function ShareModal({
  open,
  onClose,
  deckId,
  canEdit = true,
}: ShareModalProps) {
  const { data } = usePresentation(deckId);
  const me = useAuthStore((s) => s.user);

  const setVisibility = useSetVisibility(deckId);
  const addCollab = useAddCollaborator(deckId);
  const removeCollab = useRemoveCollaborator(deckId);

  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isPublic = !!data?.is_public;
  const collaborators = data?.collaborators ?? [];
  const isOwner = !!me && !!data && me.id === data.owner_id;
  const editable = canEdit && isOwner;

  const deckTitle = data?.title ?? "presentation";

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/present/${deckId}`;
  }, [deckId]);

  const submitEmail = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setInputError("Enter a valid email address");
      return;
    }
    const lower = trimmed.toLowerCase();
    if (collaborators.some((c) => c.email.toLowerCase() === lower)) {
      setInputError("This person already has access");
      return;
    }
    if (me?.email && me.email.toLowerCase() === lower) {
      setInputError("You already have access as the owner");
      return;
    }
    setInputError(null);
    addCollab.mutate(
      { email: trimmed },
      {
        onSuccess: () => setInput(""),
        onError: (err) =>
          setInputError(err.message || "Couldn't add collaborator"),
      },
    );
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied to clipboard");
    } catch {
      setToast("Copy failed — copy the URL manually");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { className: styles.dialogPaper } }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Share &ldquo;{deckTitle}&rdquo;</h2>
          <div className={styles.headerActions}>
            <Tooltip title="Help">
              <IconButton size="small" aria-label="Help">
                <HelpOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small" aria-label="Settings">
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.inputRow}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              label="Add people, groups, spaces, and calendar events"
              type="email"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitEmail();
                }
              }}
              disabled={!editable || addCollab.isPending}
              error={!!inputError}
              helperText={inputError ?? undefined}
              slotProps={{
                htmlInput: { "aria-label": "Add people by email" },
                input: {
                  endAdornment: addCollab.isPending ? (
                    <InputAdornment position="end">
                      <CircularProgress size={18} thickness={5} />
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "4px" },
                "& .MuiInputLabel-root": { fontSize: "13px" },
                "& .MuiOutlinedInput-input": { fontSize: "14px" },
              }}
            />
          </div>

          <div>
            <h3 className={styles.sectionTitle}>People with access</h3>
            <div className={styles.peopleList}>
              {data && me && isOwner ? (
                <PeopleRow
                  email={me.email}
                  name={`${me.name} (you)`}
                  picture={me.picture}
                  roleLabel="Owner"
                />
              ) : null}
              {collaborators.map((c) => (
                <PeopleRow
                  key={c.email}
                  email={c.email}
                  roleLabel={c.role === "editor" ? "Editor" : "Viewer"}
                  onRemove={
                    editable
                      ? () => removeCollab.mutate(c.email)
                      : undefined
                  }
                  removing={removeCollab.isPending}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.sectionTitle}>General access</h3>
            <div className={styles.accessCard}>
              <div
                className={`${styles.accessIcon}${
                  isPublic ? "" : ` ${styles.accessIconRestricted}`
                }`}
                aria-hidden
              >
                {isPublic ? (
                  <PublicOutlinedIcon fontSize="small" />
                ) : (
                  <LockOutlinedIcon fontSize="small" />
                )}
              </div>
              <div className={styles.accessBody}>
                <div className={styles.accessHeaderRow}>
                  <Select
                    size="small"
                    className={styles.accessSelect}
                    value={isPublic ? "public" : "restricted"}
                    onChange={(e) =>
                      setVisibility.mutate(e.target.value === "public")
                    }
                    disabled={!editable || setVisibility.isPending}
                  >
                    <MenuItem value="restricted">Restricted</MenuItem>
                    <MenuItem value="public">Anyone with the link</MenuItem>
                  </Select>
                  <Select
                    size="small"
                    className={styles.accessRightSelect}
                    value="viewer"
                    disabled
                  >
                    <MenuItem value="viewer">Viewer</MenuItem>
                  </Select>
                </div>
                <span className={styles.accessDescription}>
                  {isPublic
                    ? "Anyone on the internet with the link can view"
                    : "Only people with access can open with the link"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            variant="outlined"
            startIcon={<LinkRoundedIcon />}
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            Copy link
          </Button>
          <Button
            variant="contained"
            className={styles.doneBtn}
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={2000}
        onClose={() => setToast(null)}
        message={toast ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
}
