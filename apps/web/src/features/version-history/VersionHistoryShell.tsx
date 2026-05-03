"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";

import { usePresentation } from "@/features/presentations/hooks";
import { SlideThumbnail } from "@/features/editor/components/SlideThumbnail";
import type { Deck, Slide } from "@/features/editor/model/types";

import { VersionList } from "./VersionList";
import { NameVersionDialog } from "./NameVersionDialog";
import {
  useNameVersion,
  useRestoreVersion,
  useVersion,
  useVersions,
} from "./hooks";
import type { VersionSummary } from "./types";
import styles from "./version-history.module.css";

type Props = { deckId: string };

function pickSlide(
  deck: Deck | null | undefined,
  slideIndex: number,
): Slide | null {
  if (!deck || !deck.slides || deck.slides.length === 0) return null;
  const idx = Math.min(Math.max(slideIndex, 0), deck.slides.length - 1);
  return deck.slides[idx] ?? null;
}

export function VersionHistoryShell({ deckId }: Props) {
  const router = useRouter();
  const presentationQuery = usePresentation(deckId);
  const versionsQuery = useVersions(deckId);
  const versions = versionsQuery.data ?? [];

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [nameDialog, setNameDialog] = useState<{
    mode: "rename";
    version: VersionSummary;
  } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<VersionSummary | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const selectedVersionQuery = useVersion(deckId, selectedVersionId);
  const nameMutation = useNameVersion(deckId);
  const restoreMutation = useRestoreVersion(deckId);

  const deck: Deck | undefined =
    selectedVersionQuery.data?.content ??
    (presentationQuery.data?.content as Deck | undefined);

  const activeSlide = useMemo(
    () => pickSlide(deck, selectedSlideIndex),
    [deck, selectedSlideIndex],
  );

  const meta = deck?.meta;
  const pageWidth = meta?.pageWidth ?? 960;
  const pageHeight = meta?.pageHeight ?? 540;
  const themeId = meta?.themeId ?? "default";

  const title = presentationQuery.data?.title ?? "Presentation";
  const editCount = Math.max(versions.length - 1, 0);

  const handleBack = () => {
    router.push(`/presentation/d/${deckId}`);
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      setRestoreTarget(null);
      setToast("Version restored");
      router.push(`/presentation/d/${deckId}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to restore");
    }
  };

  const handleSubmitName = async (label: string) => {
    if (!nameDialog) return;
    try {
      await nameMutation.mutateAsync({
        versionId: nameDialog.version.id,
        label,
      });
      setNameDialog(null);
      setToast("Version renamed");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to rename");
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <IconButton
          size="small"
          aria-label="Back to editor"
          className={styles.backBtn}
          onClick={handleBack}
        >
          <ArrowBackOutlinedIcon fontSize="small" />
        </IconButton>
        <div className={styles.headerTitle}>{title}</div>
        <div className={styles.headerSpacer} />
        <div className={styles.editCounter}>
          Total: {editCount} edit{editCount === 1 ? "" : "s"}
        </div>
      </header>

      <section className={styles.canvasArea}>
        <div className={styles.canvasSidebar}>
          <div className={styles.thumbnailStrip}>
            {deck?.slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                className={styles.thumbnailItem}
                onClick={() => setSelectedSlideIndex(idx)}
              >
                <div className={styles.thumbnailIndex}>{idx + 1}</div>
                <div
                  className={`${styles.thumbnailFrame} ${
                    idx === selectedSlideIndex
                      ? styles.thumbnailFrameActive
                      : ""
                  }`}
                >
                  <SlideThumbnail
                    slide={slide}
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    themeId={themeId}
                  />
                </div>
              </button>
            ))}
          </div>
          <div className={styles.mainPreview}>
            <div className={styles.slideWrap}>
              {selectedVersionQuery.isLoading && !deck ? (
                <CircularProgress size={24} />
              ) : (
                <SlideThumbnail
                  slide={activeSlide}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  themeId={themeId}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <VersionList
        versions={versions}
        isLoading={versionsQuery.isLoading}
        selectedVersionId={selectedVersionId}
        highlightChanges={highlightChanges}
        onSelectVersion={(id) => {
          setSelectedVersionId(id);
          setSelectedSlideIndex(0);
        }}
        onToggleHighlight={setHighlightChanges}
        onRenameVersion={(version) => setNameDialog({ mode: "rename", version })}
        onRestoreVersion={(version) => setRestoreTarget(version)}
      />

      <NameVersionDialog
        open={!!nameDialog}
        title="Name this version"
        submitLabel="Save"
        initialValue={nameDialog?.version.label ?? ""}
        busy={nameMutation.isPending}
        onClose={() => setNameDialog(null)}
        onSubmit={handleSubmitName}
      />

      <Dialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Restore this version?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The current version will be replaced with the selected version.
            A snapshot of the current state will be saved in version history
            before restoring.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRestoreTarget(null)}
            disabled={restoreMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmRestore}
            disabled={restoreMutation.isPending}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </div>
  );
}
