import type { Deck } from "@/features/editor/model/types";

export type VersionSummary = {
  id: string;
  presentation_id: string;
  author_id: number;
  author_name: string | null;
  version_number: number;
  label: string | null;
  created_at: string;
};

export type VersionDetail = VersionSummary & {
  content: Deck;
};
