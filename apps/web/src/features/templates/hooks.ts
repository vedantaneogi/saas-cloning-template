"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  PRESENTATIONS_QUERY_KEY,
  presentationKey,
} from "@/features/presentations/hooks";
import {
  createPresentation,
  savePresentation,
} from "@/features/presentations/api";
import type { DeckDetail, DeckSummary } from "@/features/presentations/types";
import type { Deck } from "@/features/editor/model/types";

import { fetchAndParseTemplate, type ParsedTemplate } from "./api";
import { getTemplate, type TemplateManifestEntry } from "./manifest";

export const templateQueryKey = (id: string) =>
  ["templates", "parsed", id] as const;

export function useTemplateDeck(template: TemplateManifestEntry | undefined) {
  return useQuery<ParsedTemplate, Error>({
    queryKey: templateQueryKey(template?.id ?? ""),
    queryFn: () => fetchAndParseTemplate(template!.pptxUrl),
    enabled: !!template,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation<DeckDetail, Error, string>({
    mutationFn: async (templateId) => {
      const template = getTemplate(templateId);
      if (!template) {
        throw new Error(`Unknown template: ${templateId}`);
      }

      const cached = queryClient.getQueryData<ParsedTemplate>(
        templateQueryKey(template.id),
      );
      const parsed =
        cached ??
        (await queryClient.fetchQuery<ParsedTemplate, Error>({
          queryKey: templateQueryKey(template.id),
          queryFn: () => fetchAndParseTemplate(template.pptxUrl),
          staleTime: Infinity,
          gcTime: Infinity,
        }));

      const created = await createPresentation(template.name);

      const content: Deck = {
        id: created.id,
        meta: {
          title: template.name,
          themeId: "default",
          pageWidth: parsed.pageWidth,
          pageHeight: parsed.pageHeight,
          schemaVersion: 1,
        },
        slides: parsed.slides,
      };

      const saved = await savePresentation(created.id, content, template.name);
      return saved;
    },
    onSuccess: (deck) => {
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
        (prev) =>
          prev ? [summary, ...prev.filter((d) => d.id !== deck.id)] : [summary],
      );
      queryClient.invalidateQueries({ queryKey: PRESENTATIONS_QUERY_KEY });
    },
  });
}
