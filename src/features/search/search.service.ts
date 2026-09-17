import { listPosts } from "../posts/post-read.service";
import { followProfileSchema, type FollowProfile } from "../follow/follow.schema";
import { getBlockedUserIds } from "../moderation/moderation.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const profiles: FollowProfile[] = [
  { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, isPrivate: false, followerCount: 12840, followingCount: 486, followStatus: "following" },
  { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, isPrivate: false, followerCount: 8420, followingCount: 302, followStatus: "following" },
  { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, isPrivate: true, followerCount: 3910, followingCount: 214, followStatus: "none" },
];

export type SearchResults = { profiles: FollowProfile[]; posts: Awaited<ReturnType<typeof listPosts>> };

export async function searchYuniko(query: string): Promise<SearchResults> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { profiles: [], posts: [] };

  const blocked = new Set(getBlockedUserIds());
  const matchedProfiles = profiles
    .filter((profile) => !blocked.has(profile.id))
    .filter((profile) => `${profile.username} ${profile.displayName}`.toLowerCase().includes(normalized))
    .map((profile) => followProfileSchema.parse(profile));

  const posts = await listPosts();
  const matchedPosts = posts.filter((post) =>
    !blocked.has(post.author.id) &&
    `${post.author.username} ${post.author.displayName} ${post.caption} ${post.hashtags.join(" ")}`.toLowerCase().includes(normalized),
  );

  return { profiles: matchedProfiles, posts: matchedPosts };
}
