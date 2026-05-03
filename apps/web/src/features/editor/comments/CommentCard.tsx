"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import Tooltip from "@mui/material/Tooltip";
import type { Comment } from "../model/types";
import { useAuthStore } from "@/features/auth";
import { useDocProvider, useEditorActions } from "../state/EditorContext";
import { CommentAuthorRow } from "./CommentAuthorRow";
import { formatCommentTime } from "./formatTime";
import styles from "./comments.module.css";

type Props = {
  comment: Comment;
  muted?: boolean;
  readonly?: boolean;
};

export function CommentCard({ comment, muted = false, readonly = false }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const provider = useDocProvider();
  const { openCommentComposer } = useEditorActions();

  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const resolved = !!comment.resolvedAt;
  const isAuthor =
    currentUser && String(currentUser.id) === comment.authorId;

  const handleResolveToggle = () => {
    if (resolved) {
      provider.unresolveComment(comment.id);
    } else {
      provider.resolveComment(
        comment.id,
        currentUser?.name ?? comment.authorName,
      );
    }
  };

  const openMenu = () => {
    const btn = moreBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setMenuPos({ x: r.right - 140, y: r.bottom + 4 });
  };

  const closeMenu = () => setMenuPos(null);

  const handleEdit = () => {
    closeMenu();
    openCommentComposer(comment.slideId, comment.id);
  };

  const handleDelete = () => {
    closeMenu();
    provider.deleteComment(comment.id);
  };

  const trailing = (
    <>
      <Tooltip
        title={resolved ? "Re-open" : "Resolve"}
        placement="top"
        disableInteractive
      >
        <button
          type="button"
          className={`${styles.iconBtn} ${!resolved ? styles.iconBtnPrimary : ""}`}
          aria-label={resolved ? "Re-open comment" : "Resolve comment"}
          onClick={handleResolveToggle}
        >
          {resolved ? (
            <UndoRoundedIcon fontSize="small" />
          ) : (
            <CheckRoundedIcon fontSize="small" />
          )}
        </button>
      </Tooltip>
      {isAuthor ? (
        <button
          type="button"
          ref={moreBtnRef}
          className={styles.iconBtn}
          aria-label="More"
          onClick={openMenu}
        >
          <MoreVertRoundedIcon fontSize="small" />
        </button>
      ) : null}
    </>
  );

  return (
    <div className={`${styles.card} ${muted ? styles.cardMuted : ""}`}>
      <CommentAuthorRow
        name={comment.authorName}
        picture={comment.authorPicture}
        subtitle={formatCommentTime(comment.createdAt)}
        trailing={readonly ? undefined : trailing}
      />
      <div className={styles.commentText}>{comment.text}</div>

      {menuPos
        ? createPortal(
            <>
              <div className={styles.menuBackdrop} onClick={closeMenu} />
              <div
                role="menu"
                className={styles.menu}
                style={{ top: menuPos.y, left: menuPos.x }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={handleEdit}
                >
                  <EditOutlinedIcon sx={{ fontSize: 18 }} />
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={handleDelete}
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                  Delete
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
