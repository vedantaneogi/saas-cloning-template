# Deck JSONB content schema

The `decks.content` and `presentation_versions.content` columns are Postgres `JSONB` and store the full presentation tree (slides, elements, styling, comments) as a single nested object.

The canonical shape is the TypeScript `Deck` type at [`apps/web/src/features/editor/model/types.ts`](../apps/web/src/features/editor/model/types.ts). This document mirrors that file and is the human-readable reference for the same shape — when the two disagree, the TS type wins. Bumping the shape in a backwards-incompatible way must increment `meta.schemaVersion` and ship an alembic-side migration if any indexed JSON paths are added.

---

## Top level — `Deck`

```ts
type Deck = {
  id: string;            // matches decks.id (UUID, set on first persist)
  meta: DeckMeta;
  slides: Slide[];
  comments?: Comment[];  // optional; absent on freshly-created decks
};
```

| Field      | Type        | Required | Notes |
|------------|-------------|----------|-------|
| `id`       | string      | yes      | String form of the row's UUID. Filled in by the backend on create/seed. |
| `meta`     | `DeckMeta`  | yes      | Deck-level configuration; see below. |
| `slides`   | `Slide[]`   | yes      | Ordered. Empty array allowed; rendering shows an empty deck. |
| `comments` | `Comment[]` | no       | All deck comments live here in a flat list, keyed to a slide via `slideId`. |

---

## `DeckMeta`

```ts
type DeckMeta = {
  title: string;
  themeId: string;
  pageWidth: number;
  pageHeight: number;
  schemaVersion: number;
  master?: DeckMaster;
};

type DeckMaster = {
  titleText?: string;
  footer?: string;
  showSlideNumber?: boolean;
  showDate?: boolean;
};
```

| Field           | Type         | Required | Notes |
|-----------------|--------------|----------|-------|
| `title`         | string       | yes      | Mirrors `decks.title` — the renamer keeps both sides in sync. |
| `themeId`       | string       | yes      | Theme key. `"default"` ships out of the box. |
| `pageWidth`     | number       | yes      | Canvas width in CSS pixels. Default `960`. |
| `pageHeight`    | number       | yes      | Canvas height in CSS pixels. Default `540`. |
| `schemaVersion` | integer      | yes      | Bump on incompatible JSONB changes. Currently `1`. |
| `master`        | `DeckMaster` | no       | Optional master-slide settings (footer, slide number, etc.). |

---

## `Slide`

```ts
type Slide = {
  id: string;
  layoutId: string;
  background: SlideBackground;
  elements: SlideElement[];
  notes?: string;
};
```

| Field        | Type              | Required | Notes |
|--------------|-------------------|----------|-------|
| `id`         | string            | yes      | Stable across renames/moves. Used by comments to anchor. |
| `layoutId`   | string            | yes      | Layout key — `"title"`, `"blank"`, etc. Only `"title"` and `"blank"` are seeded. |
| `background` | `SlideBackground` | yes      | One of three variants below. |
| `elements`   | `SlideElement[]`  | yes      | Z-ordered by element `z` field, lowest first. |
| `notes`      | string            | no       | Speaker notes (plain text). |

---

## `SlideBackground`

Tagged union. The `kind` field discriminates.

```ts
type SlideBackground =
  | { kind: "solid"; color: string }   // CSS color string
  | { kind: "image"; src: string }     // image URL
  | { kind: "theme" };                 // inherit theme background
```

---

## `SlideElement`

All elements share a base shape:

```ts
type BaseElement = {
  id: string;
  x: number;       // CSS pixels from slide origin
  y: number;
  w: number;       // width
  h: number;       // height
  rotation?: number; // degrees, default 0
  z: number;       // paint order, lowest first
  locked?: boolean; // editor-only flag
};
```

The `type` field discriminates one of five variants:

### `text`
```ts
type TextElement = BaseElement & {
  type: "text";
  text: TextBlock;
};

type TextBlock = {
  align?: "left" | "center" | "right" | "justify";
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  placeholder?: string;
  initialHtml?: string;   // initial HTML rendered before live editing kicks in
  contentJson?: unknown;  // ProseMirror JSON projection of the live Y.XmlFragment
};
```

`text.contentJson` is the authoritative source for inline formatting (bold, italic, links). When absent, render `text.initialHtml`. When both are absent, render `text.placeholder`.

