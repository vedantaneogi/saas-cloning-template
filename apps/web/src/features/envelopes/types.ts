export type EnvelopeStatus =
  | "completed"
  | "sent"
  | "draft"
  | "voided"
  | "declined"
  | "waiting"
  | "delivered";

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
  order: number;
  status: "completed" | "sent" | "waiting" | "declined";
  signedAt?: string;
  color?: string;
  signing_token?: string;
}

export interface EnvelopeDocument {
  id: string;
  name: string;           // normalized from original_filename
  original_filename: string;
  filename: string;       // stored UUID filename
  pageCount: number;
  page_count?: number;    // raw API field alias
  fileUrl?: string;
}

export interface Envelope {
  id: string;
  subject: string;
  status: EnvelopeStatus;
  from: string;
  fromEmail: string;
  sentAt?: string;
  lastModified: string;
  completedAt?: string;
  expiresAt?: string;
  recipients: Recipient[];
  documents: EnvelopeDocument[];
  message?: string;
}

export interface EnvelopeListParams {
  filter?: string;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
  dateRange?: string;
  sender?: string;
}

export interface PaginatedEnvelopes {
  items: Envelope[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export type FieldType =
  | "signature"
  | "initial"
  | "date_signed"
  | "text"
  | "checkbox"
  | "dropdown"
  | "radio"
  | "attachment";

export interface Field {
  id: string;
  type: FieldType;
  recipientId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label?: string;
  value?: string;
  options?: string[];
}
