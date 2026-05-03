"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useActiveSlide, useEditorActions, useEditorState } from "../state/EditorContext";
import type { DeckMaster, Slide, SlideId } from "../model/types";
import styles from "../editor.module.css";
import { SlideRenderer } from "./SlideRenderer";

const THUMB_WIDTH = 150;

const thumbDomId = (id: SlideId) => `slide-thumb-${id}`;

type MenuState = { slideId: SlideId; x: number; y: number } | null;

function SortableThumbnail({
  slide,
  index,
  active,
  pageWidth,
  pageHeight,
  themeId,
  master,
  onSelect,
  onOpenMenu,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  pageWidth: number;
  pageHeight: number;
  themeId: string;
  master?: DeckMaster;
  onSelect: () => void;
  onOpenMenu: (slideId: SlideId, x: number, y: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const scale = THUMB_WIDTH / pageWidth;
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    listStyle: "none",
  };

  const handleContextMenu = (e: ReactPointerEvent | React.MouseEvent) => {
    e.preventDefault();
    onOpenMenu(slide.id, e.clientX, e.clientY);
  };

  const handleMoreClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenMenu(slide.id, rect.right, rect.bottom);
  };

  const handleClick = (e: React.MouseEvent<HTMLLIElement>) => {
    onSelect();
    e.currentTarget.focus();
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.thumbRow} ${isDragging ? styles.thumbRowDragging : ""}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...attributes}
      {...listeners}
      id={thumbDomId(slide.id)}
      data-slide-id={slide.id}
      role="option"
      aria-selected={active}
      tabIndex={0}
    >
      <span className={styles.thumbIndex}>{index + 1}</span>
      <div
        className={`${styles.thumbFrame} ${active ? styles.thumbFrameActive : ""}`}
        style={{ width: THUMB_WIDTH, height: pageHeight * scale }}
      >
        <div
          className={styles.thumbInner}
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`,
          }}
        >
          <SlideRenderer
            slide={slide}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            themeId={themeId}
            master={master}
            slideNumber={index + 1}
            interactive={false}
          />
        </div>
        <button
          type="button"
          className={styles.thumbMoreBtn}
          aria-label={`Slide ${index + 1} options`}
          onClick={handleMoreClick}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreVertRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    </li>
  );
}

function ThumbnailContextMenu({
  menu,
  onClose,
  onDuplicate,
  onDelete,
  onNewSlide,
  canDelete,
}: {
  menu: NonNullable<MenuState>;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onNewSlide: () => void;
  canDelete: boolean;
}) {
  const handleSelect = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <>
      <div
        ref={(el) => {
          el?.focus();
        }}
        tabIndex={-1}
        className={styles.contextMenuBackdrop}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{ outline: "none" }}
      />
      <div
        role="menu"
        className={styles.contextMenu}
        style={{ top: menu.y, left: menu.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className={styles.contextMenuItem}
          onClick={handleSelect(onNewSlide)}
        >
          <AddRoundedIcon sx={{ fontSize: 18 }} />
          New slide
        </button>
        <button
          type="button"
          role="menuitem"
          className={styles.contextMenuItem}
          onClick={handleSelect(onDuplicate)}
        >
          <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
          Duplicate slide
        </button>
        <div className={styles.contextMenuDivider} />
        <button
          type="button"
          role="menuitem"
          disabled={!canDelete}
          className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
          onClick={handleSelect(onDelete)}
        >
          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
          Delete slide
        </button>
      </div>
    </>
  );
}

export function SlideSidebar() {
  const { deck } = useEditorState();
  const active = useActiveSlide();
  const { selectSlide, duplicateSlide, deleteSlide, addSlide, reorderSlides } =
    useEditorActions();

  const [menu, setMenu] = useState<MenuState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active: activeItem, over } = event;
      if (!over || activeItem.id === over.id) return;
      const fromIndex = deck.slides.findIndex((s) => s.id === activeItem.id);
      const toIndex = deck.slides.findIndex((s) => s.id === over.id);
      if (fromIndex === -1 || toIndex === -1) return;
      reorderSlides(fromIndex, toIndex);
    },
    [deck.slides, reorderSlides],
  );

  const openMenu = useCallback((slideId: SlideId, x: number, y: number) => {
    setMenu({ slideId, x, y });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const canDelete = deck.slides.length > 1;

  const bindListKeys = useCallback(
    (node: HTMLOListElement | null) => {
      if (!node) return;
      const onKey = (e: KeyboardEvent) => {
        const key = e.key;
        if (
          key !== "ArrowUp" &&
          key !== "ArrowDown" &&
          key !== "Home" &&
          key !== "End"
        ) {
          return;
        }
        const target = e.target as HTMLElement | null;
        const slideId = target?.dataset?.slideId as SlideId | undefined;
        if (!slideId) return;
        e.preventDefault();
        const ids = deck.slides.map((s) => s.id);
        const cur = ids.indexOf(slideId);
        if (cur === -1) return;
        const next =
          key === "ArrowUp"
            ? Math.max(0, cur - 1)
            : key === "ArrowDown"
              ? Math.min(ids.length - 1, cur + 1)
              : key === "Home"
                ? 0
                : ids.length - 1;
        if (next === cur) return;
        const nextId = ids[next];
        selectSlide(nextId);
        queueMicrotask(() => {
          document.getElementById(thumbDomId(nextId))?.focus();
        });
      };
      node.addEventListener("keydown", onKey);
      return () => node.removeEventListener("keydown", onKey);
    },
    [deck.slides, selectSlide],
  );

  return (
    <aside className={styles.sidebar} aria-label="Slide list">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={deck.slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol
            ref={bindListKeys}
            role="listbox"
            aria-label="Slides"
            aria-activedescendant={active ? thumbDomId(active.id) : undefined}
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {deck.slides.map((slide, idx) => (
              <SortableThumbnail
                key={slide.id}
                slide={slide}
                index={idx}
                active={active?.id === slide.id}
                pageWidth={deck.meta.pageWidth}
                pageHeight={deck.meta.pageHeight}
                themeId={deck.meta.themeId}
                master={deck.meta.master}
                onSelect={() => selectSlide(slide.id)}
                onOpenMenu={openMenu}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {menu ? (
        <ThumbnailContextMenu
          menu={menu}
          onClose={closeMenu}
          onDuplicate={() => duplicateSlide(menu.slideId)}
          onDelete={() => deleteSlide(menu.slideId)}
          onNewSlide={() => {
            selectSlide(menu.slideId);
            addSlide();
          }}
          canDelete={canDelete}
        />
      ) : null}
    </aside>
  );
}
