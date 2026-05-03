export type { Collaborator, DeckDetail, DeckSummary } from "./types";
export {
  presentationEndpoints,
  createPresentation,
  listPresentations,
  getPresentation,
  savePresentation,
  renamePresentation,
  setPresentationVisibility,
  deletePresentation,
  getPublicPresentation,
  listCollaborators,
  addCollaborator,
  removeCollaborator,
} from "./api";
export {
  PRESENTATIONS_QUERY_KEY,
  presentationKey,
  publicPresentationKey,
  usePresentations,
  usePresentation,
  usePublicPresentation,
  useCreatePresentation,
  useSavePresentation,
  useRenamePresentation,

  useSetVisibility,
  useDeletePresentation,
  useAddCollaborator,
  useRemoveCollaborator,
} from "./hooks";
