import { create } from "zustand";
import type { Collection } from "./save.schema";
import { createCollection, getSavesState, isPostSaved, savePost, togglePostInCollection, unsavePost } from "./saves.service";

interface SavesState {
  savedPostIds: string[];
  collections: Collection[];
  toggleSave: (postId: string) => void;
  toggleCollection: (postId: string, collectionId: string) => void;
  addCollection: (name: string) => Collection | null;
  isInCollection: (postId: string, collectionId: string) => boolean;
  refresh: () => void;
}

const initial = getSavesState();
const savedIds = () => getSavesState().savedPosts.map((item) => item.postId);

export const useSavesStore = create<SavesState>((set) => ({
  savedPostIds: initial.savedPosts.map((item) => item.postId),
  collections: initial.collections,
  toggleSave: (postId) => set(() => {
    if (isPostSaved(postId)) unsavePost(postId); else savePost(postId);
    const state = getSavesState();
    return { savedPostIds: savedIds(), collections: state.collections };
  }),
  toggleCollection: (postId, collectionId) => set(() => {
    togglePostInCollection(postId, collectionId);
    const state = getSavesState();
    return { savedPostIds: savedIds(), collections: state.collections };
  }),
  addCollection: (name) => {
    const collection = createCollection(name);
    if (collection) set({ collections: getSavesState().collections });
    return collection;
  },
  isInCollection: (postId, collectionId) => {
    return getSavesState().savedPosts.some((item) => item.postId === postId && item.collectionIds.includes(collectionId));
  },
  refresh: () => {
    const state = getSavesState();
    set({ savedPostIds: state.savedPosts.map((item) => item.postId), collections: state.collections });
  },
}));
