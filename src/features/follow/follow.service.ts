import { followProfileSchema, type FollowProfile, type FollowStatus } from "./follow.schema";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoProfiles: FollowProfile[] = [
  {
    id: "1",
    username: "sofia.park",
    displayName: "Sofia Park",
    avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`,
    isPrivate: false,
    followerCount: 12840,
    followingCount: 486,
    followStatus: "none",
  },
  {
    id: "2",
    username: "noah.reyes",
    displayName: "Noah Reyes",
    avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`,
    isPrivate: false,
    followerCount: 8420,
    followingCount: 302,
    followStatus: "none",
  },
  {
    id: "3",
    username: "lina.rose",
    displayName: "Lina Rose",
    avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`,
    isPrivate: true,
    followerCount: 3910,
    followingCount: 214,
    followStatus: "none",
  },
];

const currentUserId = "current-user";
const state = new Map<string, FollowStatus>();

export async function getFollowProfile(username: string): Promise<FollowProfile> {
  const profile = demoProfiles.find((item) => item.username === username);
  if (!profile) throw new Error("Profile not found");
  return followProfileSchema.parse({ ...profile, followStatus: state.get(profile.id) ?? profile.followStatus });
}

export async function toggleFollow(profileId: string): Promise<FollowStatus> {
  if (profileId === currentUserId) return "self";
  const profile = demoProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Profile not found");

  const current = state.get(profileId) ?? "none";
  const next: FollowStatus = current === "following" || current === "requested" ? "none" : profile.isPrivate ? "requested" : "following";
  state.set(profileId, next);
  return next;
}

export async function acceptFollowRequest(profileId: string): Promise<FollowStatus> {
  const profile = demoProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Profile not found");
  state.set(profileId, "following");
  return "following";
}

export async function rejectFollowRequest(profileId: string): Promise<FollowStatus> {
  if (!demoProfiles.some((item) => item.id === profileId)) throw new Error("Profile not found");
  state.set(profileId, "none");
  return "none";
}

export function getFollowActorId() {
  return currentUserId;
}
