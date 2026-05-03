"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store";

import { getPresentation, getPublicPresentation } from "./api";
import type { DeckDetail } from "./types";

export const viewerPresentationKey = (id: string) =>
  ["presentations", "viewer", id] as const;

/**
 * Resolves a deck for the public `/present/[id]` route.
 * 1. Try the public endpoint (works when deck is_public).
 * 2. If that 404s and the user is signed in, fall back to the authenticated
 *    endpoint (works for owner + invited collaborators).
 */
export function usePresentationForViewer(id: string | undefined) {
  const userEmail = useAuthStore((s) => s.user?.email ?? null);

  return useQuery<DeckDetail, Error>({
    queryKey: [...viewerPresentationKey(id ?? ""), userEmail],
    queryFn: async () => {
      try {
        return await getPublicPresentation(id as string);
      } catch (publicErr) {
        if (userEmail) {
          try {
            return await getPresentation(id as string);
          } catch {
            throw publicErr;
          }
        }
        throw publicErr;
      }
    },
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
