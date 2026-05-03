"use client";

import { useMemo, useState } from "react";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";
import FormatColorTextRoundedIcon from "@mui/icons-material/FormatColorTextRounded";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import FormatColorFillOutlinedIcon from "@mui/icons-material/FormatColorFillOutlined";
import BorderAllOutlinedIcon from "@mui/icons-material/BorderAllOutlined";
import BorderStyleOutlinedIcon from "@mui/icons-material/BorderStyleOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import BorderColorRoundedIcon from "@mui/icons-material/BorderColorRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import FormatAlignLeftRoundedIcon from "@mui/icons-material/FormatAlignLeftRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import FormatAlignRightRoundedIcon from "@mui/icons-material/FormatAlignRightRounded";
import FormatAlignJustifyRoundedIcon from "@mui/icons-material/FormatAlignJustifyRounded";
import FormatLineSpacingRoundedIcon from "@mui/icons-material/FormatLineSpacingRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import {
  useActiveEditor,
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { TextElement } from "../model/types";
import { FONT_FAMILIES } from "../tiptap/extensions";
import { Dropdown, ColorGrid } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

type AlignValue = "left" | "center" | "right" | "justify";

const ALIGN_OPTIONS: { value: AlignValue; Icon: React.ElementType; label: string }[] = [
  { value: "left", Icon: FormatAlignLeftRoundedIcon, label: "Align left" },
  { value: "center", Icon: FormatAlignCenterRoundedIcon, label: "Align center" },
  { value: "right", Icon: FormatAlignRightRoundedIcon, label: "Align right" },
  { value: "justify", Icon: FormatAlignJustifyRoundedIcon, label: "Justify" },
];

const LINE_SPACING_OPTIONS = [1, 1.15, 1.5, 2, 2.5, 3];

const TEXT_COLORS = [
  "#202124", "#5f6368", "#9aa0a6", "#c4c7c5", "#ffffff",
  "#d93025", "#ea8600", "#f9ab00", "#188038", "#1a73e8",
  "#8430ce", "#a142f4", "#d01884", "#e8710a", "#188078",
];

const HIGHLIGHT_COLORS = [
  "transparent", "#fff475", "#ccff90", "#a7ffeb", "#cbf0f8",
  "#d7aefb", "#fdcfe8", "#e6c9a8", "#f28b82", "#fbbc04",
];

