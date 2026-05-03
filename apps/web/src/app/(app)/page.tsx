"use client";

import { useState, useEffect, useRef, useMemo, MouseEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { UserAvatar } from "@/features/auth";
import {
  useCreatePresentation,
  useDeletePresentation,
  usePresentations,
  useRenamePresentation,
  type DeckSummary,
} from "@/features/presentations";
import { SlideThumbnail } from "@/features/editor/components/SlideThumbnail";
import { TEMPLATES, TemplateCard } from "@/features/templates";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import SortByAlphaRoundedIcon from "@mui/icons-material/SortByAlphaRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

const SLIDES_YELLOW = "#F9AB00";
const TEXT_PRIMARY = "#202124";
const TEXT_SECONDARY = "#5f6368";
const SURFACE_GREY = "#F0F4F9";
const PAGE_GREY = "#F0F4F9";
const BORDER_GREY = "#dadce0";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatOpened(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return dateFormatter.format(parsed);
}

function DeckThumbnail({ deck }: { deck: DeckSummary }) {
  const thumb = deck.thumbnail;
  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        bgcolor: "#fff",
        borderBottom: `1px solid ${BORDER_GREY}`,
        overflow: "hidden",
      }}
    >
      {thumb ? (
        <SlideThumbnail
          slide={thumb.slide}
          pageWidth={thumb.page_width}
          pageHeight={thumb.page_height}
          themeId={thumb.theme_id}
        />
      ) : null}
    </Box>
  );
}

function PresentationCard({
  deck,
  highlighted,
  onOpen,
  onMenuOpen,
}: {
  deck: DeckSummary;
  highlighted: boolean;
  onOpen: () => void;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        border: highlighted ? `2px solid ${SLIDES_YELLOW}` : `1px solid ${BORDER_GREY}`,
        borderRadius: "4px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s ease",
        "&:hover": {
          borderColor: SLIDES_YELLOW,
        },
      }}
    >
      <DeckThumbnail deck={deck} />
      <Box sx={{ px: 2, py: 1.25 }}>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 400,
            color: TEXT_PRIMARY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            mb: 0.5,
          }}
        >
          {deck.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 16, height: 16, flexShrink: 0 }}>
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
              <rect x="0" y="1" width="16" height="11" rx="1.5" fill="#F9AB00" />
              <rect x="2" y="3" width="12" height="7" rx="0.5" fill="#fff" opacity="0.9" />
              <rect x="5" y="12" width="6" height="1.5" fill="#F9AB00" />
              <rect x="4" y="13.5" width="8" height="1" rx="0.5" fill="#F9AB00" />
            </svg>
          </Box>
          <PeopleRoundedIcon sx={{ fontSize: 18, color: TEXT_SECONDARY }} />
          <Typography sx={{ fontSize: 12, color: TEXT_SECONDARY, flex: 1 }}>
            {formatOpened(deck.updated_at)}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMenuOpen(e);
            }}
            sx={{ color: TEXT_SECONDARY }}
          >
            <MoreVertRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

function PresentationCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${BORDER_GREY}`,
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio: "16 / 9" }} />
      <Box sx={{ px: 2, py: 1.25 }}>
        <Skeleton variant="text" width="60%" sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" />
      </Box>
    </Paper>
  );
}

function BlankPresentationCard({
  onCreate,
  disabled,
}: {
  onCreate: () => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ width: 200 }}>
      <Paper
        elevation={0}
        onClick={() => {
          if (!disabled) onCreate();
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCreate();
          }
        }}
        sx={{
          width: 200,
          height: 112,
          border: "1px solid #C4C7C5",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "progress" : "pointer",
          opacity: disabled ? 0.7 : 1,
          bgcolor: "#fff",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          "&:hover": {
            borderColor: disabled ? "#C4C7C5" : SLIDES_YELLOW,
            boxShadow: disabled
              ? "none"
              : "0 1px 2px rgba(60,64,67,0.2)",
          },
        }}
      >
        <Box sx={{ position: "relative", width: 150, aspectRatio: "16 / 9" }}>
          <Image
            src="/images/slides-blank-googlecolors.png"
            alt="Start a new presentation"
            fill
            sizes="150px"
            priority
            style={{ objectFit: "contain" }}
          />
        </Box>
      </Paper>
      <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 400, color: TEXT_PRIMARY }}>
        Blank presentation
      </Typography>
    </Box>
  );
}

function NewPresentationFab({
  visible,
  disabled,
  onCreate,
}: {
  visible: boolean;
  disabled: boolean;
  onCreate: () => void;
}) {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 20, md: 32 },
        right: { xs: 20, md: 32 },
        zIndex: 1300,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.7)",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      <Fab
        aria-label="Start a new presentation"
        onClick={onCreate}
        disabled={disabled}
        sx={{
          bgcolor: "#fff",
          boxShadow: "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)",
          "&:hover": { bgcolor: "#f8f9fa" },
        }}
      >
        <AddRoundedIcon sx={{ color: TEXT_SECONDARY }} />
      </Fab>
    </Box>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: presentations = [], isLoading } = usePresentations();
  const createMutation = useCreatePresentation();
  const deleteMutation = useDeletePresentation();
  const renameMutation = useRenamePresentation();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [availableOffline, setAvailableOffline] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [appBarHeight, setAppBarHeight] = useState(68);
  const [renameDialog, setRenameDialog] = useState<{ id: string; value: string } | null>(null);
  const startSectionRef = useRef<HTMLDivElement | null>(null);
  const appBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const appBar = appBarRef.current;
    if (!appBar) return;
    const ro = new ResizeObserver(() => setAppBarHeight(appBar.offsetHeight));
    ro.observe(appBar);
    setAppBarHeight(appBar.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const node = startSectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const activeDeck = useMemo(
    () => presentations.find((d) => d.id === activeCardId) ?? null,
    [presentations, activeCardId],
  );

  const handleMenuOpen = (id: string) => (event: MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
    setActiveCardId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setActiveCardId(null);
  };

  const handleCreatePresentation = async () => {
    if (createMutation.isPending) return;
    try {
      const deck = await createMutation.mutateAsync(undefined);
      router.push(`/presentation/d/${deck.id}`);
    } catch {
      // Error surfaced via mutation state; card is re-enabled automatically.
    }
  };

  const handleOpen = (id: string) => {
    router.push(`/presentation/d/${id}`);
  };

  const handleOpenInNewTab = () => {
    if (!activeDeck) return;
    window.open(`/presentation/d/${activeDeck.id}`, "_blank", "noopener,noreferrer");
    handleMenuClose();
  };

  const handleRemove = () => {
    if (!activeDeck) return;
    deleteMutation.mutate(activeDeck.id);
    handleMenuClose();
  };

  const openRenameDialog = () => {
    if (!activeDeck) return;
    setRenameDialog({ id: activeDeck.id, value: activeDeck.title });
    handleMenuClose();
  };

  const confirmRename = () => {
    if (!renameDialog) return;
    const title = renameDialog.value.trim();
    if (!title) return;
    renameMutation.mutate(
      { id: renameDialog.id, title },
      {
        onSettled: () => setRenameDialog(null),
      },
    );
  };

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", color: TEXT_PRIMARY }}>
      <AppBar
        ref={appBarRef}
        position="sticky"
        elevation={0}
        sx={{ bgcolor: "#fff", color: TEXT_PRIMARY }}
      >
        <Toolbar
          disableGutters
          sx={{
            gap: 0.5,
            px: 1.5,
            minHeight: "56px !important",
          }}
        >
          <IconButton sx={{ color: TEXT_SECONDARY }}>
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            <Image
              src="/images/logo.png"
              alt="Slides"
              width={40}
              height={40}
              priority
            />
            <Typography
              sx={{
                fontSize: 22,
                color: "#1F1F1F",
                fontWeight: 200,
                letterSpacing: 0,
                fontFamily: "var(--font-product-sans)",
              }}
            >
              Slides
            </Typography>
          </Box>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              maxWidth: 720,
              mx: "auto",
              display: "flex",
              alignItems: "center",
              bgcolor: SURFACE_GREY,
              borderRadius: "999px",
              px: 2,
              height: 46,
              my: 1,
              "&:hover": { bgcolor: "#dde3ea" },
              "&:focus-within": {
                bgcolor: "#fff",
                boxShadow:
                  "0 1px 1px 0 rgba(65,69,73,0.3), 0 1px 3px 1px rgba(65,69,73,0.15)",
              },
            }}
          >
            <IconButton size="small" sx={{ color: TEXT_SECONDARY, mr: 1 }}>
              <SearchRoundedIcon />
            </IconButton>
            <InputBase
              placeholder="Search"
              sx={{ flex: 1, fontSize: 16, fontWeight: 300, color: TEXT_PRIMARY, "& input::placeholder": { color: TEXT_SECONDARY, opacity: 1 } }}
            />
          </Paper>
          <IconButton sx={{ color: TEXT_SECONDARY, ml: 1.5 }}>
            <AppsRoundedIcon />
          </IconButton>
          <UserAvatar size={32} />
        </Toolbar>
      </AppBar>

      <Box ref={startSectionRef} sx={{ bgcolor: PAGE_GREY, py: 3 }}>
        <Box sx={{ maxWidth: "80%", mx: "auto", px: { xs: 2, md: 6 } }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 300, color: TEXT_PRIMARY, flex: 1 }}>
              Start a new presentation
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography sx={{ fontSize: 14, color: TEXT_SECONDARY }}>
                Template gallery
              </Typography>
              <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                <SwapVertRoundedIcon fontSize="small" />
              </IconButton>
              <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />
              <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                <MoreVertRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <BlankPresentationCard
              onCreate={handleCreatePresentation}
              disabled={createMutation.isPending}
            />
            {TEMPLATES.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: "sticky",
          top: appBarHeight,
          zIndex: 1100,
          bgcolor: "#fff",
          boxShadow: showFab
            ? "0 2px 4px 0 rgba(60,64,67,0.12)"
            : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <Box sx={{ maxWidth: "80%", mx: "auto", px: { xs: 2, md: 6 } }}>
          <Box sx={{ display: "flex", alignItems: "center", py: 1.5 }}>
            <Typography
              sx={{ fontSize: 16, fontWeight: 300, color: TEXT_PRIMARY, flex: 1 }}
            >
              Recent presentations
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                <Typography sx={{ fontSize: 14, color: TEXT_SECONDARY }}>
                  Owned by anyone
                </Typography>
                <KeyboardArrowDownRoundedIcon
                  sx={{ fontSize: 20, color: TEXT_SECONDARY }}
                />
              </Box>
              <Tooltip title="List view">
                <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                  <ViewListRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sort">
                <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                  <SortByAlphaRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open file picker">
                <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                  <FolderOpenRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: 3 }}>
        <Box sx={{ maxWidth: "80%", mx: "auto", px: { xs: 2, md: 6 } }}>
          {isLoading ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, 1fr)",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 2.5,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <PresentationCardSkeleton key={i} />
              ))}
            </Box>
          ) : presentations.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: TEXT_SECONDARY }}>
              <Typography sx={{ fontSize: 14 }}>
                No presentations yet. Create one to get started.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, 1fr)",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 2.5,
              }}
            >
              {presentations.map((deck) => (
                <PresentationCard
                  key={deck.id}
                  deck={deck}
                  highlighted={activeCardId === deck.id}
                  onOpen={() => handleOpen(deck.id)}
                  onMenuOpen={handleMenuOpen(deck.id)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <NewPresentationFab
        visible={showFab}
        disabled={createMutation.isPending}
        onCreate={handleCreatePresentation}
      />

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 280,
              borderRadius: "8px",
              mt: 0.5,
              "& .MuiMenuItem-root": {
                fontSize: 14,
                color: TEXT_PRIMARY,
                py: 1.25,
              },
              "& .MuiListItemIcon-root": {
                color: TEXT_SECONDARY,
                minWidth: 40,
              },
            },
          },
        }}
      >
        <MenuItem onClick={openRenameDialog}>
          <ListItemIcon>
            <TextFieldsRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRemove}>
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenInNewTab}>
          <ListItemIcon>
            <OpenInNewRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open in new tab</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            setAvailableOffline((v) => !v);
          }}
          sx={{ display: "flex", alignItems: "center" }}
        >
          <ListItemIcon>
            <CheckCircleOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Available offline</ListItemText>
          <Switch
            size="small"
            checked={availableOffline}
            onChange={(e) => setAvailableOffline(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </MenuItem>
      </Menu>

      <Dialog
        open={renameDialog !== null}
        onClose={() => setRenameDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Rename presentation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Title"
            value={renameDialog?.value ?? ""}
            onChange={(e) =>
              setRenameDialog((prev) =>
                prev ? { ...prev, value: e.target.value } : prev,
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmRename();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(null)}>Cancel</Button>
          <Button
            onClick={confirmRename}
            disabled={!renameDialog?.value.trim() || renameMutation.isPending}
            variant="contained"
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
