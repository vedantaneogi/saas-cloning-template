import { apiClient } from "@/lib/api-client";
import type { Envelope, Recipient } from "@/features/envelopes/types";
import type { PlacedField } from "@/features/editor/model/types";

export interface SigningSession {
  envelope: Envelope;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  fields: PlacedField[];
  documents: Array<{ id: string; name: string; pageCount: number }>;
  requiresAccessCode?: boolean;
}

// Raw shape returned by the backend signing session endpoint
interface RawSigningSession {
  envelope: {
    id: string;
    subject: string;
    status: string;
    from_name?: string;
    fromEmail?: string;
    recipients: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      routing_order: number;
      status: string;
    }>;
    documents: Array<{
      id: string;
      name: string;
      original_filename: string;
      filename: string;
      pageCount: number;
      page_count: number;
    }>;
    message?: string;
  };
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  fields: Array<{
    id: string;
    document_id: string;
    recipient_id: string;
    type: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    required: boolean;
    value?: string;
    label?: string;
    formula?: string;
    decimal_places?: number;
    conditional_on?: string;
    conditional_value?: string;
    conditional_action?: string;
    options?: string[];
    group_name?: string;
    payment_amount?: number;
    payment_currency?: string;
    payment_description?: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    original_filename: string;
    filename: string;
    pageCount: number;
    page_count: number;
  }>;
  requiresAccessCode?: boolean;
}

function mapSigningSession(raw: RawSigningSession): SigningSession {
  const envelope: Envelope = {
    id: raw.envelope.id,
    subject: raw.envelope.subject,
    status: raw.envelope.status as Envelope["status"],
    from: raw.envelope.from_name ?? "",
    fromEmail: raw.envelope.fromEmail ?? "",
    lastModified: new Date().toISOString(),
    recipients: raw.envelope.recipients.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      order: r.routing_order,
      status: r.status as Recipient["status"],
    })),
    documents: raw.envelope.documents.map((d) => ({
      id: d.id,
      name: d.original_filename ?? d.name,
      original_filename: d.original_filename,
      filename: d.filename,
      pageCount: d.pageCount ?? d.page_count,
      page_count: d.page_count ?? d.pageCount,
    })),
    message: raw.envelope.message,
  };

  // Map backend snake_case field shape to frontend PlacedField (camelCase)
  const fields: PlacedField[] = raw.fields.map((f) => ({
    id: String(f.id),
    type: f.type as PlacedField["type"],
    recipientId: String(f.recipient_id),
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    required: f.required,
    value: f.value,
    label: f.label,
    formula: f.formula,
    decimalPlaces: f.decimal_places,
    conditionalOn: ((f as Record<string, unknown>).conditional_on ?? (f as Record<string, unknown>).conditionalOn) as string | undefined,
    conditionalValue: ((f as Record<string, unknown>).conditional_value ?? (f as Record<string, unknown>).conditionalValue) as string | undefined,
    conditionalAction: ((f as Record<string, unknown>).conditional_action ?? (f as Record<string, unknown>).conditionalAction) as "show" | "hide" | undefined,
    options: (f as Record<string, unknown>).options as string[] | undefined,
    groupName: ((f as Record<string, unknown>).group_name ?? (f as Record<string, unknown>).groupName) as string | undefined,
    paymentAmount: ((f as Record<string, unknown>).payment_amount ?? (f as Record<string, unknown>).paymentAmount) as number | undefined,
    paymentCurrency: ((f as Record<string, unknown>).payment_currency ?? (f as Record<string, unknown>).paymentCurrency) as string | undefined,
    paymentDescription: ((f as Record<string, unknown>).payment_description ?? (f as Record<string, unknown>).paymentDescription) as string | undefined,
  }));

  const documents = raw.documents.map((d) => ({
    id: d.id,
    name: d.original_filename ?? d.name,
    pageCount: d.pageCount ?? d.page_count,
  }));

  return {
    envelope,
    recipientId: raw.recipientId,
    recipientName: raw.recipientName,
    recipientEmail: raw.recipientEmail,
    fields,
    documents,
    requiresAccessCode: raw.requiresAccessCode === true,
  };
}

export async function verifySigningAccessCode(
  token: string,
  code: string,
): Promise<{ verified: boolean }> {
  const res = await apiClient.post(`/signing/${token}/verify-code`, { code });
  return res.data as { verified: boolean };
}

export async function getSigningSession(token: string): Promise<SigningSession> {
  const res = await apiClient.get(`/signing/${token}`);
  return mapSigningSession(res.data as RawSigningSession);
}

export async function submitFieldValue(
  token: string,
  fieldId: string,
  value: string,
): Promise<void> {
  await apiClient.post(`/signing/${token}/fields/${fieldId}`, { value });
}

export async function completeSigning(
  token: string,
  accessCode?: string,
): Promise<{ success: boolean; downloadUrl?: string }> {
  // Pass the access code (if provided) so the backend can verify it
  // independently of the frontend gate — prevents API-level bypass.
  const body = accessCode ? { code: accessCode } : {};
  const res = await apiClient.post(`/signing/${token}/complete`, body);
  return res.data as { success: boolean; downloadUrl?: string };
}

export async function declineSigning(token: string, reason: string): Promise<void> {
  await apiClient.post(`/signing/${token}/decline`, { reason });
}
