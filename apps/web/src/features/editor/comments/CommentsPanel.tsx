"use client";

import { Fragment, useMemo, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAuthStore } from "@/features/auth";
import { useEditorActions, useEditorState } from "../state/EditorContext";
import { CommentAuthorRow } from "./CommentAuthorRow";
import { CommentCard } from "./CommentCard";
import { formatCommentTime } from "./formatTime";
import { useAllComments } from "./useComments";
import type { Comment, Slide } from "../model/types";
import styles from "./comments.module.css";

type TabKey = "all" | "mine";
type TypeFilter = "all" | "unresolved" | "resolved";

export function CommentsPanel() {
  const { setCommentsPanelOpen } = useEditorActions();
  const { deck } = useEditorState();
  const currentUser = useAuthStore((s) => s.user);
  const all = useAllComments();

  const [tab, setTab] = useState<TabKey>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [slideFilter, setSlideFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return all.filter((c) => {
      if (tab === "mine") {
        if (!currentUser || String(currentUser.id) !== c.authorId) return false;
      }
      if (slideFilter !== "all" && c.slideId !== slideFilter) return false;
      return true;
    });
  }, [all, tab, slideFilter, currentUser]);

  const unresolved = useMemo(
    () => filtered.filter((c) => !c.resolvedAt),
    [filtered],
  );
  const resolved = useMemo(
    () => filtered.filter((c) => c.resolvedAt),
    [filtered],
  );

  const showUnresolved = typeFilter !== "resolved";
  const showResolved = typeFilter !== "unresolved";

  const slidesWithIndex = deck.slides.map((s, i) => ({
    id: s.id,
    label: `Slide ${i + 1}`,
  }));

  const groupedUnresolved = useMemo(
    () => groupBySlide(unresolved, deck.slides),
    [unresolved, deck.slides],
  );

  return (
    <aside className={styles.panel} aria-label="Comments panel">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Comments</span>
        <div className={styles.panelHeaderActions}>
          <button
            type="button"
            className={styles.panelIconBtn}
            aria-label="Notification settings"
          >
            <NotificationsNoneRoundedIcon fontSize="small" />
          </button>
          <button
            type="button"
            className={styles.panelIconBtn}
            aria-label="Close comments"
            onClick={() => setCommentsPanelOpen(false)}
          >
            <CloseRoundedIcon fontSize="small" />
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <div className={styles.tabsLeft}>
          <button
            type="button"
            className={`${styles.tab} ${tab === "all" ? styles.tabActive : ""}`}
            onClick={() => setTab("all")}
          >
            All comments
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === "mine" ? styles.tabActive : ""}`}
            onClick={() => setTab("mine")}
          >
            For you
          </button>
        </div>
        <button
          type="button"
          className={styles.tabSearch}
          aria-label="Search comments"
        >
          <SearchRoundedIcon fontSize="small" />
        </button>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          className={styles.filterSelect}
          value={slideFilter}
          onChange={(e) => setSlideFilter(e.target.value)}
          aria-label="Filter by slide"
        >
          <option value="all">All slides</option>
          {slidesWithIndex.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.panelBody}>
        {filtered.length === 0 ? (
          <div className={styles.panelEmpty}>No comments yet.</div>
        ) : (
          <>
            {showUnresolved &&
              groupedUnresolved.map((group) => (
                <Fragment key={group.slideId}>
                  {group.label ? (
                    <div className={styles.panelSlideLabel}>{group.label}</div>
                  ) : null}
                  {group.comments.map((c) => (
                    <CommentCard key={c.id} comment={c} muted readonly />
                  ))}
                </Fragment>
              ))}
            {showResolved && resolved.length > 0 ? (
              <div className={styles.panelResolvedLabel}>Resolved</div>
            ) : null}
            {showResolved &&
              resolved.map((c) => (
                <ResolvedThreadCard key={c.id} comment={c} />
              ))}
          </>
        )}
      </div>
    </aside>
  );
}

function ResolvedThreadCard({ comment }: { comment: Comment }) {
  return (
    <div className={`${styles.card} ${styles.cardMuted} ${styles.threadCard}`}>
      <CommentAuthorRow
        name={comment.authorName}
        picture={comment.authorPicture}
        subtitle={formatCommentTime(comment.createdAt)}
      />
      <div className={styles.commentText}>{comment.text}</div>
      {comment.resolvedByName && comment.resolvedAt ? (
        <>
          <div className={styles.threadDivider} />
          <CommentAuthorRow
            name={comment.resolvedByName}
            picture={
              comment.resolvedByName === comment.authorName
                ? comment.authorPicture
                : null
            }
            subtitle={formatCommentTime(comment.resolvedAt)}
          />
          <div className={styles.commentText}>Marked as resolved</div>
        </>
      ) : null}
    </div>
  );
}

type SlideGroup = {
  slideId: string;
  label: string;
  comments: Comment[];
};

function groupBySlide(comments: Comment[], slides: Slide[]): SlideGroup[] {
  const indexById = new Map(slides.map((s, i) => [s.id, i]));
  const order: string[] = [];
  const buckets = new Map<string, Comment[]>();
  for (const c of comments) {
    if (!buckets.has(c.slideId)) {
      order.push(c.slideId);
      buckets.set(c.slideId, []);
    }
    buckets.get(c.slideId)!.push(c);
  }
  return order.map((slideId) => ({
    slideId,
    label:
      indexById.has(slideId) ? `Slide ${(indexById.get(slideId) ?? 0) + 1}` : "",
    comments: buckets.get(slideId)!,
  }));
}
