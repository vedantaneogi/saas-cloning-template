"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Tooltip from "@mui/material/Tooltip";

import styles from "./ShareModal.module.css";

export type PeopleRowProps = {
  email: string;
  name?: string | null;
  picture?: string | null;
  roleLabel: string;
  onRemove?: () => void;
  removing?: boolean;
};

function initialFor(name: string | null | undefined, email: string): string {
  const source = (name ?? email).trim();
  return source.charAt(0).toUpperCase() || "?";
}

export function PeopleRow({
  email,
  name,
  picture,
  roleLabel,
  onRemove,
  removing,
}: PeopleRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.rowAvatar} aria-hidden>
        {picture ? (
          <img src={picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          initialFor(name, email)
        )}
      </div>
      <div className={styles.rowBody}>
        <span className={styles.rowName}>{name ?? email}</span>
        {name ? <span className={styles.rowEmail}>{email}</span> : null}
      </div>
      <span className={styles.rowRole}>{roleLabel}</span>
      {onRemove ? (
        <Tooltip title="Remove">
          <button
            type="button"
            className={styles.rowRemove}
            aria-label={`Remove ${email}`}
            onClick={onRemove}
            disabled={removing}
          >
            <CloseRoundedIcon fontSize="small" />
          </button>
        </Tooltip>
      ) : null}
    </div>
  );
}
