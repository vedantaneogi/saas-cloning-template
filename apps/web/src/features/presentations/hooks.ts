"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addCollaborator,
  createPresentation,
  deletePresentation,
  getPresentation,
  getPublicPresentation,
  listPresentations,
  removeCollaborator,
  renamePresentation,
  savePresentation,
  setPresentationVisibility,
} from "./api";
import type { Collaborator, DeckDetail, DeckSummary } from "./types";
import type { Deck } from "@/features/editor/model/types";

export const PRESENTATIONS_QUERY_KEY = ["presentations"] as const;
export const presentationKey = (id: string) =>
  ["presentations", id] as const;
export const publicPresentationKey = (id: string) =>
  ["presentations", "public", id] as const;

export function usePresentations() {
  return useQuery<DeckSummary[], Error>({
    queryKey: PRESENTATIONS_QUERY_KEY,
    queryFn: listPresentations,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function usePresentation(id: string | undefined) {
  return useQuery<DeckDetail, Error>({
    queryKey: presentationKey(id ?? ""),
    queryFn: () => getPresentation(id as string),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePublicPresentation(id: string | undefined) {
  return useQuery<DeckDetail, Error>({
    queryKey: publicPresentationKey(id ?? ""),
    queryFn: () => getPublicPresentation(id as string),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreatePresentation() {
  const queryClient = useQueryClient();

  return useMutation<DeckDetail, Error, { title?: string } | undefined>({
    mutationFn: (payload) =>
      createPresentation(payload?.title ?? "Untitled presentation"),
    onSuccess: async (deck) => {
      queryClient.setQueryData(presentationKey(deck.id), deck);
      const summary: DeckSummary = {
        id: deck.id,
        title: deck.title,
        is_public: deck.is_public,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        thumbnail: {
          slide: deck.content.slides[0] ?? null,
          page_width: deck.content.meta.pageWidth,
          page_height: deck.content.meta.pageHeight,
          theme_id: deck.content.meta.themeId,
        },
      };
      queryClient.setQueryData<DeckSummary[] | undefined>(
        PRESENTATIONS_QUERY_KEY,
        (prev) => (prev ? [summary, ...prev.filter((d) => d.id !== deck.id)] : [summary]),
      );
      await queryClient.invalidateQueries({ queryKey: PRESENTATIONS_QUERY_KEY });
    },
  });
}

export function useSavePresentation(id: string) {
  const queryClient = useQueryClient();
  return useMutation<
    DeckDetail,
    Error,
    { content: Deck; title: string }
  >({
    mutationFn: ({ content, title }) =>
      savePresentation(id, content, title),
    onSuccess: (deck) => {
      queryClient.setQueryData(presentationKey(id), deck);
      // Versions may have been auto-created server-side; let any open
      // history panel refetch to show them.
      queryClient.invalidateQueries({
        queryKey: ["presentations", id, "versions"],
      });
    },
  });
}

export function useRenamePresentation() {
  const queryClient = useQueryClient();

  return useMutation<DeckSummary, Error, { id: string; title: string }>({
    mutationFn: ({ id, title }) => renamePresentation(id, title),
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: PRESENTATIONS_QUERY_KEY });
      queryClient.setQueryData<DeckDetail | undefined>(
        presentationKey(summary.id),
        (prev) =>
          prev
            ? { ...prev, title: summary.title, updated_at: summary.updated_at }
            : prev,
      );
    },
  });
}

export function useSetVisibility(id: string) {
  const queryClient = useQueryClient();

  return useMutation<DeckSummary, Error, boolean>({
    mutationFn: (isPublic) => setPresentationVisibility(id, isPublic),
    onSuccess: (summary) => {
      queryClient.setQueryData<DeckDetail | undefined>(
        presentationKey(id),
        (prev) =>
          prev ? { ...prev, is_public: summary.is_public, updated_at: summary.updated_at } : prev,
      );
      queryClient.invalidateQueries({ queryKey: PRESENTATIONS_QUERY_KEY });
    },
  });
}

export function useAddCollaborator(id: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Collaborator,
    Error,
    { email: string; role?: Collaborator["role"] }
  >({
    mutationFn: ({ email, role = "viewer" }) =>
      addCollaborator(id, email, role),
    onSuccess: (collab) => {
      queryClient.setQueryData<DeckDetail | undefined>(
        presentationKey(id),
        (prev) => {
          if (!prev) return prev;
          const rest = prev.collaborators.filter(
            (c) => c.email.toLowerCase() !== collab.email.toLowerCase(),
          );
          return { ...prev, collaborators: [...rest, collab] };
        },
      );
    },
  });
}

export function useRemoveCollaborator(id: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (email) => removeCollaborator(id, email),
    onSuccess: (_data, email) => {
      queryClient.setQueryData<DeckDetail | undefined>(
        presentationKey(id),
        (prev) =>
          prev
            ? {
                ...prev,
                collaborators: prev.collaborators.filter(
                  (c) => c.email.toLowerCase() !== email.toLowerCase(),
                ),
              }
            : prev,
      );
    },
  });
}

export function useDeletePresentation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deletePresentation(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: presentationKey(id) });
      queryClient.invalidateQueries({ queryKey: PRESENTATIONS_QUERY_KEY });
    },
  });
}