export function TextFormatPanel({ element }: { element: TextElement }) {
  const editor = useActiveEditor();
  const slide = useActiveSlide();
  const { selection, editingElementId } = useEditorState();
  const { updateTextBlock, startEditing } = useEditorActions();

  const slideId = selection.slideId ?? slide?.id ?? "";
  const { text } = element;

  const isBold = editor?.isActive("bold") ?? false;
  const isItalic = editor?.isActive("italic") ?? false;
  const isUnderline = editor?.isActive("underline") ?? false;
  const isBulletList = editor?.isActive("bulletList") ?? false;
  const isOrderedList = editor?.isActive("orderedList") ?? false;
  const activeAlign = (["left", "center", "right", "justify"] as AlignValue[]).find(
    (a) => editor?.isActive({ textAlign: a }),
  );

  const fontSize = text.fontSize ?? 18;
  const fontFamily = text.fontFamily
    ? FONT_FAMILIES.find((f) => f.value === text.fontFamily)?.label ?? "Custom"
    : "Arial";

  type ChainApi = ReturnType<NonNullable<typeof editor>["chain"]>;

  const runMark = (cb: (chain: ChainApi) => ChainApi) => {
    if (!editor) return;
    let chain: ChainApi = editor.chain().focus();
    if (!editingElementId) chain = chain.selectAll();
    chain = cb(chain);
    chain.run();
    if (!editingElementId) startEditing(element.id);
  };

  const setAlign = (v: AlignValue) => {
    if (editor) {
      editor.chain().focus().setTextAlign(v).run();
    }
    updateTextBlock(slideId, element.id, { align: v });
  };

  const setFontSize = (size: number) => {
    const clamped = Math.max(6, Math.min(400, size));
    updateTextBlock(slideId, element.id, { fontSize: clamped });
  };
  const setFontFamily = (value: string) => {
    updateTextBlock(slideId, element.id, { fontFamily: value });
  };
  const setLineHeight = (v: number) => {
    updateTextBlock(slideId, element.id, { lineHeight: v });
  };
  const setColor = (v: string) => {
    updateTextBlock(slideId, element.id, { color: v });
  };
  const setHighlight = (v: string) => {
    runMark((c) => (v === "transparent" ? c.unsetHighlight() : c.setHighlight({ color: v })));
  };

  const [fontOpen, setFontOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [bulletOpen, setBulletOpen] = useState(false);
  const [orderedOpen, setOrderedOpen] = useState(false);

  const AlignIcon = useMemo(() => {
    const found = ALIGN_OPTIONS.find((o) => o.value === (activeAlign ?? text.align ?? "left"));
    return found?.Icon ?? FormatAlignLeftRoundedIcon;
  }, [activeAlign, text.align]);

  return (
    <>
      <button className={styles.toolbarButton} title="Fill color" aria-label="Fill color">
        <FormatColorFillOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} title="Border color" aria-label="Border color">
        <BorderColorOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} title="Border weight" aria-label="Border weight">
        <BorderAllOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} title="Border dash" aria-label="Border dash">
        <BorderStyleOutlinedIcon fontSize="small" />
      </button>

      <span className={styles.toolbarDivider} />

      <Dropdown
        open={fontOpen}
        onOpen={() => setFontOpen(true)}
        onClose={() => setFontOpen(false)}
        trigger={
          <button
            className={`${styles.toolbarButton} ${styles.fontPill}`}
            title="Font"
            aria-label="Font"
          >
            <span className={styles.fontLabel}>{fontFamily}</span>
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 180 }}>
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.value}
              type="button"
              className={styles.popoverItem}
              style={{ fontFamily: f.value }}
              onClick={() => {
                setFontFamily(f.value);
                setFontOpen(false);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Dropdown>

      <button
        className={styles.toolbarButton}
        onClick={() => setFontSize(fontSize - 1)}
        title="Decrease font size"
        aria-label="Decrease font size"
      >
        <RemoveRoundedIcon fontSize="small" />
      </button>
      <input
        key={fontSize}
        type="number"
        className={styles.fontSizeInput}
        defaultValue={fontSize}
        onBlur={(e) => {
          const n = Number(e.currentTarget.value);
          if (Number.isFinite(n) && n > 0) setFontSize(n);
          else e.currentTarget.value = String(fontSize);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            (e.currentTarget as HTMLInputElement).value = String(fontSize);
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        aria-label="Font size"
      />
      <button
        className={styles.toolbarButton}
        onClick={() => setFontSize(fontSize + 1)}
        title="Increase font size"
        aria-label="Increase font size"
      >
        <AddRoundedIcon fontSize="small" />
      </button>

      <span className={styles.toolbarDivider} />

      <button
        className={`${styles.toolbarButton} ${isBold ? styles.toolbarButtonActive : ""}`}
        onClick={() => runMark((c) => c.toggleBold())}
        title="Bold (⌘B)"
        aria-label="Bold"
        aria-pressed={isBold}
      >
        <FormatBoldRoundedIcon fontSize="small" />
      </button>
      <button
        className={`${styles.toolbarButton} ${isItalic ? styles.toolbarButtonActive : ""}`}
        onClick={() => runMark((c) => c.toggleItalic())}
        title="Italic (⌘I)"
        aria-label="Italic"
        aria-pressed={isItalic}
      >
        <FormatItalicRoundedIcon fontSize="small" />
      </button>
      <button
        className={`${styles.toolbarButton} ${isUnderline ? styles.toolbarButtonActive : ""}`}
        onClick={() => runMark((c) => c.toggleUnderline())}
        title="Underline (⌘U)"
        aria-label="Underline"
        aria-pressed={isUnderline}
      >
        <FormatUnderlinedRoundedIcon fontSize="small" />
      </button>

      <Dropdown
        open={colorOpen}
        onOpen={() => setColorOpen(true)}
        onClose={() => setColorOpen(false)}
        trigger={
          <button className={styles.toolbarButton} title="Text color" aria-label="Text color">
            <span className={styles.textColorStack}>
              <FormatColorTextRoundedIcon fontSize="small" />
              <span
                className={styles.textColorUnderline}
                style={{ background: text.color ?? "#202124" }}
              />
            </span>
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8 }}>
          <ColorGrid
            colors={TEXT_COLORS}
            onSelect={(c) => {
              setColor(c);
              setColorOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <Dropdown
        open={highlightOpen}
        onOpen={() => setHighlightOpen(true)}
        onClose={() => setHighlightOpen(false)}
        trigger={
          <button className={styles.toolbarButton} title="Highlight color" aria-label="Highlight color">
            <BorderColorRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8 }}>
          <ColorGrid
            colors={HIGHLIGHT_COLORS}
            onSelect={(c) => {
              setHighlight(c);
              setHighlightOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <button
        className={styles.toolbarButton}
        title="Insert link (⌘K)"
        aria-label="Insert link"
        onClick={() => {
          const url = window.prompt("Enter URL");
          if (!url) return;
          runMark((c) => c.setLink({ href: url }));
        }}
      >
        <LinkRoundedIcon fontSize="small" />
      </button>

      <button className={styles.toolbarButton} title="Add comment" aria-label="Add comment">
        <AddCommentOutlinedIcon fontSize="small" />
      </button>

      <span className={styles.toolbarDivider} />

      <Dropdown
        open={alignOpen}
        onOpen={() => setAlignOpen(true)}
        onClose={() => setAlignOpen(false)}
        trigger={
          <button className={styles.toolbarButton} title="Align" aria-label="Align">
            <AlignIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ display: "flex", gap: 2, padding: 6 }}>
          {ALIGN_OPTIONS.map(({ value, Icon, label }) => {
            const isActive = (activeAlign ?? text.align ?? "left") === value;
            return (
              <button
                key={value}
                type="button"
                className={`${styles.toolbarButton} ${isActive ? styles.toolbarButtonActive : ""}`}
                onClick={() => {
                  setAlign(value);
                  setAlignOpen(false);
                }}
                title={label}
                aria-label={label}
              >
                <Icon fontSize="small" />
              </button>
            );
          })}
        </div>
      </Dropdown>

      <Dropdown
        open={lineOpen}
        onOpen={() => setLineOpen(true)}
        onClose={() => setLineOpen(false)}
        trigger={
          <button className={styles.toolbarButton} title="Line spacing" aria-label="Line spacing">
            <FormatLineSpacingRoundedIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 110 }}>
          {LINE_SPACING_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              className={styles.popoverItem}
              onClick={() => {
                setLineHeight(v);
                setLineOpen(false);
              }}
            >
              {v.toFixed(2)}
            </button>
          ))}
        </div>
      </Dropdown>

      <Dropdown
        open={bulletOpen}
        onOpen={() => setBulletOpen(true)}
        onClose={() => setBulletOpen(false)}
        trigger={
          <button
            className={`${styles.toolbarButton} ${isBulletList ? styles.toolbarButtonActive : ""}`}
            title="Bulleted list"
            aria-label="Bulleted list"
          >
            <FormatListBulletedRoundedIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 120 }}>
          <button
            className={styles.popoverItem}
            onClick={() => {
              runMark((c) => c.toggleBulletList());
              setBulletOpen(false);
            }}
          >
            Toggle bullets
          </button>
        </div>
      </Dropdown>

      <Dropdown
        open={orderedOpen}
        onOpen={() => setOrderedOpen(true)}
        onClose={() => setOrderedOpen(false)}
        trigger={
          <button
            className={`${styles.toolbarButton} ${isOrderedList ? styles.toolbarButtonActive : ""}`}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <FormatListNumberedRoundedIcon fontSize="small" />
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 120 }}>
          <button
            className={styles.popoverItem}
            onClick={() => {
              runMark((c) => c.toggleOrderedList());
              setOrderedOpen(false);
            }}
          >
            Toggle numbers
          </button>
        </div>
      </Dropdown>

      <button className={styles.toolbarButton} title="More options" aria-label="More options">
        <MoreVertRoundedIcon fontSize="small" />
      </button>
    </>
  );
}

