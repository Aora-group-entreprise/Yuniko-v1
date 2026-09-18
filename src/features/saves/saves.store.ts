import { create } from "zustand";
import type { Collection } from "./save.schema";
import { useSaves } from "./useSaves";

interface SavesState {
  savedPostIds: string[];
  collections: Collection[];
  toggleSave: (postId: string) => void;
  toggleCollection: (postId: string, collectionId: string) => void;
  addCollection: (name: string) => Promise<Collection | null>;
  isInCollection: (postId: string, collectionId: string) => boolean;
  refresh: () => void;
}

export const useSavesStore = create<SavesState>(() => ({
  savedPostIds: [],
  collections: [],
  toggleSave: () => undefined,
  toggleCollection: () => undefined,
  addCollection: async () => null,
  isInCollection: () => false,
  refresh: () => undefined,
}));

export function useSavesActions() {
  return useSaves();
}
