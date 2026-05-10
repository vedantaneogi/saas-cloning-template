export type FieldType =
  | "signature"
  | "initial"
  | "date_signed"
  | "name"
  | "email"
  | "company"
  | "title"
  | "text"
  | "number"
  | "checkbox"
  | "dropdown"
  | "radio"
  | "approve"
  | "decline"
  | "stamp"
  | "note"
  | "formula"
  | "attachment"
  | "drawing"
  | "payment";

export interface PlacedField {
  id: string;
  type: FieldType;
  recipientId: string;
  documentId?: string;
  page: number;
  x: number; // % from left of page
  y: number; // % from top of page
  width: number; // % of page width
  height: number; // % of page height
  required: boolean;
  label?: string;
  value?: string;
  options?: string[];
  groupName?: string;
  /** Feature: Conditional Fields — ID of the field that controls this field's visibility */
  conditionalOn?: string;
  /** Feature: Conditional Fields — the value the parent field must have for the action to trigger */
  conditionalValue?: string;
  /** Feature: Conditional Fields — "show" (default) or "hide" this field when the condition matches */
  conditionalAction?: "show" | "hide";
  /** Feature: Calculated Fields — formula string referencing other field labels, e.g. "[Price] * [Qty]" */
  formula?: string;
  /** Feature: Calculated Fields — number of decimal places to display (0-5, default 2) */
  decimalPlaces?: number;
  /** Feature: Payment Fields — the amount in cents set by the sender (e.g. 2999 = $29.99) */
  paymentAmount?: number;
  /** Feature: Payment Fields — ISO 4217 currency code, default "USD" */
  paymentCurrency?: string;
  /** Feature: Payment Fields — description shown on the payment card */
  paymentDescription?: string;
}

export interface EditorRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  order: number;
  color: string;
}

export interface EditorDocument {
  id: string;
  name: string;
  fileUrl?: string;
  pageCount: number;
}

export interface EditorState {
  envelopeId: string;
  documents: EditorDocument[];
  recipients: EditorRecipient[];
  fields: PlacedField[];
  selectedFieldId: string | null;
  activeRecipientId: string | null;
  currentPage: number;
  zoom: number;
  activeTool: FieldType | "select";
  /** Undo stack — snapshots of fields[] */
  _past?: PlacedField[][];
  /** Redo stack — snapshots of fields[] */
  _future?: PlacedField[][];
}

export type EditorAction =
  | { type: "ADD_FIELD"; field: PlacedField }
  | { type: "UPDATE_FIELD"; id: string; updates: Partial<PlacedField> }
  | { type: "REMOVE_FIELD"; id: string }
  | { type: "SELECT_FIELD"; id: string | null }
  | { type: "SET_ACTIVE_RECIPIENT"; id: string }
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_FIELDS"; fields: PlacedField[] }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_TOOL"; tool: FieldType | "select" }
  | { type: "UNDO" }
  | { type: "REDO" };

export const FIELD_LABELS: Record<FieldType, string> = {
  signature: "Signature",
  initial: "Initial",
  date_signed: "Date Signed",
  name: "Name",
  email: "Email",
  company: "Company",
  title: "Title",
  text: "Text",
  number: "Number",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  radio: "Radio",
  approve: "Approve",
  decline: "Decline",
  stamp: "Stamp",
  note: "Note",
  formula: "Formula",
  attachment: "Attachment",
  drawing: "Drawing",
  payment: "Payment",
};

export const FIELD_ICONS: Record<FieldType, string> = {
  signature: "✍",
  initial: "I",
  date_signed: "📅",
  name: "N",
  email: "@",
  company: "C",
  title: "Tt",
  text: "T",
  number: "#",
  checkbox: "☑",
  dropdown: "▾",
  radio: "◉",
  approve: "✓",
  decline: "✗",
  stamp: "S",
  note: "✎",
  formula: "ƒ",
  attachment: "📎",
  drawing: "✏",
  payment: "$",
};

export const FIELD_DEFAULT_SIZES: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 22, h: 8 },
  initial: { w: 11, h: 6 },
  date_signed: { w: 18, h: 5 },
  name: { w: 22, h: 5 },
  email: { w: 22, h: 5 },
  company: { w: 22, h: 5 },
  title: { w: 18, h: 5 },
  text: { w: 22, h: 5 },
  number: { w: 18, h: 5 },
  checkbox: { w: 4, h: 4 },
  dropdown: { w: 22, h: 5 },
  radio: { w: 4, h: 4 },
  approve: { w: 16, h: 6 },
  decline: { w: 16, h: 6 },
  stamp: { w: 16, h: 8 },
  note: { w: 22, h: 5 },
  formula: { w: 22, h: 5 },
  attachment: { w: 22, h: 6 },
  drawing: { w: 22, h: 10 },
  payment: { w: 26, h: 14 },
};

export interface FieldPaletteCategory {
  label: string;
  fields: FieldType[];
}

export const FIELD_PALETTE_CATEGORIES: FieldPaletteCategory[] = [
  {
    label: "Signature",
    fields: ["signature", "initial", "date_signed"],
  },
  {
    label: "Contact Information",
    fields: ["name", "email", "company", "title"],
  },
  {
    label: "Inputs",
    fields: ["text", "number", "checkbox", "dropdown", "radio"],
  },
  {
    label: "Actions",
    fields: ["approve", "decline", "stamp"],
  },
  {
    label: "Other",
    fields: ["note", "formula", "attachment", "drawing", "payment"],
  },
];
