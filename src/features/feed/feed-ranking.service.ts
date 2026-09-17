import type { ChronologicalFeed } from "./feed.schema";
import { getInteractionEvents, recordInteraction } from "../events/events.service";
import { rankFeedPosts } from "../../algorithms/feed-ranking";

const LIKED_KEY = "yuniko.feed-liked.v1";
const SAVED_KEY = "yuniko.feed-saved.v1";
const SEEN_KEY = "yuniko.seen-posts.v1";
const VIEWED_KEY = "yuniko.viewed-posts.v1";
const VIEWER_COUNTRY_KEY = "yuniko.viewer-country.v1";
const DEFAULT_VIEWER_COUNTRY = "MG";
const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

type ViewedMap = Record<string, number>;

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

function readViewed(): ViewedMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIEWED_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "number"),
    );
  } catch {
    return {};
  }
}

function writeViewed(viewed: ViewedMap): void {
  if (typeof window === "undefined") return;
  try {
    const cutoff = Date.now() - VIEW_WINDOW_MS;
    const active = Object.fromEntries(
      Object.entries(viewed).filter(([, timestamp]) => timestamp >= cutoff),
    );
    window.localStorage.setItem(VIEWED_KEY, JSON.stringify(active));
  } catch {
    // Best effort only.
  }
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
              : event.type === "view"
                ? 0.25
                : 1;

    affinity.set(authorId, Math.max(0, (affinity.get(authorId) ?? 0) + weight));
  }

  return affinity;
}

function getViewCounts(feed: ChronologicalFeed): Map<string, number> {
  const viewCounts = new Map(feed.posts.map((post) => [post.id, post.viewCount]));

  for (const event of getInteractionEvents()) {
    if (event.type !== "view" || !viewCounts.has(event.postId)) continue;
    viewCounts.set(event.postId, (viewCounts.get(event.postId) ?? 0) + 1);
  }

  return viewCounts;
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

  const viewed = readViewed();
  const now = Date.now();
  const lastViewedAt = viewed[postId] ?? 0;
  if (now - lastViewedAt < VIEW_WINDOW_MS) return;

  viewed[postId] = now;
  writeViewed(viewed);
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
      viewCountByPost: getViewCounts(feed),
    }),
  };
}
