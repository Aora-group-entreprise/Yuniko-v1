import { followProfileSchema, type FollowProfile, type FollowStatus } from "./follow.schema";
import { getBlockedUserIds, isUserBlocked } from "../moderation/moderation.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";
const FOLLOW_STATE_KEY = "yuniko.follow-state.v1";

const demoProfiles: FollowProfile[] = [
  { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, isPrivate: false, followerCount: 12840, followingCount: 486, followStatus: "following" },
  { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, isPrivate: false, followerCount: 8420, followingCount: 302, followStatus: "following" },
  { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, isPrivate: true, followerCount: 3910, followingCount: 214, followStatus: "none" },
];

const currentUserId = "current-user";
type PersistedFollowState = Record<string, FollowStatus>;

function readState(): PersistedFollowState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FOLLOW_STATE_KEY);
    return raw ? JSON.parse(raw) as PersistedFollowState : {};
  } catch { return {}; }
}

function writeState(state: PersistedFollowState): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(FOLLOW_STATE_KEY, JSON.stringify(state)); } catch { /* best effort */ }
}

function getStatus(profile: FollowProfile): FollowStatus {
  return readState()[profile.id] ?? profile.followStatus;
}

export async function getFollowProfile(username: string): Promise<FollowProfile> {
  const profile = demoProfiles.find((item) => item.username === username);
  if (!profile) throw new Error("Profile not found");
  if (isUserBlocked(profile.id)) throw new Error("Profile unavailable");
  return followProfileSchema.parse({ ...profile, followStatus: getStatus(profile) });
}

export async function toggleFollow(profileId: string): Promise<FollowStatus> {
  if (profileId === currentUserId) return "self";
  if (isUserBlocked(profileId)) throw new Error("Cannot follow a blocked user");
  const profile = demoProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Profile not found");
  const state = readState();
  const current = state[profileId] ?? profile.followStatus;
  const next: FollowStatus = current === "following" || current === "requested" ? "none" : profile.isPrivate ? "requested" : "following";
  state[profileId] = next;
  writeState(state);
  return next;
}

export async function acceptFollowRequest(profileId: string): Promise<FollowStatus> {
  if (isUserBlocked(profileId)) throw new Error("Cannot accept a blocked user");
  if (!demoProfiles.some((item) => item.id === profileId)) throw new Error("Profile not found");
  const state = readState();
  state[profileId] = "following";
  writeState(state);
  return "following";
}

export async function rejectFollowRequest(profileId: string): Promise<FollowStatus> {
  if (isUserBlocked(profileId)) throw new Error("Cannot act on a blocked user");
  if (!demoProfiles.some((item) => item.id === profileId)) throw new Error("Profile not found");
  const state = readState();
  state[profileId] = "none";
  writeState(state);
  return "none";
}

export function getFollowingProfileIds(): string[] {
  const blocked = new Set(getBlockedUserIds());
  return demoProfiles.filter((profile) => !blocked.has(profile.id) && getStatus(profile) === "following").map((profile) => profile.id);
}

export function getFollowActorId(): string { return currentUserId; }
