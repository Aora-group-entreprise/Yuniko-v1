import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";

const REF = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoFeed: ChronologicalFeed = {
  stories: [
    { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REF}/scene-rooftop.jpg` }, mediaUrl: `${REF}/scene-rooftop.jpg`, viewed: false },
    { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REF}/scene-dj.jpg` }, mediaUrl: `${REF}/scene-dj.jpg`, viewed: false },
    { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REF}/scene-flower.jpg` }, mediaUrl: `${REF}/scene-flower.jpg`, viewed: true },
  ],
  posts: [
    { id: "p1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REF}/scene-rooftop.jpg` }, mediaUrl: `${REF}/scene-rooftop.jpg`, caption: "Found a little more color on the way home.", hashtags: ["#nightwalk", "#citylight"], likeCount: 1247, commentCount: 38, shareCount: 17, viewCount: 8400, location: "Seoul, South Korea", createdAt: "2026-09-16T17:00:00.000Z" },
    { id: "p2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REF}/scene-dj.jpg` }, mediaUrl: `${REF}/scene-dj.jpg`, caption: "The room changes when the bass comes in.", hashtags: ["#afterdark", "#soundcheck"], likeCount: 892, commentCount: 24, shareCount: 12, viewCount: 5200, createdAt: "2026-09-16T16:00:00.000Z" },
    { id: "p3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REF}/scene-flower.jpg` }, mediaUrl: `${REF}/scene-flower.jpg`, caption: "Tiny worlds hiding in plain sight.", hashtags: ["#softfocus"], likeCount: 634, commentCount: 19, shareCount: 8, viewCount: 3100, location: "Lisbon, Portugal", createdAt: "2026-09-16T15:00:00.000Z" },
  ],
};

/**
 * Phase 2 boundary: chronological following feed.
 * The component never talks to storage directly. This service is the seam
 * that will later call the server function backed by Postgres/RLS.
 */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  return chronologicalFeedSchema.parse({
    ...demoFeed,
    posts: [...demoFeed.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}
