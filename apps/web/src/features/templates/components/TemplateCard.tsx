"use client";

import { Box, Paper, Skeleton, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

import { SlideThumbnail } from "@/features/editor/components/SlideThumbnail";
import {
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
} from "@/features/editor/model/mockDeck";

import { useCreateFromTemplate, useTemplateDeck } from "../hooks";
import type { TemplateManifestEntry } from "../manifest";

const SLIDES_YELLOW = "#F9AB00";
const TEXT_PRIMARY = "#202124";
const TEXT_SECONDARY = "#5f6368";
const BORDER_GREY = "#C4C7C5";

type Props = {
  template: TemplateManifestEntry;
};

export function TemplateCard({ template }: Props) {
  const router = useRouter();
  const { data, isLoading } = useTemplateDeck(template);
  const createFromTemplate = useCreateFromTemplate();

  const disabled = createFromTemplate.isPending;

  const handleClick = async () => {
    if (disabled) return;
    try {
      const deck = await createFromTemplate.mutateAsync(template.id);
      router.push(`/presentation/d/${deck.id}`);
    } catch {
      // Mutation state surfaces the error; card re-enables automatically.
    }
  };

  const firstSlide = data?.slides[0];

  return (
    <Box sx={{ width: 200 }}>
      <Paper
        elevation={0}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={`Use template: ${template.name}`}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        sx={{
          width: 200,
          height: 112,
          border: `1px solid ${BORDER_GREY}`,
          borderRadius: "4px",
          overflow: "hidden",
          cursor: disabled ? "progress" : "pointer",
          opacity: disabled ? 0.7 : 1,
          bgcolor: "#fff",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          "&:hover": {
            borderColor: disabled ? BORDER_GREY : SLIDES_YELLOW,
            boxShadow: disabled
              ? "none"
              : "0 1px 2px rgba(60,64,67,0.2)",
          },
        }}
      >
        <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
          {firstSlide ? (
            <SlideThumbnail
              slide={firstSlide}
              pageWidth={data?.pageWidth ?? DEFAULT_PAGE_WIDTH}
              pageHeight={data?.pageHeight ?? DEFAULT_PAGE_HEIGHT}
              themeId="default"
            />
          ) : (
            <Skeleton
              variant="rectangular"
              animation={isLoading ? "wave" : false}
              sx={{ width: "100%", height: "100%" }}
            />
          )}
        </Box>
      </Paper>
      <Typography
        sx={{
          mt: 1,
          fontSize: 14,
          fontWeight: 500,
          color: TEXT_PRIMARY,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {template.name}
      </Typography>
      {template.subtitle ? (
        <Typography
          sx={{
            fontSize: 12,
            color: TEXT_SECONDARY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {template.subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
