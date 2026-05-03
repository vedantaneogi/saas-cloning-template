import type { Deck, Slide } from "@/features/editor/model/types";

export type DeckThumbnail = {
  slide: Slide | null;
  page_width: number;
  page_height: number;
  theme_id: string;
};

export type DeckSummary = {
  id: string;
  title: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail?: DeckThumbnail | null;
};

export type Collaborator = {
  email: string;
  role: "viewer" | "editor";
  created_at: string;
};

export type DeckDetail = Omit<DeckSummary, "thumbnail"> & {
  owner_id: number;
  content: Deck;
  collaborators: Collaborator[];
};
