"use client";

import type { ReactNode } from "react";
import styles from "./comments.module.css";

type Props = {
  name: string;
  picture: string | null;
  subtitle?: string;
  trailing?: ReactNode;
};

export function CommentAuthorRow({ name, picture, subtitle, trailing }: Props) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className={styles.authorRow}>
      <span className={styles.avatar} aria-hidden>
        {picture ? (
          <img src={picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </span>
      <div className={styles.authorMeta}>
        <span className={styles.authorName}>{name}</span>
        {subtitle ? <span className={styles.authorTime}>{subtitle}</span> : null}
      </div>
      {trailing ? <div className={styles.hoverControls}>{trailing}</div> : null}
    </div>
  );
}
