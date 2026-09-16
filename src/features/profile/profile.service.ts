import { publicProfileSchema, type PublicProfile } from "./profile.schema";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoProfile: PublicProfile = {
  id: "1",
  username: "sofia.park",
  displayName: "Sofia Park",
  bio: "Finding color in ordinary days. Photography, city walks, and small moments.",
  avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`,
  country: "South Korea",
  followerCount: 12840,
  followingCount: 486,
  postCount: 18,
  isPrivate: false,
  posts: [
    { id: "p1", mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, caption: "Found a little more color on the way home.", createdAt: "2026-09-16T17:00:00.000Z" },
    { id: "p4", mediaUrl: `${REFERENCE_MEDIA}/scene-city.jpg`, caption: "Late lights, quiet streets.", createdAt: "2026-09-15T18:00:00.000Z" },
    { id: "p5", mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, caption: "A little music changes everything.", createdAt: "2026-09-14T20:00:00.000Z" },
    { id: "p6", mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, caption: "Tiny worlds hiding in plain sight.", createdAt: "2026-09-13T09:00:00.000Z" },
    { id: "p7", mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, caption: "One more view before heading home.", createdAt: "2026-09-12T16:00:00.000Z" },
    { id: "p8", mediaUrl: `${REFERENCE_MEDIA}/scene-city.jpg`, caption: "The city after the rain.", createdAt: "2026-09-11T19:00:00.000Z" },
  ],
};

/**
 * Phase 2 boundary: public profile and profile grid.
 * The UI calls this service instead of reaching into persistence directly.
 * Persistence will be connected when the Phase 1 profile/auth foundation exists.
 */
export async function getPublicProfile(username = demoProfile.username): Promise<PublicProfile> {
  if (username !== demoProfile.username) {
    throw new Error("Profile not found");
  }

  return publicProfileSchema.parse({
    ...demoProfile,
    posts: [...demoProfile.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}
