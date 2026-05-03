export const EMU_PER_INCH = 914400;
export const PX_PER_INCH = 96;
export const EMU_PER_PX = EMU_PER_INCH / PX_PER_INCH; // 9525

export const emuToPx = (emu: number | string | null | undefined): number => {
  if (emu == null) return 0;
  const n = typeof emu === "string" ? Number(emu) : emu;
  return Number.isFinite(n) ? n / EMU_PER_PX : 0;
};

/** PPTX rotation attr is in 60,000ths of a degree. */
export const pptxRotToDeg = (rot: string | null | undefined): number | undefined => {
  if (rot == null) return undefined;
  const n = Number(rot);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return (n / 60000) % 360;
};

/** `<a:rPr sz>` attr is hundredths of a point. */
export const pptxFontSizePt = (sz: string | null | undefined): number | undefined => {
  if (sz == null) return undefined;
  const n = Number(sz);
  return Number.isFinite(n) && n > 0 ? n / 100 : undefined;
};

/**
 * PPTX srgbClr values have no `#` prefix; normalize to CSS hex. Preserves the
 * original case (uppercase/lowercase) of the hex digits so round-trip export
 * matches the author's input byte-for-byte.
 */
export const pptxColorToCss = (
  hex: string | null | undefined,
): string | undefined => {
  if (!hex) return undefined;
  const clean = hex.replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return undefined;
  return `#${clean}`;
};

/**
 * PPTX line spacing is `<a:spcPct val="115000"/>` where val is
 * thousandths of a percent. `115000` → 1.15.
 */
export const pptxLineSpacingToMultiple = (
  val: string | null | undefined,
): number | undefined => {
  if (val == null) return undefined;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n / 100000;
};
