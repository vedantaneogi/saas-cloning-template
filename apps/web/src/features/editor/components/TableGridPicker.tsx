"use client";

import { useCallback, useState } from "react";
import styles from "./tableGridPicker.module.css";

type Hover = { row: number; col: number };

const INITIAL_ROWS = 10;
const INITIAL_COLS = 10;
const MAX_ROWS = 20;
const MAX_COLS = 20;

export type TableGridPickerProps = {
  onSelect: (rows: number, cols: number) => void;
};

export function TableGridPicker({ onSelect }: TableGridPickerProps) {
  const [hover, setHover] = useState<Hover | null>(null);
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [cols, setCols] = useState(INITIAL_COLS);

  const handleEnter = useCallback(
    (r: number, c: number) => {
      setHover({ row: r, col: c });
      if (r >= rows - 1 && rows < MAX_ROWS) setRows((prev) => Math.min(MAX_ROWS, prev + 1));
      if (c >= cols - 1 && cols < MAX_COLS) setCols((prev) => Math.min(MAX_COLS, prev + 1));
    },
    [rows, cols],
  );

  const handleLeave = useCallback(() => setHover(null), []);

  const handleClick = useCallback(
    (r: number, c: number) => {
      onSelect(r + 1, c + 1);
    },
    [onSelect],
  );

  const label = hover
    ? `${hover.row + 1} × ${hover.col + 1}`
    : "Select size";

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const active = !!hover && r <= hover.row && c <= hover.col;
      cells.push(
        <button
          type="button"
          key={`${r}-${c}`}
          className={`${styles.cell} ${active ? styles.cellActive : ""}`}
          onMouseEnter={() => handleEnter(r, c)}
          onFocus={() => handleEnter(r, c)}
          onClick={() => handleClick(r, c)}
          aria-label={`${r + 1} by ${c + 1}`}
        />,
      );
    }
  }

  return (
    <div className={styles.wrap} onMouseLeave={handleLeave}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${cols}, var(--tbl-pick-size))` }}
      >
        {cells}
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
