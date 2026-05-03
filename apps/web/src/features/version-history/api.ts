import { presentationEndpoints } from "@/features/presentations/api";
import type { DeckDetail } from "@/features/presentations/types";

import type { VersionDetail, VersionSummary } from "./types";

async function parseOrThrow<T>(res: Response, message: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${message} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function listVersions(
  presentationId: string,
): Promise<VersionSummary[]> {
  const res = await fetch(presentationEndpoints.versions(presentationId), {
    credentials: "include",
    cache: "no-store",
  });
  return parseOrThrow<VersionSummary[]>(res, "Failed to load versions");
}

export async function getVersion(
  presentationId: string,
  versionId: string,
): Promise<VersionDetail> {
  const res = await fetch(
    presentationEndpoints.version(presentationId, versionId),
    {
      credentials: "include",
      cache: "no-store",
    },
  );
  return parseOrThrow<VersionDetail>(res, "Failed to load version");
}

export async function createVersion(
  presentationId: string,
  label?: string,
): Promise<VersionSummary> {
  const res = await fetch(presentationEndpoints.versions(presentationId), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label ?? null }),
  });
  return parseOrThrow<VersionSummary>(res, "Failed to create version");
}

export async function nameVersion(
  presentationId: string,
  versionId: string,
  label: string,
): Promise<VersionSummary> {
  const res = await fetch(
    presentationEndpoints.version(presentationId, versionId),
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    },
  );
  return parseOrThrow<VersionSummary>(res, "Failed to rename version");
}

export async function restoreVersion(
  presentationId: string,
  versionId: string,
): Promise<DeckDetail> {
  const res = await fetch(
    presentationEndpoints.restoreVersion(presentationId, versionId),
    {
      method: "POST",
      credentials: "include",
    },
  );
  return parseOrThrow<DeckDetail>(res, "Failed to restore version");
}
