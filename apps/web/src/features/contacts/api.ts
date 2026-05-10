import { apiClient } from "@/lib/api-client";

export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  lastSentAt?: string;
  createdAt?: string;
}

export interface PaginatedContacts {
  items: Contact[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface ContactListParams {
  search?: string;
  page?: number;
  perPage?: number;
}

// Normalize raw API contact to frontend Contact shape
function normalizeContact(raw: Record<string, unknown>): Contact {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    company: raw.company ? String(raw.company) : undefined,
    phone: raw.phone ? String(raw.phone) : undefined,
    lastSentAt: raw.lastSentAt ? String(raw.lastSentAt) : undefined,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

export async function getContacts(
  params: ContactListParams = {},
): Promise<PaginatedContacts> {
  const res = await apiClient.get("/contacts", { params });
  const raw = res.data;

  // Handle plain array response from backend
  if (Array.isArray(raw)) {
    const items = (raw as Record<string, unknown>[]).map(normalizeContact);
    return {
      items,
      total: items.length,
      page: 1,
      perPage: items.length || 25,
      pages: 1,
    };
  }

  // Already paginated
  if (raw && Array.isArray(raw.items)) {
    return {
      ...raw,
      items: (raw.items as Record<string, unknown>[]).map(normalizeContact),
    };
  }

  return { items: [], total: 0, page: 1, perPage: 25, pages: 1 };
}

export async function createContact(data: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
}): Promise<Contact> {
  const res = await apiClient.post("/contacts", data);
  return normalizeContact(res.data as Record<string, unknown>);
}

export async function updateContact(
  id: string,
  data: Partial<Omit<Contact, "id">>,
): Promise<Contact> {
  const res = await apiClient.put(`/contacts/${id}`, data);
  return normalizeContact(res.data as Record<string, unknown>);
}

export async function deleteContact(id: string): Promise<void> {
  await apiClient.delete(`/contacts/${id}`);
}
