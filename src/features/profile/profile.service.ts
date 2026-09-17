import { publicProfileSchema, type PublicProfile } from "./profile.schema";
import { listPostsByAuthor } from "../posts/post-read.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoProfile = {
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
};

/**
 * Phase 2 boundary: public profile and profile grid.
 * Profile posts are read through the shared post service so the grid and feed
 * use the same post records. Persistence connects here once Phase 1 exists.
 */
export async function getPublicProfile(username = demoProfile.username): Promise<PublicProfile> {
  if (username !== demoProfile.username) {
    throw new Error("Profile not found");
  }

  const posts = await listPostsByAuthor(demoProfile.id);
  return publicProfileSchema.parse({
    ...demoProfile,
    postCount: demoProfile.postCount,
    posts: posts.map(({ id, mediaUrl, caption, createdAt }) => ({ id, mediaUrl, caption, createdAt })),
  });
}
