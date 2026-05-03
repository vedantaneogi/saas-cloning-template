/**
 * Slide coordinates are stored in CSS pixels (96 px = 1 inch), matching the
 * pptx export (see features/editor/export/exportPptx.ts) and the pptx import
 * (see features/editor/import/pptxUnits.ts). Inspector UIs that accept user
 * input in cm/inches convert through these helpers so values round-trip
 * losslessly through export.
 */

export type LengthUnit = "cm" | "in";

export const PX_PER_INCH = 96;
export const CM_PER_INCH = 2.54;
export const PX_PER_CM = PX_PER_INCH / CM_PER_INCH;

export const pxToUnit = (px: number, unit: LengthUnit): number =>
  unit === "cm" ? px / PX_PER_CM : px / PX_PER_INCH;

export const unitToPx = (value: number, unit: LengthUnit): number =>
  unit === "cm" ? value * PX_PER_CM : value * PX_PER_INCH;

export const formatUnit = (px: number, unit: LengthUnit): string =>
  pxToUnit(px, unit).toFixed(2);

export const unitLabel = (unit: LengthUnit): string =>
  unit === "cm" ? "cm" : "in";
