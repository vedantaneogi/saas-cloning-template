"use client";

import { useState } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {
  useActiveTheme,
  useEditorActions,
} from "../state/EditorContext";
import { THEMES, type Theme } from "../themes";
import { Dropdown } from "./FormatPanelPrimitives";
import styles from "../editor.module.css";

export function ThemePicker() {
  const currentTheme = useActiveTheme();
  const { setDeckTheme } = useEditorActions();
  const [open, setOpen] = useState(false);

  return (
    <Dropdown
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      trigger={
        <button
          type="button"
          className={styles.toolbarButton}
          aria-label="Theme"
          title="Theme"
        >
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              gap: 2,
              alignItems: "center",
            }}
          >
            <span
              style={{
                width: 6,
                height: 14,
                borderRadius: 1,
                background: currentTheme.colors.accent,
              }}
            />
            <span
              style={{
                width: 6,
                height: 14,
                borderRadius: 1,
                background: currentTheme.colors.title,
              }}
            />
            <span
              style={{
                width: 6,
                height: 14,
                borderRadius: 1,
                background: currentTheme.colors.background,
                border: "1px solid rgba(0, 0, 0, 0.12)",
              }}
            />
          </span>
          <span style={{ marginLeft: 6 }}>Theme</span>
        </button>
      }
    >
      <div className={styles.popover} style={{ minWidth: 240, padding: 8 }}>
        {THEMES.map((t) => (
          <ThemeRow
            key={t.id}
            theme={t}
            active={t.id === currentTheme.id}
            onSelect={() => {
              setDeckTheme(t.id);
              setOpen(false);
            }}
          />
        ))}
      </div>
    </Dropdown>
  );
}

function ThemeRow({
  theme,
  active,
  onSelect,
}: {
  theme: Theme;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.popoverItem}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 6,
      }}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          gap: 4,
          alignItems: "center",
          padding: 4,
          borderRadius: 4,
          background: theme.colors.background,
          border: "1px solid rgba(0, 0, 0, 0.08)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.colors.title,
          }}
        >
          Aa
        </span>
        <span
          style={{
            width: 4,
            height: 12,
            borderRadius: 1,
            background: theme.colors.accent,
          }}
        />
      </span>
      <span style={{ flex: 1, textAlign: "left", fontSize: 13 }}>
        {theme.name}
      </span>
      {active ? <CheckRoundedIcon sx={{ fontSize: 16, color: "#1a73e8" }} /> : null}
    </button>
  );
}
