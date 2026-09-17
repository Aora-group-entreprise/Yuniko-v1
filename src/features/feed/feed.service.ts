import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";
import { listPosts } from "../posts/post-read.service";
import { getFollowingProfileIds } from "../follow/follow.service";
import { isPostDistributedToCountry } from "./world-distribution.service";
import { getBlockedUserIds } from "../moderation/moderation.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";
const VIEWER_COUNTRY_KEY = "yuniko.viewer-country.v1";
const DEFAULT_VIEWER_COUNTRY = "MG";

function viewerCountry(): string {
  if (typeof window === "undefined") return DEFAULT_VIEWER_COUNTRY;
  const value = window.localStorage.getItem(VIEWER_COUNTRY_KEY)?.trim().toUpperCase();
  return value || DEFAULT_VIEWER_COUNTRY;
}

function removeBlockedPosts(posts: ChronologicalFeed["posts"]): ChronologicalFeed["posts"] {
  const blocked = new Set(getBlockedUserIds());
  if (blocked.size === 0) return posts;
  return posts.filter((post) => !blocked.has(post.author.id));
}

const demoStories: ChronologicalFeed["stories"] = [
  { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, viewed: false },
  { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, viewed: false },
  { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, viewed: true },
];

/** Phase 2 boundary: chronological following feed. */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  const [posts, followingIds] = await Promise.all([listPosts(), Promise.resolve(getFollowingProfileIds())]);
  const following = new Set(followingIds);
  const visiblePosts = removeBlockedPosts(posts.filter((post) => following.has(post.author.id)));
  const visibleStories = demoStories.filter((story) => following.has(story.author.id) && !getBlockedUserIds().includes(story.author.id));

  return chronologicalFeedSchema.parse({ stories: visibleStories, posts: visiblePosts });
}

/**
 * World Feed distribution boundary.
 * Every post starts with 3 countries, then expands sequentially to 5, 7 and
 * finally worldwide when the active cohort shows strong audience signals.
 * The viewer country is read from the same local prototype setting used by
 * view telemetry, keeping distribution and measurement aligned.
 */
export function getWorldDistributedPosts(posts: ChronologicalFeed["posts"]): ChronologicalFeed["posts"] {
  return removeBlockedPosts(posts.filter((post) => isPostDistributedToCountry(post.id, viewerCountry())));
}

/** World Feed: progressive distribution happens before personalized ranking. */
export async function getWorldFeed(): Promise<ChronologicalFeed> {
  const posts = await listPosts();
  const blocked = new Set(getBlockedUserIds());
  return chronologicalFeedSchema.parse({
    stories: demoStories.filter((story) => !blocked.has(story.author.id)),
    posts: getWorldDistributedPosts(posts),
  });
}
