"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import { UserAvatar } from "@/features/auth";
import { useRenamePresentation } from "@/features/presentations";
import {
  useEditorActions,
  useEditorDeckId,
  useEditorState,
} from "../state/EditorContext";
import { useMenuActions } from "../hooks/useMenuActions";
import { useInsertImage } from "../hooks/useInsertImage";
import { useImportPptx, buildToastMessage } from "../hooks/useImportPptx";
import CircularProgress from "@mui/material/CircularProgress";
import { MenuBar } from "./MenuBar";
import { ShareButton } from "./ShareButton";
import { SlideshowButton } from "./SlideshowButton";
import { ShareModal } from "../share/ShareModal";
import {
  NameVersionDialog,
  useCreateVersion,
} from "@/features/version-history";
import { useTotalUnresolvedCount } from "../comments/useComments";
import commentStyles from "../comments/comments.module.css";
import styles from "../editor.module.css";

function SlidesLogoLink() {
  return (
    <Link
      href="/"
      className={`${styles.logo} ${styles.logoLink}`}
      aria-label="Home"
    >
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M10 6h20l10 10v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="#F6BF26" />
        <path d="M30 6v10h10Z" fill="#E3A008" />
        <rect x="14" y="22" width="20" height="14" rx="1" fill="#fff" />
      </svg>
    </Link>
  );
}

function SaveStatusIndicator() {
  const { saveState } = useEditorState();
  const { icon, tooltip, color } = useMemo(() => {
    switch (saveState) {
      case "saving":
        return {
          icon: <CloudSyncOutlinedIcon fontSize="small" />,
          tooltip: "Saving…",
          color: "#5f6368",
        };
      case "saved":
        return {
          icon: <CloudDoneOutlinedIcon fontSize="small" />,
          tooltip: "All changes saved",
          color: "#1a73e8",
        };
      case "offline":
        return {
          icon: <CloudOffOutlinedIcon fontSize="small" />,
          tooltip: "Couldn't save — check your connection",
          color: "#d93025",
        };
      case "idle":
      default:
        return {
          icon: <CloudDoneOutlinedIcon fontSize="small" />,
          tooltip: "All changes saved to your account",
          color: "#5f6368",
        };
    }
  }, [saveState]);

  return (
    <Tooltip title={tooltip} placement="bottom">
      <span className={styles.iconButton} aria-label={tooltip} style={{ color }}>
        {icon}
      </span>
    </Tooltip>
  );
}

export function TopBar() {
  const router = useRouter();
  const deckId = useEditorDeckId();
  const { deck, commentsPanelOpen } = useEditorState();
  const { renameDeck, toggleCommentsPanel } = useEditorActions();
  const renameMutation = useRenamePresentation();
  const insertImage = useInsertImage();
  const unreadCommentCount = useTotalUnresolvedCount();
  const [shareOpen, setShareOpen] = useState(false);
  const [nameVersionOpen, setNameVersionOpen] = useState(false);
  const [versionToast, setVersionToast] = useState<string | null>(null);
  const createVersionMutation = useCreateVersion(deckId);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideFileInputRef = useRef<HTMLInputElement>(null);
  const { run: importPptx, status: importStatus } = useImportPptx();
  const [importToast, setImportToast] = useState<string | null>(null);

  const handleBlur = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      renameMutation.mutate({ id: deckId, title: trimmed });
    },
    [renameMutation, deckId],
  );

  const menuActions = useMenuActions({
    onRenameFocus: () => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    },
    onPickImageFile: () => fileInputRef.current?.click(),
    onPickSlideFile: () => slideFileInputRef.current?.click(),
    onOpenShare: () => setShareOpen(true),
    onOpenNameVersion: () => setNameVersionOpen(true),
  });

  const handleSubmitVersionName = useCallback(
    (label: string) => {
      createVersionMutation.mutate(
        { label },
        {
          onSuccess: () => {
            setNameVersionOpen(false);
            setVersionToast(`Saved version "${label}"`);
          },
          onError: (err) => {
            setVersionToast(
              err instanceof Error ? err.message : "Failed to save version",
            );
          },
        },
      );
    },
    [createVersionMutation],
  );

  const handleSlideFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const result = await importPptx(file);
      setImportToast(buildToastMessage(result));
    },
    [importPptx],
  );

  return (
    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <SlidesLogoLink />
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <input
              ref={titleInputRef}
              className={styles.titleInput}
              value={deck.meta.title}
              size={Math.min(Math.max(deck.meta.title.length || 5, 5), 30)}
              onChange={(e) => renameDeck(e.target.value)}
              onBlur={(e) => handleBlur(e.target.value)}
              aria-label="Presentation title"
            />
            <button className={styles.iconButton} title="Star" aria-label="Star">
              <StarBorderRoundedIcon fontSize="small" />
            </button>
            <button className={styles.iconButton} title="Move" aria-label="Move">
              <DriveFileMoveOutlinedIcon fontSize="small" />
            </button>
            <SaveStatusIndicator />
          </div>
          <MenuBar actions={menuActions} />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImage(file);
            e.target.value = "";
          }}
        />
        <input
          ref={slideFileInputRef}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          style={{ display: "none" }}
          onChange={handleSlideFileChange}
        />
        {importStatus === "parsing" && (
          <Tooltip title="Importing slides…" placement="bottom">
            <span
              className={styles.iconButton}
              aria-label="Importing slides"
              style={{ color: "#1a73e8" }}
            >
              <CircularProgress size={16} thickness={5} color="inherit" />
            </span>
          </Tooltip>
        )}
      </div>

      <div />

      <div className={styles.topRight}>
        <Tooltip title="Version history" placement="bottom">
          <button
            className={styles.iconButton}
            aria-label="Version history"
            onClick={() => router.push(`/presentation/d/${deckId}/history`)}
          >
            <HistoryOutlinedIcon fontSize="small" />
          </button>
        </Tooltip>
        <Tooltip
          title={commentsPanelOpen ? "Close comments" : "Open comments"}
          placement="bottom"
        >
          <button
            className={`${styles.iconButton} ${commentStyles.topBarCommentBtn}`}
            aria-label="Comments"
            aria-pressed={commentsPanelOpen}
            onClick={toggleCommentsPanel}
          >
            <ChatBubbleOutlineOutlinedIcon fontSize="small" />
            {unreadCommentCount > 0 && (
              <span
                className={commentStyles.topBarBadge}
                aria-label={`${unreadCommentCount} unresolved`}
              >
                {unreadCommentCount > 99 ? "99+" : unreadCommentCount}
              </span>
            )}
          </button>
        </Tooltip>
        <button className={styles.iconButton} aria-label="Present with camera">
          <VideocamOutlinedIcon fontSize="small" />
        </button>
        <SlideshowButton />
        <ShareButton deckId={deckId} />
        <button className={styles.iconButton} aria-label="AI assistant">
          <AutoAwesomeIcon fontSize="small" />
        </button>
        <UserAvatar size={32} />
      </div>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        deckId={deckId}
      />
      <NameVersionDialog
        open={nameVersionOpen}
        title="Name current version"
        submitLabel="Save"
        busy={createVersionMutation.isPending}
        onClose={() => setNameVersionOpen(false)}
        onSubmit={handleSubmitVersionName}
      />
      <Snackbar
        open={importToast !== null}
        autoHideDuration={5000}
        onClose={() => setImportToast(null)}
        message={importToast ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
      <Snackbar
        open={versionToast !== null}
        autoHideDuration={4000}
        onClose={() => setVersionToast(null)}
        message={versionToast ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </header>
  );
}
