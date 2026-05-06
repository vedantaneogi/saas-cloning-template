import { apiClient } from "@/lib/api-client";
import type { Envelope, EnvelopeListParams, PaginatedEnvelopes, Field, Recipient } from "./types";

export async function getEnvelopes(params: EnvelopeListParams = {}): Promise<PaginatedEnvelopes> {
  // Map frontend param names to backend query param names
  const { perPage, date_from, date_to, envelope_id, recipient_search, folder_id, ...rest } = params;
  const queryParams = {
    ...rest,
    ...(perPage != null ? { page_size: perPage } : {}),
    ...(date_from != null ? { date_from } : {}),
    ...(date_to != null ? { date_to } : {}),
    ...(envelope_id != null && envelope_id !== "" ? { envelope_id } : {}),
    ...(recipient_search != null && recipient_search !== "" ? { recipient_search } : {}),
    ...(folder_id != null && folder_id !== "" ? { folder_id } : {}),
  };
  const res = await apiClient.get("/envelopes", { params: queryParams });
  const raw = res.data;
  // Map backend snake_case fields to frontend camelCase Envelope shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (raw.items ?? []).map((item: any) => ({
    ...item,
    from: item.from ?? item.from_name ?? "",
    fromEmail: item.fromEmail ?? item.from_email ?? "",
    lastModified: item.lastModified ?? item.updated_at ?? item.created_at ?? "",
    sentAt: item.sentAt ?? item.sent_at ?? undefined,
    completedAt: item.completedAt ?? item.completed_at ?? undefined,
    expiresAt: item.expiresAt ?? item.expires_at ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipients: (item.recipients ?? []).map((r: any) => ({
      ...r,
      order: r.routing_order ?? r.order ?? 1,
      status: r.status === "signed" ? "completed" : r.status,
      signedAt: r.signed_at ?? r.signedAt ?? undefined,
    })),
    documents: item.documents ?? [],
  }));
  return {
    items,
    total: raw.total ?? 0,
    page: raw.page ?? 1,
    perPage: raw.page_size ?? raw.perPage ?? 25,
    pages: raw.pages ?? Math.max(1, Math.ceil((raw.total ?? 0) / (raw.page_size ?? 25))),
  };
}

export async function getEnvelope(id: string): Promise<Envelope> {
  const res = await apiClient.get(`/envelopes/${id}`);
  const raw = res.data;
  return {
    ...raw,
    // Map backend snake_case fields to frontend camelCase Envelope shape
    from: raw.from ?? raw.from_name ?? "",
    fromEmail: raw.fromEmail ?? raw.from_email ?? "",
    lastModified: raw.lastModified ?? raw.updated_at ?? raw.created_at ?? "",
    sentAt: raw.sentAt ?? raw.sent_at ?? undefined,
    completedAt: raw.completedAt ?? raw.completed_at ?? undefined,
    expiresAt: raw.expiresAt ?? raw.expires_at ?? undefined,
    documents: (raw.documents ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      name: (d.original_filename ?? d.filename ?? "") as string,
      pageCount: (d.page_count ?? d.pageCount ?? 1) as number,
    })),
    recipients: (raw.recipients ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      order: (r.routing_order ?? r.order ?? 1) as number,
      // Backend returns "signed"; frontend Recipient type uses "completed"
      status: (r.status === "signed" ? "completed" : r.status) as Recipient["status"],
      // Backend returns snake_case; frontend expects camelCase
      signedAt: (r.signed_at ?? r.signedAt) as string | undefined,
    })),
  };
}

export async function createEnvelope(data: {
  subject: string;
  message?: string;
  recipients: { name: string; email: string; role: string; order: number }[];
}): Promise<Envelope> {
  const res = await apiClient.post("/envelopes", data);
  return res.data;
}

export async function updateEnvelope(
  id: string,
  data: Partial<Envelope> & { reminder_days?: number; expires_at?: string },
): Promise<Envelope> {
  const res = await apiClient.put(`/envelopes/${id}`, data);
  return res.data;
}

export async function sendEnvelope(id: string): Promise<Envelope> {
  const res = await apiClient.post(`/envelopes/${id}/send`);
  return res.data;
}

export async function voidEnvelope(id: string, reason: string): Promise<Envelope> {
  const res = await apiClient.post(`/envelopes/${id}/void`, { reason });
  return res.data;
}

export async function deleteEnvelope(id: string): Promise<void> {
  await apiClient.delete(`/envelopes/${id}`);
}

export async function addRecipient(
  envelopeId: string,
  data: { name: string; email: string; role: string; routing_order: number; private_message?: string },
): Promise<Recipient> {
  const res = await apiClient.post(`/envelopes/${envelopeId}/recipients`, data);
  return res.data;
}

