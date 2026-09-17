import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";
import { listPosts } from "../posts/post-read.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoStories: ChronologicalFeed["stories"] = [
  { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, viewed: false },
  { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, viewed: false },
  { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, viewed: true },
];

/**
 * Phase 2 boundary: chronological following feed.
 * UI calls this service; the service is the seam for the future server function.
 * Post records come from the shared post read boundary so feed and profile do
 * not maintain separate copies of post data.
 */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  const posts = await listPosts();
  return chronologicalFeedSchema.parse({ stories: demoStories, posts });
}
