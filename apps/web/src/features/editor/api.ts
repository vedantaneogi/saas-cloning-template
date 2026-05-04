import { apiClient } from "@/lib/api-client";
import type { PlacedField } from "./model/types";
import type { Envelope } from "@/features/envelopes/types";

export interface DocumentPageInfo {
  documentId: string;
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export async function getEnvelopeForEditor(id: string): Promise<Envelope> {
  const res = await apiClient.get(`/envelopes/${id}`);
  return res.data;
}

export async function getDocumentPages(documentId: string, pageCount: number): Promise<DocumentPageInfo[]> {
  const pages: DocumentPageInfo[] = [];
  for (let page = 1; page <= pageCount; page++) {
    pages.push({
      documentId,
      pageNumber: page,
      imageUrl: `/api/documents/${documentId}/pages/${page}`,
      width: 816,
      height: 1056,
    });
  }
  return pages;
}

export async function createField(
  documentId: string,
  field: Omit<PlacedField, "id">,
): Promise<PlacedField> {
  const payload = {
    type: field.type,
    recipient_id: field.recipientId,
    page: field.page ?? 1,
    x: field.x ?? 0,
    y: field.y ?? 0,
    width: field.width ?? 20,
    height: field.height ?? 5,
    required: field.required ?? true,
    label: field.label ?? null,
    value: field.value ?? null,
  };
  const res = await apiClient.post(`/documents/${documentId}/fields`, payload);
  const f = res.data as Record<string, unknown>;
  return {
    id: String(f.id),
    type: (f.type as string) as PlacedField["type"],
    documentId: String(f.documentId ?? f.document_id ?? documentId),
    recipientId: String(f.recipientId ?? f.recipient_id ?? field.recipientId),
    page: (f.page as number) ?? 1,
    x: (f.x as number) ?? 0,
    y: (f.y as number) ?? 0,
    width: (f.width as number) ?? 20,
    height: (f.height as number) ?? 5,
    required: (f.required as boolean) ?? true,
    label: f.label as string | undefined,
    value: f.value as string | undefined,
  };
}

export async function updateField(
  fieldId: string,
  updates: Partial<PlacedField>,
): Promise<PlacedField> {
  const res = await apiClient.put(`/fields/${fieldId}`, updates);
  return res.data;
}

export async function deleteField(fieldId: string): Promise<void> {
  await apiClient.delete(`/fields/${fieldId}`);
}

export async function getEnvelopeFields(envelopeId: string): Promise<PlacedField[]> {
  const res = await apiClient.get(`/envelopes/${envelopeId}/fields`);
  // Normalize snake_case API fields to camelCase PlacedField shape so that
  // documentId and recipientId are always set when the field is saved back.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any[]).map((f: any): PlacedField => ({
    id: f.id,
    type: f.type,
    documentId: f.documentId ?? f.document_id,
    recipientId: f.recipientId ?? f.recipient_id,
    page: f.page ?? 1,
    x: f.x ?? 0,
    y: f.y ?? 0,
    width: f.width ?? 20,
    height: f.height ?? 5,
    required: f.required ?? true,
    label: f.label,
    value: f.value,
    options: f.options,
  }));
}

export async function sendEnvelopeForSigning(envelopeId: string): Promise<{ success: boolean }> {
  const res = await apiClient.post(`/envelopes/${envelopeId}/send`);
  return res.data;
}