export async function updateRecipient(
  recipientId: string,
  data: { name?: string; email?: string; role?: string; routing_order?: number; private_message?: string },
): Promise<Recipient> {
  const res = await apiClient.put(`/recipients/${recipientId}`, data);
  return res.data;
}

export async function deleteRecipient(recipientId: string): Promise<void> {
  await apiClient.delete(`/recipients/${recipientId}`);
}

export async function downloadEnvelope(id: string): Promise<Blob> {
  const res = await apiClient.get(`/envelopes/${id}/download`, {
    responseType: "blob",
  });
  return res.data;
}

export async function resendEnvelope(id: string): Promise<void> {
  await apiClient.post(`/envelopes/${id}/resend`);
}

export async function downloadCertificate(id: string): Promise<Blob> {
  const res = await apiClient.get(`/envelopes/${id}/certificate`, {
    responseType: "blob",
  });
  return res.data;
}

export async function saveEnvelopeAsTemplate(
  id: string,
  name?: string,
): Promise<{ template_id: string }> {
  const res = await apiClient.post(`/envelopes/${id}/save-as-template`, { name });
  return res.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}`);
}

export async function uploadDocument(
  envelopeId: string,
  file: File,
): Promise<{ documentId: string; name: string; original_filename: string; filename: string; pageCount: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post(`/envelopes/${envelopeId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const d = res.data;
  return {
    documentId: d.id,
    name: d.original_filename ?? d.filename ?? file.name,
    original_filename: d.original_filename ?? file.name,
    filename: d.filename ?? "",
    pageCount: d.page_count ?? 1,
  };
}

export async function getFields(envelopeId: string): Promise<Field[]> {
  const res = await apiClient.get(`/envelopes/${envelopeId}/fields`);
  return res.data;
}

/** UUID v4 pattern — used to distinguish real DB ids from temp client ids like "field_1234_abc" */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveFields(envelopeId: string, fields: Field[]): Promise<Field[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (fields as any[]).map((f: any) => {
    const rawId: string | undefined = f.id;
    // If the ID is a temp client-generated string (not a UUID), send null so the
    // backend treats this as a new field (INSERT).  Real persisted UUIDs are kept
    // so the backend performs an UPDATE / upsert.
    const id = rawId && UUID_REGEX.test(rawId) ? rawId : null;

    // document_id: prefer camelCase field, fall back to snake_case.  If still
    // missing (field was placed before the envelope data loaded), skip this field
    // so we don't send an invalid null UUID and get a 422.
    const documentId: string | undefined = f.documentId || f.document_id;
    if (!documentId || !UUID_REGEX.test(documentId)) {
      // Cannot save this field without a valid document_id — omit it silently.
      return null;
    }

    const recipientId: string | undefined = f.recipientId || f.recipient_id;
    if (!recipientId || !UUID_REGEX.test(recipientId)) {
      // Cannot save a field with no valid recipient — omit it.
      return null;
    }

    return {
      id,
      type: f.type,
      document_id: documentId,
      recipient_id: recipientId,
      page: f.page ?? 1,
      x: f.x ?? 0,
      y: f.y ?? 0,
      width: f.width ?? 20,
      height: f.height ?? 5,
      required: f.required ?? true,
      value: f.value ?? null,
      label: f.label ?? null,
    };
  }).filter(Boolean); // drop null entries (fields missing document_id / recipient_id)

  const res = await apiClient.put(`/envelopes/${envelopeId}/fields`, { fields: mapped });
  return res.data;
}

