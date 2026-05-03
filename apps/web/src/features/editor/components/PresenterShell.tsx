"use client";

/**
 * Fullscreen presenter overlay. Rendered in place of the editor chrome when
 * `ui.presenting` is true. Reuses {@link SlideRenderer} in non-interactive
 * mode so text/shapes/images look identical to the editor canvas.
 *
 * Keyboard: Right/Down/Space/PageDown/Enter advance. Left/Up/PageUp/Backspace
 * go back. Home/End jump to first/last. `B` toggles white blank, `.` toggles
 * black blank, Esc exits.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import { SlideRenderer } from "./SlideRenderer";
import {
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import styles from "../editor.module.css";

function requestFs(el: HTMLElement) {
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const req = el.requestFullscreen?.bind(el) ?? anyEl.webkitRequestFullscreen?.bind(el);
  return req ? Promise.resolve(req()).catch(() => undefined) : Promise.resolve();
}

function exitFs() {
  const anyDoc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  const req = document.exitFullscreen?.bind(document) ?? anyDoc.webkitExitFullscreen?.bind(document);
  return req ? Promise.resolve(req()).catch(() => undefined) : Promise.resolve();
}

export function PresenterShell() {
  const { deck, selection, presenterBlank } = useEditorState();
  const { selectSlide, stopPresenting, setPresenterBlank } = useEditorActions();
  const { pageWidth, pageHeight } = deck.meta;

  const slides = deck.slides;
  const currentIdx = useMemo(() => {
    const i = slides.findIndex((s) => s.id === selection.slideId);
    return i >= 0 ? i : 0;
  }, [slides, selection.slideId]);
  const current = slides[currentIdx] ?? slides[0] ?? null;

  const rootRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: pageWidth, h: pageHeight });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fitToViewport = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const scale = Math.min(vw / pageWidth, vh / pageHeight);
    setFit({ w: pageWidth * scale, h: pageHeight * scale });
  }, [pageWidth, pageHeight]);

  useLayoutEffect(() => {
    fitToViewport();
    const ro = new ResizeObserver(fitToViewport);
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [fitToViewport]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const advance = useCallback(() => {
    const next = Math.min(currentIdx + 1, slides.length - 1);
    if (slides[next] && slides[next].id !== selection.slideId) {
      selectSlide(slides[next].id);
    }
  }, [currentIdx, slides, selection.slideId, selectSlide]);

  const retreat = useCallback(() => {
    const prev = Math.max(currentIdx - 1, 0);
    if (slides[prev] && slides[prev].id !== selection.slideId) {
      selectSlide(slides[prev].id);
    }
  }, [currentIdx, slides, selection.slideId, selectSlide]);

  const jumpTo = useCallback(
    (idx: number) => {
      const clamped = Math.min(Math.max(idx, 0), slides.length - 1);
      if (slides[clamped] && slides[clamped].id !== selection.slideId) {
        selectSlide(slides[clamped].id);
      }
    },
    [slides, selection.slideId, selectSlide],
  );

  const exit = useCallback(() => {
    if (document.fullscreenElement) exitFs();
    stopPresenting();
  }, [stopPresenting]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      exitFs();
    } else if (rootRef.current) {
      requestFs(rootRef.current);
    }
  }, []);

  const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handlerRef.current = (e: KeyboardEvent) => {
    const key = e.key;

    // Skip anything with a meta/ctrl modifier so the Cmd+Enter that started
    // the presentation doesn't double as an "advance slide" Enter.
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (key === "Escape") {
      e.preventDefault();
      if (presenterBlank !== "none") {
        setPresenterBlank("none");
      } else {
        exit();
      }
      return;
    }

    if (key === "b" || key === "B") {
      e.preventDefault();
      setPresenterBlank(presenterBlank === "white" ? "none" : "white");
      return;
    }
    if (key === "." || key === ">" || key === "," || key === "<") {
      // `.` (period) toggles blackout; Google Slides uses `.` for black.
      if (key === "." || key === ">") {
        e.preventDefault();
        setPresenterBlank(presenterBlank === "black" ? "none" : "black");
      }
      return;
    }

    if (presenterBlank !== "none") {
      // Any other key exits blank mode.
      e.preventDefault();
      setPresenterBlank("none");
      return;
    }

    if (
      key === "ArrowRight" ||
      key === "ArrowDown" ||
      key === " " ||
      key === "PageDown" ||
      key === "Enter"
    ) {
      e.preventDefault();
      advance();
      return;
    }
    if (
      key === "ArrowLeft" ||
      key === "ArrowUp" ||
      key === "PageUp" ||
      key === "Backspace"
    ) {
      e.preventDefault();
      retreat();
      return;
    }
    if (key === "Home") {
      e.preventDefault();
      jumpTo(0);
      return;
    }
    if (key === "End") {
      e.preventDefault();
      jumpTo(slides.length - 1);
      return;
    }
    if (key === "f" || key === "F") {
      e.preventDefault();
      toggleFullscreen();
      return;
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (node) {
        node.focus();
        // Best-effort fullscreen on mount. User gesture from the Slideshow
        // click propagates if we're within a reasonable time window. If the
        // browser rejects, the "Fullscreen" button still works.
        void requestFs(node);
        fitToViewport();
      }
    },
    [fitToViewport],
  );

  if (!current) {
    return (
      <div className={styles.presenterRoot}>
        <div className={styles.presenterEmpty}>No slides to present.</div>
        <button
          type="button"
          className={styles.presenterExitButton}
          onClick={exit}
          aria-label="Exit presentation"
        >
          <CloseRoundedIcon fontSize="small" />
        </button>
      </div>
    );
  }

  const blankStyle =
    presenterBlank === "white"
      ? { background: "#ffffff" }
      : presenterBlank === "black"
        ? { background: "#000000" }
        : undefined;

  return (
    <div
      ref={setRootRef}
      tabIndex={-1}
      className={styles.presenterRoot}
      onClick={(e) => {
        if (e.target === e.currentTarget) advance();
      }}
      style={blankStyle}
    >
      {presenterBlank === "none" ? (
        <div
          className={styles.presenterStage}
          style={{ width: fit.w, height: fit.h }}
        >
          <div
            style={{
              width: pageWidth,
              height: pageHeight,
              transform: `scale(${fit.w / pageWidth})`,
              transformOrigin: "top left",
            }}
          >
            <SlideRenderer
              slide={current}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              themeId={deck.meta.themeId}
              master={deck.meta.master}
              slideNumber={currentIdx + 1}
              interactive={false}
            />
          </div>
        </div>
      ) : null}

      <div className={styles.presenterControls} aria-label="Presenter controls">
        <button
          type="button"
          className={styles.presenterCtrlButton}
          onClick={retreat}
          disabled={currentIdx === 0}
          aria-label="Previous slide"
          title="Previous slide"
        >
          <ArrowBackIosNewRoundedIcon fontSize="small" />
        </button>
        <span className={styles.presenterProgress} aria-live="polite">
          {currentIdx + 1} / {slides.length}
        </span>
        <button
          type="button"
          className={styles.presenterCtrlButton}
          onClick={advance}
          disabled={currentIdx === slides.length - 1}
          aria-label="Next slide"
          title="Next slide"
        >
          <ArrowForwardIosRoundedIcon fontSize="small" />
        </button>
        <span className={styles.presenterCtrlDivider} />
        <button
          type="button"
          className={styles.presenterCtrlButton}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"}
        >
          {isFullscreen ? (
            <FullscreenExitRoundedIcon fontSize="small" />
          ) : (
            <FullscreenRoundedIcon fontSize="small" />
          )}
        </button>
        <button
          type="button"
          className={styles.presenterCtrlButton}
          onClick={exit}
          aria-label="Exit presentation"
          title="Exit (Esc)"
        >
          <CloseRoundedIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
}
