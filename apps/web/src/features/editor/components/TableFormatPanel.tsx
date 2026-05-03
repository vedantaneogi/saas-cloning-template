"use client";

import { useState } from "react";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import BorderAllOutlinedIcon from "@mui/icons-material/BorderAllOutlined";
import FormatColorFillRoundedIcon from "@mui/icons-material/FormatColorFillRounded";
import {
  useActiveSlide,
  useEditorActions,
  useEditorState,
} from "../state/EditorContext";
import type { TableElement, TableStyle } from "../model/types";
import { DEFAULT_TABLE_STYLE } from "../model/tableDefaults";
import { Dropdown, ColorGrid } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

const HEADER_FILLS = [
  "#dfe6f7",
  "#d2e3fc",
  "#fce8b2",
  "#e6f4ea",
  "#fce4ec",
  "#eaddff",
  "#eeeeee",
  "transparent",
];

const ZEBRA_FILLS = [
  "#f1f3f4",
  "#f8f9fa",
  "#e8f0fe",
  "#fff8e1",
  "#fce4ec",
  "#e6f4ea",
  "#eaddff",
  "transparent",
];

const TABLE_FILLS = [
  "#ffffff",
  "#f8f9fa",
  "#f1f3f4",
  "#e8f0fe",
  "#fff8e1",
  "#fce4ec",
  "#e6f4ea",
  "transparent",
];

const BORDER_COLORS = [
  "#c7c9cc",
  "#5f6368",
  "#202124",
  "#1a73e8",
  "#d93025",
  "#188038",
  "#f9ab00",
  "transparent",
];

const BORDER_WIDTHS = [0, 0.5, 1, 1.5, 2, 3];

type Props = {
  element: TableElement;
};

export function TableFormatPanel({ element }: Props) {
  const slide = useActiveSlide();
  const { selection } = useEditorState();
  const { updateTableStyle } = useEditorActions();
  const slideId = selection.slideId ?? slide?.id ?? "";

  const [headerOpen, setHeaderOpen] = useState(false);
  const [zebraOpen, setZebraOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [borderColorOpen, setBorderColorOpen] = useState(false);
  const [borderWidthOpen, setBorderWidthOpen] = useState(false);

  const s: Required<TableStyle> = {
    headerEnabled: element.style.headerEnabled ?? DEFAULT_TABLE_STYLE.headerEnabled,
    headerFill: element.style.headerFill ?? DEFAULT_TABLE_STYLE.headerFill,
    headerBold: element.style.headerBold ?? DEFAULT_TABLE_STYLE.headerBold,
    zebraEnabled: element.style.zebraEnabled ?? DEFAULT_TABLE_STYLE.zebraEnabled,
    zebraFill: element.style.zebraFill ?? DEFAULT_TABLE_STYLE.zebraFill,
    borderColor: element.style.borderColor ?? DEFAULT_TABLE_STYLE.borderColor,
    borderWidth: element.style.borderWidth ?? DEFAULT_TABLE_STYLE.borderWidth,
    tableFill: element.style.tableFill ?? DEFAULT_TABLE_STYLE.tableFill,
  };

  const patch = (p: Partial<TableStyle>) => {
    if (!slideId) return;
    updateTableStyle(slideId, element.id, p);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.toolbarButton} ${s.headerEnabled ? styles.toolbarButtonActive : ""}`}
        title="Toggle header row"
        aria-label="Toggle header row"
        aria-pressed={s.headerEnabled}
        onClick={() => patch({ headerEnabled: !s.headerEnabled })}
      >
        <TableRowsOutlinedIcon fontSize="small" />
      </button>

      <Dropdown
        open={headerOpen}
        onOpen={() => setHeaderOpen(true)}
        onClose={() => setHeaderOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Header fill color"
            aria-label="Header fill color"
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: 3,
                background: s.headerFill,
                border: "1px solid #c7c9cc",
              }}
            />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8, minWidth: 176 }}>
          <ColorGrid
            colors={HEADER_FILLS}
            onSelect={(c) => {
              patch({ headerFill: c, headerEnabled: true });
              setHeaderOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <span className={styles.toolbarDivider} />

      <button
        type="button"
        className={`${styles.toolbarButton} ${s.zebraEnabled ? styles.toolbarButtonActive : ""}`}
        title="Toggle zebra stripes"
        aria-label="Toggle zebra stripes"
        aria-pressed={s.zebraEnabled}
        onClick={() => patch({ zebraEnabled: !s.zebraEnabled })}
      >
        <ViewAgendaOutlinedIcon fontSize="small" />
      </button>

      <Dropdown
        open={zebraOpen}
        onOpen={() => setZebraOpen(true)}
        onClose={() => setZebraOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Zebra fill color"
            aria-label="Zebra fill color"
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: 3,
                background: s.zebraFill,
                border: "1px solid #c7c9cc",
              }}
            />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8, minWidth: 176 }}>
          <ColorGrid
            colors={ZEBRA_FILLS}
            onSelect={(c) => {
              patch({ zebraFill: c, zebraEnabled: true });
              setZebraOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <span className={styles.toolbarDivider} />

      <Dropdown
        open={fillOpen}
        onOpen={() => setFillOpen(true)}
        onClose={() => setFillOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Table fill"
            aria-label="Table fill"
          >
            <FormatColorFillRoundedIcon fontSize="small" />
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                marginLeft: 4,
                borderRadius: 2,
                background: s.tableFill,
                border: "1px solid #c7c9cc",
                backgroundImage:
                  s.tableFill === "transparent"
                    ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)"
                    : undefined,
                backgroundSize: s.tableFill === "transparent" ? "6px 6px" : undefined,
                backgroundPosition:
                  s.tableFill === "transparent" ? "0 0, 3px 3px" : undefined,
              }}
            />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8, minWidth: 176 }}>
          <ColorGrid
            colors={TABLE_FILLS}
            onSelect={(c) => {
              if (c === "transparent") {
                patch({ tableFill: c, headerFill: "transparent", zebraEnabled: false });
              } else {
                patch({ tableFill: c });
              }
              setFillOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <span className={styles.toolbarDivider} />

      <Dropdown
        open={borderColorOpen}
        onOpen={() => setBorderColorOpen(true)}
        onClose={() => setBorderColorOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Border color"
            aria-label="Border color"
          >
            <BorderColorOutlinedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 8, minWidth: 176 }}>
          <ColorGrid
            colors={BORDER_COLORS}
            onSelect={(c) => {
              patch({ borderColor: c });
              setBorderColorOpen(false);
            }}
          />
        </div>
      </Dropdown>

      <Dropdown
        open={borderWidthOpen}
        onOpen={() => setBorderWidthOpen(true)}
        onClose={() => setBorderWidthOpen(false)}
        trigger={
          <button
            className={styles.toolbarButton}
            title="Border weight"
            aria-label="Border weight"
          >
            <BorderAllOutlinedIcon fontSize="small" />
          </button>
        }
      >
        <div className={styles.popover} style={{ padding: 6, minWidth: 120 }}>
          {BORDER_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              className={styles.popoverItem}
              onClick={() => {
                patch({ borderWidth: w });
                setBorderWidthOpen(false);
              }}
            >
              <span className={styles.popoverItemRow}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 48,
                    height: Math.max(1, w),
                    background: s.borderColor,
                  }}
                />
                {w === 0 ? "None" : `${w} pt`}
              </span>
            </button>
          ))}
        </div>
      </Dropdown>
    </>
  );
}
