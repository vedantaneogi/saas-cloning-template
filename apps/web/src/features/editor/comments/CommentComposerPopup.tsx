"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/features/auth";
import {
  useDocProvider,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import { CommentAuthorRow } from "./CommentAuthorRow";
import styles from "./comments.module.css";

const POPUP_WIDTH = 320;
const GAP = 16;

type Props = {
  anchorEl: HTMLElement | null;
};

function useAnchorRect(el: HTMLElement | null) {
  const [rect, setRect] = useState<DOMRect | null>(() =>
    el ? el.getBoundingClientRect() : null,
  );

  useLayoutEffect(() => {
    if (!el) {
      setRect(null);
      return;
    }
    let raf = 0;
    const update = () => {
      setRect(el.getBoundingClientRect());
    };
    update();
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [el]);

  return rect;
}

export function CommentComposerPopup({ anchorEl }: Props) {
  const { commentComposer, deck } = useEditorState();
  const { closeCommentComposer } = useEditorActions();
  const provider = useDocProvider();
  const user = useAuthStore((s) => s.user);

  const rect = useAnchorRect(anchorEl);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  const existingComment = useMemo(() => {
    if (!commentComposer?.editingCommentId) return null;
    return (
      deck.comments?.find(
        (c) => c.id === commentComposer.editingCommentId,
      ) ?? null
    );
  }, [commentComposer, deck.comments]);

  useEffect(() => {
    if (!commentComposer) {
      setText("");
      return;
    }
    setText(existingComment?.text ?? "");
    // focus after paint
    const id = requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [commentComposer, existingComment]);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !commentComposer) return;
    if (existingComment) {
      provider.updateCommentText(existingComment.id, trimmed);
    } else {
      provider.addComment({
        slideId: commentComposer.slideId,
        authorId: String(user?.id ?? "anon"),
        authorName: user?.name ?? "You",
        authorPicture: user?.picture ?? null,
        text: trimmed,
      });
    }
    closeCommentComposer();
  }, [
    text,
    commentComposer,
    existingComment,
    provider,
    user,
    closeCommentComposer,
  ]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCommentComposer();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [closeCommentComposer, submit],
  );

  if (!commentComposer) return null;
  if (!anchorEl || !rect) return null;
  if (typeof document === "undefined") return null;

  // Position to the right of the slide; clamp to viewport.
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  let left = rect.right + GAP;
  if (left + POPUP_WIDTH > viewportW - 8) {
    // fallback: place over the right edge of the slide
    left = Math.max(8, viewportW - POPUP_WIDTH - 8);
  }
  let top = rect.top;
  top = Math.min(top, viewportH - 180);
  top = Math.max(8, top);

  const canSubmit = text.trim().length > 0;
  const authorName = existingComment?.authorName ?? user?.name ?? "You";
  const authorPicture = existingComment?.authorPicture ?? user?.picture ?? null;

  return createPortal(
    <>
      <div
        className={styles.popupBackdrop}
        onMouseDown={closeCommentComposer}
      />
      <div
        className={styles.popup}
        style={{ left, top, width: POPUP_WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.card}>
          <CommentAuthorRow name={authorName} picture={authorPicture} />
          <textarea
            ref={textareaRef}
            className={styles.composerInput}
            placeholder="Comment or add others with @"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <div className={styles.composerActions}>
            <button
              type="button"
              className={styles.btnText}
              onClick={closeCommentComposer}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={submit}
              disabled={!canSubmit}
            >
              {existingComment ? "Save" : "Comment"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
