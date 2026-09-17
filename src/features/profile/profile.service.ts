import { publicProfileSchema, type PublicProfile } from "./profile.schema";
import { listPostsByAuthor } from "../posts/post-read.service";
import { getFollowProfile } from "../follow/follow.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

type DemoProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  country: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
};

const demoProfiles: DemoProfile[] = [
  {
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
  },
  {
    id: "2",
    username: "noah.reyes",
    displayName: "Noah Reyes",
    bio: "Sound, late nights, and the energy between people.",
    avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`,
    country: "Mexico",
    followerCount: 8420,
    followingCount: 302,
    postCount: 12,
    isPrivate: false,
  },
  {
    id: "3",
    username: "lina.rose",
    displayName: "Lina Rose",
    bio: "Tiny worlds hiding in plain sight.",
    avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`,
    country: "Portugal",
    followerCount: 3910,
    followingCount: 214,
    postCount: 7,
    isPrivate: true,
  },
];

function getDemoProfile(username: string): DemoProfile {
  const profile = demoProfiles.find((item) => item.username === username);
  if (!profile) throw new Error("Profile not found");
  return profile;
}

/**
 * Phase 2 boundary: public profile and profile grid.
 * Profile posts are read through the shared post service so the grid and feed
 * use the same post records. Persistence connects here once Phase 1 exists.
 */
export async function getPublicProfile(username = demoProfiles[0].username): Promise<PublicProfile> {
  const profile = getDemoProfile(username);
  const posts = await listPostsByAuthor(profile.id);
  const followProfile = await getFollowProfile(profile.username);

  return publicProfileSchema.parse({
    ...profile,
    followStatus: followProfile.followStatus,
    posts: posts.map(({ id, mediaUrl, caption, createdAt }) => ({ id, mediaUrl, caption, createdAt })),
  });
}
