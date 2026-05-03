"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SlideId } from "../model/types";
import { useSlideComments } from "./useComments";
import { CommentCard } from "./CommentCard";
import styles from "./comments.module.css";

const GAP = 16;
const RAIL_WIDTH = 280;

type Props = {
  slideId: SlideId | null | undefined;
  anchorEl: HTMLElement | null;
};

export function SlideCommentsRail({ slideId, anchorEl }: Props) {
  const { unresolved } = useSlideComments(slideId);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!anchorEl) {
      setRect(null);
      return;
    }
    let raf = 0;
    const update = () => setRect(anchorEl.getBoundingClientRect());
    update();
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(anchorEl);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [anchorEl]);

  if (!anchorEl || !rect || unresolved.length === 0) return null;
  if (typeof document === "undefined") return null;

  const left = rect.right + GAP;
  const viewportW = window.innerWidth;
  if (left + 120 > viewportW) return null; // no room — panel handles display

  return createPortal(
    <div
      className={styles.rail}
      style={{
        left,
        top: rect.top,
        height: rect.height,
        width: RAIL_WIDTH,
      }}
    >
      {unresolved.map((c) => (
        <CommentCard key={c.id} comment={c} muted />
      ))}
    </div>,
    document.body,
  );
}
