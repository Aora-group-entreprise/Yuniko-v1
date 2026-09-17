import { create } from "zustand";
import { recordInteraction } from "../events/events.service";

const LIKED_KEY = "yuniko.feed-liked.v1";
const SAVED_KEY = "yuniko.feed-saved.v1";
function readIds(key: string): string[] { if (typeof window === "undefined") return []; try { const raw = window.localStorage.getItem(key); const value = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; } }
function writeIds(key: string, ids: string[]) { if (typeof window === "undefined") return; try { window.localStorage.setItem(key, JSON.stringify(ids)); } catch { /* best effort */ } }
type FeedInteractionState = { liked: string[]; saved: string[]; pendingLikes: string[]; pendingSaves: string[]; toggleLike: (postId: string) => void; toggleSave: (postId: string) => void; };
export const useFeedInteractionStore = create<FeedInteractionState>((set) => ({
  liked: readIds(LIKED_KEY), saved: readIds(SAVED_KEY), pendingLikes: [], pendingSaves: [],
  toggleLike: (postId) => set((state) => { const wasLiked = state.liked.includes(postId); const liked = wasLiked ? state.liked.filter((id) => id !== postId) : [...state.liked, postId]; writeIds(LIKED_KEY, liked); recordInteraction(wasLiked ? "unlike" : "like", postId); return { liked, pendingLikes: state.pendingLikes.includes(postId) ? state.pendingLikes.filter((id) => id !== postId) : [...state.pendingLikes, postId] }; }),
  toggleSave: (postId) => set((state) => { const wasSaved = state.saved.includes(postId); const saved = wasSaved ? state.saved.filter((id) => id !== postId) : [...state.saved, postId]; writeIds(SAVED_KEY, saved); recordInteraction(wasSaved ? "unsave" : "save", postId); return { saved, pendingSaves: state.pendingSaves.includes(postId) ? state.pendingSaves.filter((id) => id !== postId) : [...state.pendingSaves, postId] }; }),
}));
