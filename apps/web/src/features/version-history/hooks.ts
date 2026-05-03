"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { presentationKey } from "@/features/presentations/hooks";
import type { DeckDetail } from "@/features/presentations/types";

import {
  createVersion,
  getVersion,
  listVersions,
  nameVersion,
  restoreVersion,
} from "./api";
import type { VersionDetail, VersionSummary } from "./types";

export const versionsKey = (presentationId: string) =>
  ["presentations", presentationId, "versions"] as const;

export const versionKey = (presentationId: string, versionId: string) =>
  ["presentations", presentationId, "versions", versionId] as const;

export function useVersions(presentationId: string | undefined) {
  return useQuery<VersionSummary[], Error>({
    queryKey: versionsKey(presentationId ?? ""),
    queryFn: () => listVersions(presentationId as string),
    enabled: !!presentationId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useVersion(
  presentationId: string | undefined,
  versionId: string | null | undefined,
) {
  return useQuery<VersionDetail, Error>({
    queryKey: versionKey(presentationId ?? "", versionId ?? ""),
    queryFn: () => getVersion(presentationId as string, versionId as string),
    enabled: !!presentationId && !!versionId,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateVersion(presentationId: string) {
  const queryClient = useQueryClient();

  return useMutation<VersionSummary, Error, { label?: string } | undefined>({
    mutationFn: (payload) => createVersion(presentationId, payload?.label),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: versionsKey(presentationId),
      });
    },
  });
}

export function useNameVersion(presentationId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    VersionSummary,
    Error,
    { versionId: string; label: string }
  >({
    mutationFn: ({ versionId, label }) =>
      nameVersion(presentationId, versionId, label),
    onSuccess: (updated) => {
      queryClient.setQueryData<VersionSummary[] | undefined>(
        versionsKey(presentationId),
        (prev) =>
          prev
            ? prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
            : prev,
      );
    },
  });
}

export function useRestoreVersion(presentationId: string) {
  const queryClient = useQueryClient();

  return useMutation<DeckDetail, Error, string>({
    mutationFn: (versionId) => restoreVersion(presentationId, versionId),
    onSuccess: (deck) => {
      queryClient.setQueryData(presentationKey(presentationId), deck);
      queryClient.invalidateQueries({
        queryKey: versionsKey(presentationId),
      });
    },
  });
}
