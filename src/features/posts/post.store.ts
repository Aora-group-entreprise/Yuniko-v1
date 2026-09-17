import { create } from "zustand";
import type { PostDraft, PostMedia, PostVisibility } from "./post.schema";

interface PostState {
  draft: PostDraft | null;
  setDraft: (draft: PostDraft | null) => void;
  setCaption: (caption: string) => void;
  setVisibility: (visibility: PostVisibility) => void;
  addMedia: (media: PostMedia) => void;
  removeMedia: (mediaId: string) => void;
  clearDraft: () => void;
}

const DRAFT_KEY = "yuniko:post-draft";

function readDraft(): PostDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) as PostDraft : null;
  } catch {
    return null;
  }
}

function persist(draft: PostDraft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage can be unavailable; the in-memory draft still works.
  }
}

export const usePostStore = create<PostState>((set) => ({
  draft: readDraft(),
  setDraft: (draft) => { persist(draft); set({ draft }); },
  setCaption: (caption) => set((state) => {
    if (!state.draft) return state;
    const draft = { ...state.draft, caption };
    persist(draft);
    return { draft };
  }),
  setVisibility: (visibility) => set((state) => {
    if (!state.draft) return state;
    const draft = { ...state.draft, visibility };
    persist(draft);
    return { draft };
  }),
  addMedia: (media) => set((state) => {
    if (!state.draft) return state;
    const draft = { ...state.draft, media: [...state.draft.media, media] };
    persist(draft);
    return { draft };
  }),
  removeMedia: (mediaId) => set((state) => {
    if (!state.draft) return state;
    const draft = { ...state.draft, media: state.draft.media.filter((item) => item.id !== mediaId) };
    persist(draft);
    return { draft };
  }),
  clearDraft: () => { persist(null); set({ draft: null }); },
}));
