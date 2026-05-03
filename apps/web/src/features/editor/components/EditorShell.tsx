"use client";

import { useCallback } from "react";
import { TopBar } from "./TopBar";
import { TopBarReadOnly } from "./TopBarReadOnly";
import { Toolbar } from "./Toolbar";
import { SlideSidebar } from "./SlideSidebar";
import { SlideCanvas } from "./SlideCanvas";
import { PresenterShell } from "./PresenterShell";
import { UndoableToast } from "./UndoableToast";
import { InsertingChartToast } from "./InsertingChartToast";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useAutoSave } from "../hooks/useAutoSave";
import { useEditorActions, useEditorState, useSetSaveState } from "../state/EditorContext";
import { CommentsPanel } from "../comments";
import { HeaderFooterDialog } from "./HeaderFooterDialog";
import { PageSetupDialog } from "./PageSetupDialog";
import styles from "../editor.module.css";

function AutoSaveController() {
  const setSaveState = useSetSaveState();
  useAutoSave(setSaveState);
  return null;
}

export function EditorShell() {
  const { presenting, commentsPanelOpen, readOnly, headerFooterDialogOpen, pageSetupDialogOpen, deck } = useEditorState();
  const { closeHeaderFooterDialog, updateMaster, closePageSetupDialog, setPageSize } = useEditorActions();
  const bindShortcuts = useKeyboardShortcuts();
  const setShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return bindShortcuts(null);
      node.focus();
      return bindShortcuts(node);
    },
    [bindShortcuts],
  );

  if (presenting) {
    return (
      <>
        {!readOnly && <AutoSaveController />}
        <PresenterShell />
      </>
    );
  }

  const showCommentsPanel = commentsPanelOpen && !readOnly;

  return (
    <div
      ref={setShellRef}
      tabIndex={-1}
      className={`${styles.shell}${
        showCommentsPanel ? ` ${styles.shellWithComments}` : ""
      }${readOnly ? ` ${styles.shellReadOnly}` : ""}`}
      style={{ outline: "none" }}
    >
      {!readOnly && <AutoSaveController />}
      {readOnly ? <TopBarReadOnly /> : <TopBar />}
      {!readOnly && <Toolbar />}
      <div className={styles.body}>
        <SlideSidebar />
        <div className={styles.workspace}>
          <SlideCanvas />
        </div>
      </div>
      {showCommentsPanel && <CommentsPanel />}
      <UndoableToast />
      <InsertingChartToast />
      {headerFooterDialogOpen && (
        <HeaderFooterDialog
          initialMaster={deck.meta.master}
          onApply={updateMaster}
          onClose={closeHeaderFooterDialog}
        />
      )}
      {pageSetupDialogOpen && (
        <PageSetupDialog
          initialWidth={deck.meta.pageWidth}
          initialHeight={deck.meta.pageHeight}
          onApply={setPageSize}
          onClose={closePageSetupDialog}
        />
      )}
    </div>
  );
}
