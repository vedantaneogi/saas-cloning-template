import { apiClient } from "@/lib/api-client";

export interface Template {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  lastModified: string;
  isFavorite: boolean;
  description?: string;
  recipientCount?: number;
  documentCount?: number;
}

export interface PaginatedTemplates {
  items: Template[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface TemplateListParams {
  search?: string;
  page?: number;
  perPage?: number;
  filter?: "my-templates" | "shared" | "favorites";
}

// Normalize a raw API template record to the frontend Template shape
function normalizeTemplate(raw: Record<string, unknown>): Template {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    owner: String(raw.owner_name ?? raw.owner ?? raw.user_id ?? ""),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    lastModified: String(raw.lastModified ?? raw.updated_at ?? raw.created_at ?? ""),
    isFavorite: Boolean(raw.isFavorite ?? raw.is_favorite ?? false),
    description: raw.description ? String(raw.description) : undefined,
    recipientCount: typeof raw.recipientCount === "number" ? raw.recipientCount :
      Array.isArray(raw.roles) ? (raw.roles as unknown[]).length : 0,
    documentCount: typeof raw.documentCount === "number" ? raw.documentCount :
      Array.isArray(raw.document_ids) ? (raw.document_ids as unknown[]).length : 0,
  };
}

export async function getTemplates(
  params: TemplateListParams = {},
): Promise<PaginatedTemplates> {
  const { perPage, ...rest } = params;
  const backendParams: Record<string, unknown> = { ...rest };
  if (perPage !== undefined) backendParams.per_page = perPage;

  const res = await apiClient.get("/templates", { params: backendParams });
  const raw = res.data;

  // Handle paginated object with snake_case keys from backend
  if (raw && raw.items && !Array.isArray(raw)) {
    return {
      items: (raw.items as Record<string, unknown>[]).map(normalizeTemplate),
      total: (raw.total as number) ?? 0,
      page: (raw.page as number) ?? 1,
      perPage: (raw.per_page as number) ?? perPage ?? 25,
      pages: (raw.pages as number) ?? 1,
    };
  }

  // Handle plain array response (backend)
  if (Array.isArray(raw)) {
    const items = (raw as Record<string, unknown>[]).map(normalizeTemplate);
    return {
      items,
      total: items.length,
      page: 1,
      perPage: items.length || 25,
      pages: 1,
    };
  }

  // Already paginated camelCase format
  if (raw && Array.isArray(raw.items)) {
    return {
      ...raw,
      items: (raw.items as Record<string, unknown>[]).map(normalizeTemplate),
    };
  }

  return { items: [], total: 0, page: 1, perPage: 25, pages: 1 };
}

export async function getTemplate(id: string): Promise<Template> {
  const res = await apiClient.get(`/templates/${id}`);
  return normalizeTemplate(res.data as Record<string, unknown>);
}

export async function createTemplate(data: {
  name: string;
  envelopeId?: string;
  description?: string;
}): Promise<Template> {
  const res = await apiClient.post("/templates", data);
  return normalizeTemplate(res.data as Record<string, unknown>);
}

export async function updateTemplate(
  id: string,
  data: Partial<Template>,
): Promise<Template> {
  const res = await apiClient.put(`/templates/${id}`, data);
  return normalizeTemplate(res.data as Record<string, unknown>);
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/templates/${id}`);
}

export async function useTemplate(
  id: string,
): Promise<{ envelopeId: string }> {
  const res = await apiClient.post(`/templates/${id}/use`);
  return res.data;
}

export async function toggleFavoriteTemplate(
  id: string,
  isFavorite: boolean,
): Promise<Template> {
  const res = await apiClient.put(`/templates/${id}`, { is_favorite: isFavorite });
  return normalizeTemplate(res.data as Record<string, unknown>);
}
