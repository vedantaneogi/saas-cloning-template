"use client";

import Link from "next/link";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

import { UserAvatar } from "@/features/auth";
import { useAuthStore } from "@/features/auth/store";

import { useEditorDeckId, useEditorState } from "../state/EditorContext";
import { MenuBar } from "./MenuBar";
import { ShareButton } from "./ShareButton";
import { SlideshowButton } from "./SlideshowButton";
import styles from "../editor.module.css";

const VIEW_ONLY_MENUS = ["File", "Edit", "View", "Help"];

function SlidesLogoLink() {
  return (
    <Link
      href="/"
      className={`${styles.logo} ${styles.logoLink}`}
      aria-label="Home"
    >
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path
          d="M10 6h20l10 10v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
          fill="#F6BF26"
        />
        <path d="M30 6v10h10Z" fill="#E3A008" />
        <rect x="14" y="22" width="20" height="14" rx="1" fill="#fff" />
      </svg>
    </Link>
  );
}

export function TopBarReadOnly() {
  const deckId = useEditorDeckId();
  const { deck } = useEditorState();
  const user = useAuthStore((s) => s.user);

  const signInHref = `/auth/sign-in?next=${encodeURIComponent(
    `/present/${deckId}`,
  )}`;

  return (
    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <SlidesLogoLink />
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.readOnlyTitle}>{deck.meta.title}</span>
          </div>
          <MenuBar menuLabels={VIEW_ONLY_MENUS} />
        </div>
      </div>

      <div />

      <div className={styles.topRight}>
        <span className={styles.viewOnlyPill} aria-label="View only">
          <VisibilityOutlinedIcon fontSize="small" />
          View only
        </span>
        <SlideshowButton showCaret={false} />
        <ShareButton deckId={deckId} showCaret={false} />
        {user ? (
          <UserAvatar size={32} />
        ) : (
          <Link href={signInHref} className={styles.signInPill}>
            <LoginRoundedIcon fontSize="small" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
