/**
 * Deck model — thin, local mirror of what will live in `packages/schema`
 * (zod + TS) once P1 lands. Intentionally structural only: nothing in this
 * file knows about Yjs, persistence, or rendering. When we swap the editor
 * store to a Yjs-backed provider in P3/P7, these types stay the same —
 * only the mutation layer changes.
 */

export type ElementId = string;
export type SlideId = string;

export type ElementType = "text" | "shape" | "image" | "table" | "chart";

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export type ChartKind = "pie" | "bar";

/**
 * Block-level defaults for a text element. Inline formatting (bold, italic,
 * links, etc.) lives inside the element's Y.XmlFragment, accessed via the
 * DocProvider — not in this plain schema.
 */
export type TextBlock = {
  align?: "left" | "center" | "right" | "justify";
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  placeholder?: string;
  initialHtml?: string;
  // ProseMirror JSON projection of the Y.XmlFragment at save-time.
  // Authoritative for persistence + static thumbnail rendering.
  contentJson?: unknown;
};

export type BaseElement = {
  id: ElementId;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z: number;
  locked?: boolean;
};

export type TextElement = BaseElement & {
  type: "text";
  text: TextBlock;
};

export type ShapeElement = BaseElement & {
  type: "shape";
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  // Optional editable text rendered inside the shape. Only meaningful for
  // closed shapes (rect, ellipse); lines/arrows ignore it.
  text?: TextBlock;
};

/**
 * `crop` is stored as normalized fractions of the source image (0..1). A value
 * of {x:0, y:0, w:1, h:1} (or undefined) means the full image is shown. The
 * rendered element occupies (x, y, w, h) on the slide — the crop rectangle
 * scales to fill it.
 */
export type ImageCrop = { x: number; y: number; w: number; h: number };

export type ImageElement = BaseElement & {
  type: "image";
  src: string;
  alt?: string;
  crop?: ImageCrop;
};

export type TableStyle = {
  headerEnabled?: boolean;
  headerFill?: string;
  headerBold?: boolean;
  zebraEnabled?: boolean;
  zebraFill?: string;
  borderColor?: string;
  borderWidth?: number;
  tableFill?: string;
};

export type TableCell = {
  id: string;
  row: number;
  col: number;
  contentJson?: unknown;
};

export type TableElement = BaseElement & {
  type: "table";
  rows: number;
  cols: number;
  colRatios: number[];
  rowRatios: number[];
  cells: TableCell[];
  style: TableStyle;
};

export type LegacyTableElement = BaseElement & {
  type: "table";
  style: TableStyle;
  rows?: number;
  cols?: number;
  contentJson?: unknown;
};

export type ChartDataPoint = {
  id: string;
  label: string;
  value: number;
};

export type ChartStyle = {
  colors?: string[];
  showLegend?: boolean;
  showValues?: boolean;
  orientation?: "vertical" | "horizontal";
  title?: string;
};

export type ChartElement = BaseElement & {
  type: "chart";
  chartKind: ChartKind;
  data: ChartDataPoint[];
  style: ChartStyle;
};

export type SlideElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | TableElement
  | ChartElement;

export type SlideBackground =
  | { kind: "solid"; color: string }
  | { kind: "image"; src: string }
  | { kind: "theme" };

export type Slide = {
  id: SlideId;
  layoutId: string;
  background: SlideBackground;
  elements: SlideElement[];
  notes?: string;
};

export type DeckMaster = {
  titleText?: string;
  footer?: string;
  showSlideNumber?: boolean;
  showDate?: boolean;
};

export type DeckMeta = {
  title: string;
  themeId: string;
  pageWidth: number;
  pageHeight: number;
  schemaVersion: number;
  master?: DeckMaster;
};

export type CommentId = string;

export type Comment = {
  id: CommentId;
  slideId: SlideId;
  authorId: string;
  authorName: string;
  authorPicture: string | null;
  text: string;
  createdAt: number;
  updatedAt: number | null;
  resolvedAt: number | null;
  resolvedByName: string | null;
};

export type Deck = {
  id: string;
  meta: DeckMeta;
  slides: Slide[];
  comments?: Comment[];
};

export type ToolMode =
  | "select"
  | "text"
  | "shape"
  | "line"
  | "image"
  | "comment";

export type Selection = {
  slideId: SlideId | null;
  elementIds: ElementId[];
};
