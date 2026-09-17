import { create } from "zustand";
import type { PostDraft, PostMedia, PostVisibility } from "./post.schema";

interface PostState {
  draft: PostDraft | null;
  createPostDraft: () => void;
  setDraft: (draft: PostDraft | null) => void;
  setCaption: (caption: string) => void;
  setVisibility: (visibility: PostVisibility) => void;
  addMedia: (media: PostMedia) => void;
  removeMedia: (mediaId: string) => void;
  clearDraft: () => void;
}

export const usePostStore = create<PostState>((set) => ({
  draft: null,
  createPostDraft: () => set((state) => state.draft ? state : {
    draft: {
      id: crypto.randomUUID(),
      caption: "",
      visibility: "public",
      media: [],
      createdAt: new Date().toISOString(),
    },
  }),
  setDraft: (draft) => set({ draft }),
  setCaption: (caption) => set((state) => state.draft ? { draft: { ...state.draft, caption } } : state),
  setVisibility: (visibility) => set((state) => state.draft ? { draft: { ...state.draft, visibility } } : state),
  addMedia: (media) => set((state) => state.draft ? { draft: { ...state.draft, media: [...state.draft.media, media] } } : state),
  removeMedia: (mediaId) => set((state) => state.draft ? { draft: { ...state.draft, media: state.draft.media.filter((item) => item.id !== mediaId) } } : state),
  clearDraft: () => set({ draft: null }),
}));
