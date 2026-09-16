import { chronologicalFeedSchema, type ChronologicalFeed } from "./feed.schema";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoFeed: ChronologicalFeed = {
  stories: [
    { id: "s1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, viewed: false },
    { id: "s2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, viewed: false },
    { id: "s3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, viewed: true },
  ],
  posts: [
    { id: "p1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, caption: "Found a little more color on the way home.", hashtags: ["#nightwalk", "#citylight"], likeCount: 1247, commentCount: 38, saveCount: 91, shareCount: 17, viewCount: 8400, location: "Seoul, South Korea", createdAt: "2026-09-16T17:00:00.000Z" },
    { id: "p2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, caption: "The room changes when the bass comes in.", hashtags: ["#afterdark", "#soundcheck"], likeCount: 892, commentCount: 24, saveCount: 64, shareCount: 12, viewCount: 5200, createdAt: "2026-09-16T16:00:00.000Z" },
    { id: "p3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, caption: "Tiny worlds hiding in plain sight.", hashtags: ["#softfocus"], likeCount: 634, commentCount: 19, saveCount: 42, shareCount: 8, viewCount: 3100, location: "Lisbon, Portugal", createdAt: "2026-09-16T15:00:00.000Z" },
  ],
};

/**
 * Phase 2 boundary: chronological following feed.
 * UI calls this service; the service is the seam for the future server function.
 * Until Phase 1 is built, demo data keeps the UI functional without pretending
 * that Postgres/RLS already exists.
 */
export async function getChronologicalFeed(): Promise<ChronologicalFeed> {
  return chronologicalFeedSchema.parse({
    ...demoFeed,
    posts: [...demoFeed.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}
