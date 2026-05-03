import type { Deck } from "@/features/editor/model/types";

import type { Collaborator, DeckDetail, DeckSummary } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const presentationEndpoints = {
  list: `${API_URL}/presentations`,
  create: `${API_URL}/presentations`,
  get: (id: string) => `${API_URL}/presentations/${id}`,
  save: (id: string) => `${API_URL}/presentations/${id}`,
  rename: (id: string) => `${API_URL}/presentations/${id}/rename`,
  visibility: (id: string) => `${API_URL}/presentations/${id}/visibility`,
  delete: (id: string) => `${API_URL}/presentations/${id}`,
  public: (id: string) => `${API_URL}/presentations/${id}/public`,
  collaborators: (id: string) => `${API_URL}/presentations/${id}/collaborators`,
  collaborator: (id: string, email: string) =>
    `${API_URL}/presentations/${id}/collaborators/${encodeURIComponent(email)}`,
  versions: (id: string) => `${API_URL}/presentations/${id}/versions`,
  version: (id: string, versionId: string) =>
    `${API_URL}/presentations/${id}/versions/${versionId}`,
  restoreVersion: (id: string, versionId: string) =>
    `${API_URL}/presentations/${id}/versions/${versionId}/restore`,
};

async function parseOrThrow<T>(res: Response, message: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${message} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function listPresentations(): Promise<DeckSummary[]> {
  const res = await fetch(presentationEndpoints.list, {
    credentials: "include",
    cache: "no-store",
  });
  return parseOrThrow<DeckSummary[]>(res, "Failed to load presentations");
}

export async function createPresentation(
  title = "Untitled presentation",
): Promise<DeckDetail> {
  const res = await fetch(presentationEndpoints.create, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return parseOrThrow<DeckDetail>(res, "Failed to create presentation");
}

export async function getPresentation(id: string): Promise<DeckDetail> {
  const res = await fetch(presentationEndpoints.get(id), {
    credentials: "include",
    cache: "no-store",
  });
  return parseOrThrow<DeckDetail>(res, "Failed to load presentation");
}

export async function savePresentation(
  id: string,
  content: Deck,
  title: string,
): Promise<DeckDetail> {
  const res = await fetch(presentationEndpoints.save(id), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, title }),
  });
  return parseOrThrow<DeckDetail>(res, "Failed to save presentation");
}

export async function renamePresentation(
  id: string,
  title: string,
): Promise<DeckSummary> {
  const res = await fetch(presentationEndpoints.rename(id), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return parseOrThrow<DeckSummary>(res, "Failed to rename presentation");
}

export async function setPresentationVisibility(
  id: string,
  isPublic: boolean,
): Promise<DeckSummary> {
  const res = await fetch(presentationEndpoints.visibility(id), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_public: isPublic }),
  });
  return parseOrThrow<DeckSummary>(res, "Failed to update sharing");
}

export async function deletePresentation(id: string): Promise<void> {
  const res = await fetch(presentationEndpoints.delete(id), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete presentation (${res.status})`);
  }
}

export async function getPublicPresentation(id: string): Promise<DeckDetail> {
  const res = await fetch(presentationEndpoints.public(id), {
    cache: "no-store",
  });
  return parseOrThrow<DeckDetail>(res, "Presentation not available");
}

export async function listCollaborators(id: string): Promise<Collaborator[]> {
  const res = await fetch(presentationEndpoints.collaborators(id), {
    credentials: "include",
    cache: "no-store",
  });
  return parseOrThrow<Collaborator[]>(res, "Failed to load collaborators");
}

export async function addCollaborator(
  id: string,
  email: string,
  role: Collaborator["role"] = "viewer",
): Promise<Collaborator> {
  const res = await fetch(presentationEndpoints.collaborators(id), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  return parseOrThrow<Collaborator>(res, "Failed to add collaborator");
}

export async function removeCollaborator(
  id: string,
  email: string,
): Promise<void> {
  const res = await fetch(presentationEndpoints.collaborator(id, email), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to remove collaborator (${res.status})`);
  }
}
