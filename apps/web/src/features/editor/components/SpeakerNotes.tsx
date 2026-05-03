"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { useEditorActions } from "../state/EditorContext";
import styles from "../editor.module.css";

export function SpeakerNotes() {
  const { addSlide } = useEditorActions();
  return (
    <footer className={styles.notes}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button className={styles.iconButton} aria-label="Grid view">
          <GridViewRoundedIcon fontSize="small" />
        </button>
        <button className={styles.iconButton} aria-label="Collapse notes">
          <KeyboardArrowLeftRoundedIcon fontSize="small" />
        </button>
      </div>
      <div className={styles.notesMid}>
        <button
          className={styles.newSlidePill}
          onClick={addSlide}
          aria-label="Create a slide"
        >
          <AutoAwesomeRoundedIcon fontSize="small" />
          <span>Create a slide</span>
          <AddRoundedIcon fontSize="small" />
        </button>
        <span className={styles.notesText}>Click to add speaker notes</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className={styles.iconButton} aria-label="Expand notes">
          <KeyboardArrowDownRoundedIcon fontSize="small" />
        </button>
      </div>
    </footer>
  );
}