### `shape`
```ts
type ShapeElement = BaseElement & {
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "arrow";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;        // corner radius for rect
  text?: TextBlock;       // optional inner text (only honored for closed shapes)
};
```

### `image`
```ts
type ImageElement = BaseElement & {
  type: "image";
  src: string;            // URL
  alt?: string;
  crop?: { x: number; y: number; w: number; h: number }; // 0..1 fractions of source
};
```

### `table`
```ts
type TableElement = BaseElement & {
  type: "table";
  rows: number;
  cols: number;
  colRatios: number[];    // length === cols, sum ≈ 1
  rowRatios: number[];    // length === rows, sum ≈ 1
  cells: TableCell[];
  style: TableStyle;
};

type TableCell = {
  id: string;
  row: number;            // 0-based
  col: number;            // 0-based
  contentJson?: unknown;  // ProseMirror JSON for cell text
};

type TableStyle = {
  headerEnabled?: boolean;
  headerFill?: string;
  headerBold?: boolean;
  zebraEnabled?: boolean;
  zebraFill?: string;
  borderColor?: string;
  borderWidth?: number;
  tableFill?: string;
};
```

### `chart`
```ts
type ChartElement = BaseElement & {
  type: "chart";
  chartKind: "pie" | "bar";
  data: { id: string; label: string; value: number }[];
  style: {
    colors?: string[];
    showLegend?: boolean;
    showValues?: boolean;
    orientation?: "vertical" | "horizontal"; // bar charts only
    title?: string;
  };
};
```

---

## `Comment`

```ts
type Comment = {
  id: string;
  slideId: string;       // anchor — must match an existing Slide.id
  authorId: string;
  authorName: string;
  authorPicture: string | null;
  text: string;
  createdAt: number;     // epoch milliseconds
  updatedAt: number | null;
  resolvedAt: number | null;
  resolvedByName: string | null;
};
```

Stored at the deck level (`Deck.comments`) rather than nested under a slide so re-anchoring is cheap.

---

## Worked example

A minimal but complete deck exercising text, shape, image, and chart elements across two slides:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "meta": {
    "title": "Demo deck",
    "themeId": "default",
    "pageWidth": 960,
    "pageHeight": 540,
    "schemaVersion": 1
  },
  "slides": [
    {
      "id": "slide-1",
      "layoutId": "title",
      "background": { "kind": "theme" },
      "elements": [
        {
          "id": "el-title",
          "type": "text",
          "x": 80, "y": 200, "w": 800, "h": 100, "z": 1,
          "text": {
            "align": "center",
            "fontSize": 44,
            "color": "#202124",
            "initialHtml": "<p>Demo deck</p>"
          }
        }
      ]
    },
    {
      "id": "slide-2",
      "layoutId": "blank",
      "background": { "kind": "solid", "color": "#ffffff" },
      "elements": [
        {
          "id": "el-rect",
          "type": "shape",
          "x": 60, "y": 60, "w": 240, "h": 160, "z": 1,
          "shape": "rect",
          "fill": "#1a73e8",
          "radius": 12
        },
        {
          "id": "el-image",
          "type": "image",
          "x": 320, "y": 60, "w": 220, "h": 160, "z": 2,
          "src": "https://placehold.co/440x320/png",
          "alt": "Example",
          "crop": { "x": 0, "y": 0, "w": 1, "h": 1 }
        },
        {
          "id": "el-pie",
          "type": "chart",
          "x": 60, "y": 260, "w": 480, "h": 240, "z": 3,
          "chartKind": "pie",
          "data": [
            { "id": "p-1", "label": "A", "value": 60 },
            { "id": "p-2", "label": "B", "value": 40 }
          ],
          "style": { "showLegend": true, "showValues": true }
        }
      ]
    }
  ]
}
```

To create a deck with this content, `POST /presentations` and then `PATCH /presentations/{id}` with `{ "title": "Demo deck", "content": <object above> }`. Or use `POST /admin/seed` to load the canned fixture in [`apps/api/app/admin/seeds.py`](../apps/api/app/admin/seeds.py), which exercises every variant.

---

## Versioning

`presentation_versions.content` is the same shape, snapshotted at a point in time. The `version_number` column orders snapshots; `label` is an optional human-readable name (e.g. `"Initial seed snapshot"`). The auto-versioner in [`apps/api/app/presentations/service.py`](../apps/api/app/presentations/service.py) creates an unlabeled snapshot at most every 30 seconds during edits.
