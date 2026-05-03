/**
 * Arrow geometry — pure math for rendering a horizontal arrow inside the
 * element's local coordinate space (0,0) to (w,h). Rotation is applied at the
 * SVG container level by the renderer, so we draw in local space only.
 *
 * The arrow is drawn left→right along the vertical midline. Shaft is a line,
 * head is a filled triangle whose length scales with stroke width but is
 * clamped so it never swallows the whole shape.
 */

export type ArrowPaths = {
  shaftX1: number;
  shaftY1: number;
  shaftX2: number;
  shaftY2: number;
  head: string;
  headLen: number;
};

export function computeArrow(
  w: number,
  h: number,
  strokeWidth: number,
): ArrowPaths {
  const safeW = Math.max(2, w);
  const safeH = Math.max(2, h);
  const sw = Math.max(1, strokeWidth);
  const headLen = Math.min(Math.max(sw * 3.5, 8), safeW * 0.45);
  const headHalf = Math.min(Math.max(sw * 2.2, 5), safeH * 0.5);

  const midY = safeH / 2;
  const tipX = safeW;
  const baseX = safeW - headLen;

  return {
    shaftX1: 0,
    shaftY1: midY,
    shaftX2: baseX,
    shaftY2: midY,
    head: `M ${baseX} ${midY - headHalf} L ${tipX} ${midY} L ${baseX} ${midY + headHalf} Z`,
    headLen,
  };
}
