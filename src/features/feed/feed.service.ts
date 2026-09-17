import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";
import { listPosts } from "../posts/post-read.service";
import { getFollowingProfileIds } from "../follow/follow.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoStories: ChronologicalFeed["stories"] = [
  { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, viewed: false },
  { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, viewed: false },
  { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, viewed: true },
];

/**
 * Phase 2 boundary: chronological following feed.
 * In the frontend-only build, following relationships are persisted locally;
 * the final server implementation will enforce the same filter server-side.
 */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  const [posts, followingIds] = await Promise.all([listPosts(), Promise.resolve(getFollowingProfileIds())]);
  const following = new Set(followingIds);
  const visiblePosts = posts.filter((post) => following.has(post.author.id));
  const visibleStories = demoStories.filter((story) => following.has(story.author.id));

  return chronologicalFeedSchema.parse({ stories: visibleStories, posts: visiblePosts });
}