// Bulk Send Direct (no template required — documents + CSV sent together)
export async function bulkSendDirect(
  documents: File[],
  csvFile: File,
  subject: string,
  message: string,
  reminderDays: number,
): Promise<{ batch_id: string; total: number; created: number }> {
  const formData = new FormData();
  for (const doc of documents) {
    formData.append("documents", doc);
  }
  formData.append("csv_file", csvFile);
  formData.append("subject", subject);
  formData.append("message", message);
  formData.append("reminder_days", String(reminderDays));
  const res = await apiClient.post("/envelopes/bulk-send-direct", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// Bulk Send API
export async function bulkSendEnvelopes(
  templateId: string,
  csvFile: File,
): Promise<{ batch_id: string; total: number; created: number }> {
  const formData = new FormData();
  formData.append("csv_file", csvFile);
  const res = await apiClient.post(`/envelopes/bulk-send?template_id=${templateId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getBulkBatches(): Promise<Array<{
  batch_id: string;
  name: string;
  total: number;
  sent: number;
  completed: number;
  failed: number;
  status: string;
  submitted: string;
}>> {
  const res = await apiClient.get("/envelopes/bulk-send/batches");
  return res.data;
}

export async function getBulkSendStatus(batchId: string): Promise<{
  batch_id: string;
  total: number;
  sent: number;
  completed: number;
  failed: number;
}> {
  const res = await apiClient.get(`/envelopes/bulk-send/${batchId}/status`);
  return res.data;
}

// Comments API
export async function getComments(envelopeId: string): Promise<{
  id: string;
  envelope_id: string;
  user_id: number;
  text: string;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
}[]> {
  const res = await apiClient.get(`/envelopes/${envelopeId}/comments`);
  return res.data;
}

export async function postComment(envelopeId: string, text: string): Promise<{
  id: string;
  envelope_id: string;
  user_id: number;
  text: string;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
}> {
  const res = await apiClient.post(`/envelopes/${envelopeId}/comments`, { text });
  return res.data;
}

export async function deleteComment(envelopeId: string, commentId: string): Promise<void> {
  await apiClient.delete(`/envelopes/${envelopeId}/comments/${commentId}`);
}

// ── Folder API ────────────────────────────────────────────────────────────────

export interface FolderItem {
  id: string;
  name: string;
  created_at: string;
}

export async function getFolders(): Promise<FolderItem[]> {
  const res = await apiClient.get("/folders");
  return res.data;
}

export async function createFolder(name: string): Promise<FolderItem> {
  const res = await apiClient.post("/folders", { name });
  return res.data;
}

export async function moveEnvelopes(ids: string[], folderId: string | null, movedTo?: string): Promise<{ moved: number }> {
  const res = await apiClient.put("/envelopes/move", {
    envelope_ids: ids,
    folder_id: movedTo ? null : folderId,
    moved_to: movedTo ?? null,
  });
  return res.data;
}

export async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete(`/folders/${id}`);
}

// Correct in-flight
export async function correctEnvelope(id: string): Promise<Envelope> {
  const res = await apiClient.post(`/envelopes/${id}/correct`);
  return res.data;
}

export async function resendCorrectedEnvelope(id: string): Promise<Envelope> {
  const res = await apiClient.post(`/envelopes/${id}/resend-corrected`);
  return res.data;
}

// Recipient access code
export async function setRecipientAccessCode(
  recipientId: string,
  accessCode: string,
): Promise<void> {
  await apiClient.put(`/recipients/${recipientId}`, { access_code: accessCode });
}

// Recipient private message
export async function setRecipientPrivateMessage(
  recipientId: string,
  message: string,
): Promise<void> {
  await apiClient.put(`/recipients/${recipientId}`, { private_message: message });
}

// Verify access code for signing
export async function verifySigningAccessCode(
  token: string,
  code: string,
): Promise<{ verified: boolean }> {
  const res = await apiClient.post(`/signing/${token}/verify-code`, { code });
  return res.data;
}

// Templates API
export async function getTemplates(params: { search?: string; page?: number } = {}): Promise<{
  items: Array<{ id: string; name: string; owner: string; createdAt: string; lastModified: string; isFavorite: boolean }>;
  total: number;
}> {
  const res = await apiClient.get("/templates", { params });
  return res.data;
}

export async function createTemplate(data: { name: string; envelopeId?: string }): Promise<{ id: string; name: string }> {
  const res = await apiClient.post("/templates", data);
  return res.data;
}

// Signing — backend prefix is /signing (not /sign)
export async function getSigningSession(token: string): Promise<{
  envelope_id: string;
  envelope_subject: string;
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  document_ids: string[];
  fields: Field[];
}> {
  const res = await apiClient.get(`/signing/${token}`);
  const data = res.data;
  // Map snake_case field keys to camelCase so SigningCeremony filters work
  if (data.fields) {
    data.fields = data.fields.map((f: Record<string, unknown>) => ({
      ...f,
      recipientId: f.recipientId ?? f.recipient_id,
      documentId: f.documentId ?? f.document_id,
    }));
  }
  return data;
}

export async function submitFieldValue(
  token: string,
  fieldId: string,
  value: string,
): Promise<Field> {
  const res = await apiClient.post(`/signing/${token}/fields/${fieldId}`, { value });
  return res.data;
}

export async function completeSigning(token: string): Promise<Recipient> {
  const res = await apiClient.post(`/signing/${token}/complete`);
  return res.data;
}

export async function declineSigning(token: string, reason?: string): Promise<Recipient> {
  const res = await apiClient.post(`/signing/${token}/decline`, { reason });
  return res.data;
}

/** @deprecated Use getSigningSession / completeSigning / declineSigning instead */
export async function submitSigningSession(
  token: string,
  data: { fieldValues: Record<string, string>; signature?: string },
): Promise<{ success: boolean }> {
  const res = await apiClient.post(`/signing/${token}/complete`, data);
  return res.data;
}

/** @deprecated Use declineSigning instead */
export async function declineSigningSession(token: string, reason: string): Promise<void> {
  await apiClient.post(`/signing/${token}/decline`, { reason });
}
