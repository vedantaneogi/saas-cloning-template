"use client";

import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";

import {
  useActiveSlide,
  useEditorActions,
} from "../state/EditorContext";
import styles from "../editor.module.css";

export type SlideshowButtonProps = {
  showCaret?: boolean;
};

export function SlideshowButton({ showCaret = true }: SlideshowButtonProps) {
  const slide = useActiveSlide();
  const { startPresenting } = useEditorActions();

  return (
    <div className={styles.splitButton} role="group" aria-label="Slideshow">
      <button
        className={styles.splitLabel}
        aria-label="Start slideshow"
        title="Start slideshow (Cmd+Enter)"
        onClick={() => startPresenting(slide?.id)}
      >
        <span>Slideshow</span>
      </button>
      {showCaret ? (
        <button className={styles.splitCaret} aria-label="Slideshow options">
          <ArrowDropDownRoundedIcon fontSize="small" />
        </button>
      ) : null}
    </div>
  );
}
