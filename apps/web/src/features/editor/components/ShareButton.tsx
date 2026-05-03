"use client";

import { useCallback, useState } from "react";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import Snackbar from "@mui/material/Snackbar";

import { usePresentation } from "@/features/presentations";
import { useAuthStore } from "@/features/auth/store";

import { ShareModal } from "../share/ShareModal";
import styles from "../editor.module.css";

export type ShareButtonProps = {
  deckId: string;
  showCaret?: boolean;
};

export function ShareButton({ deckId, showCaret = true }: ShareButtonProps) {
  const { data } = usePresentation(deckId);
  const me = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const isPublic = !!data?.is_public;
  const canEdit = !!me && !!data && me.id === data.owner_id;

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/present/${deckId}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastOpen(true);
    } catch {
      // ignore
    }
    setDropdownOpen(false);
  }, [deckId]);

  return (
    <div className={styles.shareWrap}>
      {dropdownOpen && (
        <div
          className={styles.shareBackdrop}
          onClick={() => setDropdownOpen(false)}
        />
      )}
      <div
        className={`${styles.splitButton} ${styles.splitButtonPrimary}`}
        role="group"
        aria-label="Share"
      >
        <button
          className={styles.splitLabel}
          aria-label="Share"
          onClick={() => setModalOpen(true)}
        >
          {isPublic ? (
            <PublicOutlinedIcon fontSize="small" />
          ) : (
            <LockOutlinedIcon fontSize="small" />
          )}
          <span>Share</span>
        </button>
        {showCaret && (
          <button
            className={styles.splitCaret}
            aria-label="Share options"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        )}
      </div>
      {dropdownOpen && (
        <div className={styles.shareDropdown}>
          <button
            className={styles.shareDropdownItem}
            onClick={copyLink}
            title="Copy link"
          >
            <LinkRoundedIcon fontSize="small" />
            <span>Copy link</span>
          </button>
          <div className={styles.shareDropdownStatus}>
            <div className={styles.shareDropdownStatusTitle}>
              {isPublic ? "Public on the web" : "Restricted"}
            </div>
            <div>
              {isPublic
                ? "Anyone on the internet with the link can open"
                : "Only people with access can open with the link"}
            </div>
          </div>
        </div>
      )}
      <ShareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        deckId={deckId}
        canEdit={canEdit}
      />
      <Snackbar
        open={toastOpen}
        autoHideDuration={2000}
        onClose={() => setToastOpen(false)}
        message="Link copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </div>
  );
}
