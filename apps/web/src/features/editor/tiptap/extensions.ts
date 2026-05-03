/**
 * Shared Tiptap extension builder for text elements.
 *
 * StarterKit's History is disabled because y-prosemirror + our top-level
 * Y.UndoManager own the undo stack. Collaboration binds the editor to a
 * Y.XmlFragment that lives inside the element's Y.Map.
 */

import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
} from "@tiptap/extension-text-style";
import { Link } from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Collaboration } from "@tiptap/extension-collaboration";
import type * as Y from "yjs";
import { getSchema, type AnyExtension } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

export type TiptapExtensionOptions = {
  fragment: Y.XmlFragment;
  placeholder?: string;
};

function buildSchemaExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      undoRedo: false,
      link: false,
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    LineHeight,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    Highlight.configure({ multicolor: true }),
  ];
}

export function buildTextExtensions({
  fragment,
  placeholder,
}: TiptapExtensionOptions): AnyExtension[] {
  return [
    ...buildSchemaExtensions(),
    Placeholder.configure({
      placeholder: placeholder ?? "",
      emptyEditorClass: "is-editor-empty",
      showOnlyWhenEditable: false,
      showOnlyCurrent: false,
    }),
    Collaboration.configure({
      fragment,
    }),
  ];
}

let _textSchema: Schema | null = null;

export function getTextSchema(): Schema {
  if (_textSchema) return _textSchema;
  _textSchema = getSchema(buildSchemaExtensions());
  return _textSchema;
}

/**
 * Per-cell editor schema — paragraphs + inline text marks. Lists, headings,
 * code blocks, quotes, rules and the Tiptap table extensions are all
 * intentionally omitted: cells are short prose, not nested documents, and the
 * table geometry is owned by the outer CSS grid, not ProseMirror.
 */
function buildTableCellSchemaExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      undoRedo: false,
      link: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    LineHeight,
    TextAlign.configure({
      types: ["paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),
    Highlight.configure({ multicolor: true }),
  ];
}

export function buildTableCellExtensions({
  fragment,
}: {
  fragment: Y.XmlFragment;
}): AnyExtension[] {
  return [
    ...buildTableCellSchemaExtensions(),
    Collaboration.configure({ fragment }),
  ];
}

let _tableCellSchema: Schema | null = null;

export function getTableCellSchema(): Schema {
  if (_tableCellSchema) return _tableCellSchema;
  _tableCellSchema = getSchema(buildTableCellSchemaExtensions());
  return _tableCellSchema;
}

export const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "Google Sans", value: "Google Sans, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Courier New", value: "Courier New, monospace" },
] as const;

export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];
