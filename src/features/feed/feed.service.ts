import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";
import { listPosts } from "../posts/post-read.service";
import { getFollowingProfileIds } from "../follow/follow.service";
import { isPostDistributedToCountry } from "./world-distribution.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";
const LOCAL_COUNTRY = "MG";

const demoStories: ChronologicalFeed["stories"] = [
  { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, viewed: false },
  { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, viewed: false },
  { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, viewed: true },
];

/** Phase 2 boundary: chronological following feed. */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  const [posts, followingIds] = await Promise.all([listPosts(), Promise.resolve(getFollowingProfileIds())]);
  const following = new Set(followingIds);
  const visiblePosts = posts.filter((post) => following.has(post.author.id));
  const visibleStories = demoStories.filter((story) => following.has(story.author.id));

  return chronologicalFeedSchema.parse({ stories: visibleStories, posts: visiblePosts });
}

/**
 * World Feed distribution boundary.
 * Every post starts with 3 countries, then expands sequentially to 5, 7 and
 * finally worldwide when the active cohort shows strong audience signals.
 * Country performance is derived from local view/interaction events for now.
 */
export function getWorldDistributedPosts(posts: ChronologicalFeed["posts"]): ChronologicalFeed["posts"] {
  return posts.filter((post) => isPostDistributedToCountry(post.id, LOCAL_COUNTRY));
}

/** World Feed: progressive distribution happens before personalized ranking. */
export async function getWorldFeed(): Promise<ChronologicalFeed> {
  const posts = await listPosts();
  return chronologicalFeedSchema.parse({
    stories: demoStories,
    posts: getWorldDistributedPosts(posts),
  });
}
