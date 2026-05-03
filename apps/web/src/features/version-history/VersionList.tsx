"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";

import type { VersionSummary } from "./types";
import styles from "./version-history.module.css";

type FilterMode = "all" | "named";

type Props = {
  versions: VersionSummary[];
  isLoading: boolean;
  selectedVersionId: string | null;
  highlightChanges: boolean;
  onSelectVersion: (id: string) => void;
  onToggleHighlight: (value: boolean) => void;
  onRenameVersion: (version: VersionSummary) => void;
  onRestoreVersion: (version: VersionSummary) => void;
};

function formatDayBucket(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / msPerDay);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type GroupedVersions = { label: string; items: VersionSummary[] }[];

function groupVersions(versions: VersionSummary[]): GroupedVersions {
  const now = new Date();
  const groups: GroupedVersions = [];
  for (const version of versions) {
    const label = formatDayBucket(version.created_at, now);
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(version);
    else groups.push({ label, items: [version] });
  }
  return groups;
}

function authorColor(id: number): string {
  const palette = [
    "#34a853",
    "#1a73e8",
    "#ea4335",
    "#fbbc04",
    "#9334e6",
    "#d93025",
    "#0097a7",
  ];
  return palette[Math.abs(id) % palette.length];
}

function VersionEntry({
  version,
  isLatest,
  isSelected,
  onSelect,
  onRename,
  onRestore,
}: {
  version: VersionSummary;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onRestore: () => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const title = version.label ?? formatTimestamp(version.created_at);
  const subtitle = isLatest
    ? "Current version"
    : version.label
      ? formatTimestamp(version.created_at)
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`${styles.entry} ${isSelected ? styles.entrySelected : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className={styles.entryChevron} aria-hidden>
        {!isLatest && <ChevronRightOutlinedIcon fontSize="small" />}
      </div>
      <div className={styles.entryMain}>
        <div className={styles.entryTitle}>{title}</div>
        {subtitle ? (
          <div className={styles.entrySubtle}>{subtitle}</div>
        ) : null}
        <div className={styles.entryAuthorRow}>
          <span
            className={styles.entryDot}
            style={{ background: authorColor(version.author_id) }}
            aria-hidden
          />
          <span className={styles.entryAuthorName}>
            {version.author_name ?? `User #${version.author_id}`}
          </span>
        </div>
      </div>
      <IconButton
        size="small"
        aria-label="Version options"
        onClick={(e) => {
          e.stopPropagation();
          setMenuAnchor(e.currentTarget);
        }}
        className={styles.entryMenuBtn}
      >
        <MoreVertOutlinedIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onRename();
          }}
        >
          <ListItemIcon>
            <DriveFileRenameOutlineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Name this version</ListItemText>
        </MenuItem>
        {!isLatest && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onRestore();
            }}
          >
            <ListItemIcon>
              <RestoreOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Restore this version</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}

export function VersionList({
  versions,
  isLoading,
  selectedVersionId,
  highlightChanges,
  onSelectVersion,
  onToggleHighlight,
  onRenameVersion,
  onRestoreVersion,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const visible = useMemo(() => {
    if (filter === "named") return versions.filter((v) => v.label);
    return versions;
  }, [filter, versions]);

  const grouped = useMemo(() => groupVersions(visible), [visible]);
  const latestId = versions[0]?.id ?? null;

  return (
    <aside className={styles.panel} aria-label="Version history">
      <header className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Version history</h2>
      </header>
      <div className={styles.filterRow}>
        <Select
          size="small"
          fullWidth
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterMode)}
          className={styles.filterSelect}
        >
          <MenuItem value="all">All versions</MenuItem>
          <MenuItem value="named">Named versions</MenuItem>
        </Select>
      </div>
      <div className={styles.scrollArea}>
        {isLoading ? (
          <Box className={styles.loadingRow}>
            <CircularProgress size={18} />
          </Box>
        ) : grouped.length === 0 ? (
          <div className={styles.emptyState}>
            No versions yet. Edits are saved as versions automatically.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.items.map((version) => (
                <VersionEntry
                  key={version.id}
                  version={version}
                  isLatest={version.id === latestId}
                  isSelected={version.id === selectedVersionId}
                  onSelect={() => onSelectVersion(version.id)}
                  onRename={() => onRenameVersion(version)}
                  onRestore={() => onRestoreVersion(version)}
                />
              ))}
            </div>
          ))
        )}
      </div>
      <footer className={styles.panelFooter}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={highlightChanges}
              onChange={(e) => onToggleHighlight(e.target.checked)}
            />
          }
          label="Highlight changes"
        />
      </footer>
    </aside>
  );
}
