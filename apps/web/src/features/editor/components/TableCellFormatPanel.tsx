"use client";

import { useMemo, useState } from "react";
import { useEditorTick } from "../hooks/useEditorTick";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";
import FormatColorTextRoundedIcon from "@mui/icons-material/FormatColorTextRounded";
import BorderColorRoundedIcon from "@mui/icons-material/BorderColorRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import FormatAlignLeftRoundedIcon from "@mui/icons-material/FormatAlignLeftRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import FormatAlignRightRoundedIcon from "@mui/icons-material/FormatAlignRightRounded";
import FormatAlignJustifyRoundedIcon from "@mui/icons-material/FormatAlignJustifyRounded";
import { useActiveEditor } from "../state/EditorContext";
import { FONT_FAMILIES, FONT_SIZES } from "../tiptap/extensions";
import { Dropdown, ColorGrid } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

type AlignValue = "left" | "center" | "right" | "justify";

const ALIGN_OPTIONS: { value: AlignValue; Icon: React.ElementType; label: string }[] = [
  { value: "left", Icon: FormatAlignLeftRoundedIcon, label: "Align left" },
  { value: "center", Icon: FormatAlignCenterRoundedIcon, label: "Align center" },
  { value: "right", Icon: FormatAlignRightRoundedIcon, label: "Align right" },
  { value: "justify", Icon: FormatAlignJustifyRoundedIcon, label: "Justify" },
];

const TEXT_COLORS = [
  "#202124", "#5f6368", "#9aa0a6", "#c4c7c5", "#ffffff",
  "#d93025", "#ea8600", "#f9ab00", "#188038", "#1a73e8",
  "#8430ce", "#a142f4", "#d01884", "#e8710a", "#188078",
];

const HIGHLIGHT_COLORS = [
  "transparent", "#fff475", "#ccff90", "#a7ffeb", "#cbf0f8",
  "#d7aefb", "#fdcfe8", "#e6c9a8", "#f28b82", "#fbbc04",
];

type EditorChain = ReturnType<NonNullable<ReturnType<typeof useActiveEditor>>["chain"]>;
type TextChain = EditorChain & {
  setFontFamily: (f: string) => TextChain;
  setFontSize: (size: string) => TextChain;
  setColor: (c: string) => TextChain;
  setHighlight: (opts: { color: string }) => TextChain;
  unsetHighlight: () => TextChain;
  setTextAlign: (v: string) => TextChain;
  toggleBold: () => TextChain;
  toggleItalic: () => TextChain;
  toggleUnderline: () => TextChain;
};

/**
 * Inline text formatting controls that operate purely via the active Tiptap
 * editor's commands — no TextElement block state. Reused from table cells
 * (and anywhere else a standalone editor is active without a block config).
 */
export function TableCellFormatPanel() {
  const editor = useActiveEditor();
  const tick = useEditorTick(editor);

  const [fontOpen, setFontOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);

  const isBold = editor?.isActive("bold") ?? false;
  const isItalic = editor?.isActive("italic") ?? false;
  const isUnderline = editor?.isActive("underline") ?? false;

  const activeAlign = useMemo<AlignValue>(() => {
    if (!editor) return "left";
    for (const v of ["left", "center", "right", "justify"] as AlignValue[]) {
      if (editor.isActive({ textAlign: v })) return v;
    }
    return "left";
  }, [editor, tick]);

  const activeFontFamily = useMemo(() => {
    if (!editor) return null;
    const attrs = editor.getAttributes("textStyle") as { fontFamily?: string };
    return attrs.fontFamily ?? null;
  }, [editor, tick]);

  const activeFontSize = useMemo(() => {
    if (!editor) return null;
    const attrs = editor.getAttributes("textStyle") as { fontSize?: string };
    const raw = attrs.fontSize;
    if (!raw) return null;
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : null;
  }, [editor, tick]);

  const run = (cb: (chain: TextChain) => TextChain) => {
    if (!editor) return;
    cb(editor.chain().focus() as TextChain).run();
  };

  const fontFamilyLabel = activeFontFamily
    ? FONT_FAMILIES.find((f) => f.value === activeFontFamily)?.label ?? "Custom"
    : "Default";
  const displayedFontSize = activeFontSize ?? 14;

  const AlignIcon =
    ALIGN_OPTIONS.find((o) => o.value === activeAlign)?.Icon ?? FormatAlignLeftRoundedIcon;

  return (
    <>
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
            <span className={styles.fontLabel}>{fontFamilyLabel}</span>
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
                run((c) => c.setFontFamily(f.value));
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
        onClick={() => run((c) => c.setFontSize(`${Math.max(6, displayedFontSize - 1)}px`))}
        title="Decrease font size"
        aria-label="Decrease font size"
      >
        <RemoveRoundedIcon fontSize="small" />
      </button>
      <Dropdown
        open={sizeOpen}
        onOpen={() => setSizeOpen(true)}
        onClose={() => setSizeOpen(false)}
        trigger={
          <button
            className={`${styles.toolbarButton} ${styles.fontPill}`}
            title="Font size"
            aria-label="Font size"
          >
            <span className={styles.fontLabel}>{displayedFontSize}</span>
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ minWidth: 80 }}>
          {FONT_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              className={styles.popoverItem}
              onClick={() => {
                run((c) => c.setFontSize(`${n}px`));
                setSizeOpen(false);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Dropdown>
      <button
        className={styles.toolbarButton}
        onClick={() => run((c) => c.setFontSize(`${Math.min(400, displayedFontSize + 1)}px`))}
        title="Increase font size"
        aria-label="Increase font size"
      >
        <AddRoundedIcon fontSize="small" />
      </button>

      <span className={styles.toolbarDivider} />

      <button
        className={`${styles.toolbarButton} ${isBold ? styles.toolbarButtonActive : ""}`}
        onClick={() => run((c) => c.toggleBold())}
        title="Bold (⌘B)"
        aria-label="Bold"
        aria-pressed={isBold}
      >
        <FormatBoldRoundedIcon fontSize="small" />
      </button>
      <button
        className={`${styles.toolbarButton} ${isItalic ? styles.toolbarButtonActive : ""}`}
        onClick={() => run((c) => c.toggleItalic())}
        title="Italic (⌘I)"
        aria-label="Italic"
        aria-pressed={isItalic}
      >
        <FormatItalicRoundedIcon fontSize="small" />
      </button>
      <button
        className={`${styles.toolbarButton} ${isUnderline ? styles.toolbarButtonActive : ""}`}
        onClick={() => run((c) => c.toggleUnderline())}
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
            <FormatColorTextRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8 }}>
          <ColorGrid
            colors={TEXT_COLORS}
            onSelect={(c) => {
              run((chain) => chain.setColor(c));
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
          <button
            className={styles.toolbarButton}
            title="Highlight color"
            aria-label="Highlight color"
          >
            <BorderColorRoundedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8 }}>
          <ColorGrid
            colors={HIGHLIGHT_COLORS}
            onSelect={(c) => {
              run((chain) =>
                c === "transparent" ? chain.unsetHighlight() : chain.setHighlight({ color: c }),
              );
              setHighlightOpen(false);
            }}
          />
        </div>
      </Dropdown>

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
            const isActive = activeAlign === value;
            return (
              <button
                key={value}
                type="button"
                className={`${styles.toolbarButton} ${isActive ? styles.toolbarButtonActive : ""}`}
                onClick={() => {
                  run((c) => c.setTextAlign(value));
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
    </>
  );
}
