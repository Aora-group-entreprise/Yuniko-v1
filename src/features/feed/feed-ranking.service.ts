import type { ChronologicalFeed } from "./feed.schema";
import { getInteractionEvents, recordInteraction } from "../events/events.service";
import { rankFeedPosts } from "../../algorithms/feed-ranking";

const LIKED_KEY = "yuniko.feed-liked.v1";
const SAVED_KEY = "yuniko.feed-saved.v1";
const SEEN_KEY = "yuniko.seen-posts.v1";
const VIEWED_KEY = "yuniko.viewed-posts.v1";
const VIEWER_COUNTRY_KEY = "yuniko.viewer-country.v1";
const DEFAULT_VIEWER_COUNTRY = "MG";

function readIds(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function viewerCountry(): string {
  if (typeof window === "undefined") return DEFAULT_VIEWER_COUNTRY;
  const value = window.localStorage.getItem(VIEWER_COUNTRY_KEY)?.trim().toUpperCase();
  return value || DEFAULT_VIEWER_COUNTRY;
}

function getAffinity(feed: ChronologicalFeed): Map<string, number> {
  const authorByPost = new Map(feed.posts.map((post) => [post.id, post.author.id]));
  const affinity = new Map<string, number>();

  for (const event of getInteractionEvents()) {
    const authorId = authorByPost.get(event.postId);
    if (!authorId) continue;

    const weight =
      event.type === "like"
        ? 3
        : event.type === "comment" || event.type === "reply"
          ? 4
          : event.type === "save" || event.type === "share"
            ? 5
            : event.type === "unlike" || event.type === "unsave"
              ? -2
              : 1;

    affinity.set(authorId, Math.max(0, (affinity.get(authorId) ?? 0) + weight));
  }

  return affinity;
}

export function markPostSeen(postId: string): void {
  if (typeof window === "undefined") return;
  const seen = readIds(SEEN_KEY);
  seen.delete(postId);
  seen.add(postId);

  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
  } catch {
    // Best effort only. Backend persistence will replace this boundary later.
  }

  const viewed = readIds(VIEWED_KEY);
  if (viewed.has(postId)) return;
  viewed.add(postId);

  try {
    window.localStorage.setItem(VIEWED_KEY, JSON.stringify([...viewed].slice(-500)));
  } catch {
    // Best effort only.
  }

  recordInteraction("view", postId, undefined, { countryCode: viewerCountry() });
}

export async function getAlgorithmicFeed(feed: ChronologicalFeed): Promise<ChronologicalFeed> {
  return {
    ...feed,
    posts: rankFeedPosts(feed.posts, {
      likedPostIds: readIds(LIKED_KEY),
      savedPostIds: readIds(SAVED_KEY),
      seenPostIds: readIds(SEEN_KEY),
      affinityByAuthor: getAffinity(feed),
    }),
  };
}
