import type { ChronologicalFeed } from "./feed.schema";
import { getInteractionEvents } from "../events/events.service";
import { rankFeedPosts } from "../../algorithms/feed-ranking";

const LIKED_KEY = "yuniko.feed-liked.v1";
const SAVED_KEY = "yuniko.feed-saved.v1";
const SEEN_KEY = "yuniko.seen-posts.v1";

function readIds(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

function getAffinity(): Map<string, number> {
  const affinity = new Map<string, number>();
  for (const event of getInteractionEvents()) {
    const weight = event.type === "like" ? 3 : event.type === "comment" || event.type === "reply" ? 4 : event.type === "save" ? 5 : event.type === "share" ? 5 : event.type === "unlike" || event.type === "unsave" ? -2 : 1;
    const current = affinity.get(event.targetId ?? "") ?? 0;
    if (event.targetId) affinity.set(event.targetId, Math.max(0, current + weight));
  }
  return affinity;
}

export function markPostSeen(postId: string): void {
  if (typeof window === "undefined") return;
  const seen = readIds(SEEN_KEY);
  seen.add(postId);
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500))); } catch { /* best effort */ }
}

export async function getAlgorithmicFeed(feed: ChronologicalFeed): Promise<ChronologicalFeed> {
  const rankedPosts = rankFeedPosts(feed.posts, {
    likedPostIds: readIds(LIKED_KEY),
    savedPostIds: readIds(SAVED_KEY),
    seenPostIds: readIds(SEEN_KEY),
    affinityByAuthor: getAffinity(),
  });
  return { ...feed, posts: rankedPosts };
}
