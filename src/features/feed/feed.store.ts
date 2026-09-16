import { create } from "zustand";

type FeedInteractionState = {
  liked: string[];
  saved: string[];
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
};

export const useFeedInteractionStore = create<FeedInteractionState>((set) => ({
  liked: [],
  saved: [],
  toggleLike: (postId) => set((state) => ({
    liked: state.liked.includes(postId) ? state.liked.filter((id) => id !== postId) : [...state.liked, postId],
  })),
  toggleSave: (postId) => set((state) => ({
    saved: state.saved.includes(postId) ? state.saved.filter((id) => id !== postId) : [...state.saved, postId],
  })),
}));
