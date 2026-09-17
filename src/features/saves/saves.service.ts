import { savesStateSchema, type Collection, type SavedPost, type SavesState } from "./save.schema";

const STORAGE_KEY = "yuniko.saves.v1";
export const DEFAULT_COLLECTION_ID = "default";
const DEFAULT_COLLECTION: Collection = { id: DEFAULT_COLLECTION_ID, name: "Enregistrements", createdAt: new Date(0).toISOString() };

function readState(): SavesState {
  if (typeof window === "undefined") return { savedPosts: [], collections: [DEFAULT_COLLECTION] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { savedPosts: [], collections: [DEFAULT_COLLECTION] };
    const parsed = savesStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { savedPosts: [], collections: [DEFAULT_COLLECTION] };
    const collections = parsed.data.collections.some((item) => item.id === DEFAULT_COLLECTION_ID) ? parsed.data.collections : [DEFAULT_COLLECTION, ...parsed.data.collections];
    return { ...parsed.data, collections };
  } catch { return { savedPosts: [], collections: [DEFAULT_COLLECTION] }; }
}

function writeState(state: SavesState): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* best effort */ }
}

export function getSavesState(): SavesState { return readState(); }
export function isPostSaved(postId: string): boolean { return readState().savedPosts.some((item) => item.postId === postId); }

export function savePost(postId: string, collectionId = DEFAULT_COLLECTION_ID): SavedPost {
  const state = readState();
  const existing = state.savedPosts.find((item) => item.postId === postId);
  if (existing) {
    if (!existing.collectionIds.includes(collectionId)) {
      existing.collectionIds = [...existing.collectionIds, collectionId];
      writeState(state);
    }
    return existing;
  }
  const saved: SavedPost = { id: postId, postId, collectionIds: [DEFAULT_COLLECTION_ID, collectionId].filter((id, index, ids) => ids.indexOf(id) === index), savedAt: new Date().toISOString() };
  writeState({ ...state, savedPosts: [...state.savedPosts, saved] });
  return saved;
}

export function unsavePost(postId: string): void {
  const state = readState();
  writeState({ ...state, savedPosts: state.savedPosts.filter((item) => item.postId !== postId) });
}

export function createCollection(name: string): Collection | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const state = readState();
  if (state.collections.some((item) => item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) return null;
  const collection: Collection = { id: `local-collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: trimmed, createdAt: new Date().toISOString() };
  writeState({ ...state, collections: [...state.collections, collection] });
  return collection;
}

export function togglePostInCollection(postId: string, collectionId: string): void {
  const state = readState();
  const saved = state.savedPosts.find((item) => item.postId === postId);
  if (!saved) { savePost(postId, collectionId); return; }
  const has = saved.collectionIds.includes(collectionId);
  saved.collectionIds = has ? saved.collectionIds.filter((id) => id !== collectionId) : [...saved.collectionIds, collectionId];
  if (saved.collectionIds.length === 0) state.savedPosts = state.savedPosts.filter((item) => item.postId !== postId);
  writeState(state);
}
