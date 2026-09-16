import { create } from "zustand";

type FeedInteractionState = {
  liked: string[];
  saved: string[];
  pendingLikes: string[];
  pendingSaves: string[];
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
};

export const useFeedInteractionStore = create<FeedInteractionState>((set) => ({
  liked: [],
  saved: [],
  pendingLikes: [],
  pendingSaves: [],
  toggleLike: (postId) => set((state) => ({
    liked: state.liked.includes(postId)
      ? state.liked.filter((id) => id !== postId)
      : [...state.liked, postId],
    pendingLikes: state.pendingLikes.includes(postId)
      ? state.pendingLikes.filter((id) => id !== postId)
      : [...state.pendingLikes, postId],
  })),
  toggleSave: (postId) => set((state) => ({
    saved: state.saved.includes(postId)
      ? state.saved.filter((id) => id !== postId)
      : [...state.saved, postId],
    pendingSaves: state.pendingSaves.includes(postId)
      ? state.pendingSaves.filter((id) => id !== postId)
      : [...state.pendingSaves, postId],
  })),
}));
