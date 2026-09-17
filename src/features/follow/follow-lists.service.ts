import { z } from "zod";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";
const FOLLOW_LIST_STATE_KEY = "yuniko.follow-lists.v1";

export const followListItemSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url(),
  isPrivate: z.boolean(),
});

export type FollowListItem = z.infer<typeof followListItemSchema>;

type FollowListState = {
  removedFollowerIds: string[];
  handledRequestIds: string[];
};

const followers: FollowListItem[] = [
  { id: "f1", username: "maya.chen", displayName: "Maya Chen", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, isPrivate: false },
  { id: "f2", username: "leo.martin", displayName: "Leo Martin", avatarUrl: `${REFERENCE_MEDIA}/scene-city.jpg`, isPrivate: false },
  { id: "f3", username: "nora.lee", displayName: "Nora Lee", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, isPrivate: true },
  { id: "f4", username: "sam.wilson", displayName: "Sam Wilson", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, isPrivate: false },
];

const following: FollowListItem[] = [
  { id: "g1", username: "ava.james", displayName: "Ava James", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, isPrivate: false },
  { id: "g2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, isPrivate: false },
  { id: "g3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, isPrivate: true },
];

const requests: FollowListItem[] = [
  { id: "r1", username: "emma.davis", displayName: "Emma Davis", avatarUrl: `${REFERENCE_MEDIA}/scene-city.jpg`, isPrivate: false },
  { id: "r2", username: "jules.kim", displayName: "Jules Kim", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, isPrivate: false },
];

function readState(): FollowListState {
  if (typeof window === "undefined") return { removedFollowerIds: [], handledRequestIds: [] };
  try {
    const raw = window.localStorage.getItem(FOLLOW_LIST_STATE_KEY);
    if (!raw) return { removedFollowerIds: [], handledRequestIds: [] };
    const parsed = JSON.parse(raw) as Partial<FollowListState>;
    return {
      removedFollowerIds: Array.isArray(parsed.removedFollowerIds) ? parsed.removedFollowerIds : [],
      handledRequestIds: Array.isArray(parsed.handledRequestIds) ? parsed.handledRequestIds : [],
    };
  } catch {
    return { removedFollowerIds: [], handledRequestIds: [] };
  }
}

function writeState(state: FollowListState): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(FOLLOW_LIST_STATE_KEY, JSON.stringify(state)); } catch { /* best effort */ }
}

export async function listFollowers(_profileId: string, _cursor?: string): Promise<FollowListItem[]> {
  const state = readState();
  return followListItemSchema.array().parse(followers.filter((item) => !state.removedFollowerIds.includes(item.id)));
}

export async function listFollowing(_profileId: string, _cursor?: string): Promise<FollowListItem[]> {
  return followListItemSchema.array().parse(following);
}

export async function listFollowRequests(_profileId: string): Promise<FollowListItem[]> {
  const state = readState();
  return followListItemSchema.array().parse(requests.filter((item) => !state.handledRequestIds.includes(item.id)));
}

export async function removeFollower(profileId: string): Promise<void> {
  const state = readState();
  if (!followers.some((item) => item.id === profileId)) throw new Error("Follower not found");
  if (!state.removedFollowerIds.includes(profileId)) state.removedFollowerIds.push(profileId);
  writeState(state);
}

export async function acceptFollowRequest(requestId: string): Promise<void> {
  const state = readState();
  if (!requests.some((item) => item.id === requestId)) throw new Error("Follow request not found");
  if (!state.handledRequestIds.includes(requestId)) state.handledRequestIds.push(requestId);
  writeState(state);
}

export async function rejectFollowRequest(requestId: string): Promise<void> {
  const state = readState();
  if (!requests.some((item) => item.id === requestId)) throw new Error("Follow request not found");
  if (!state.handledRequestIds.includes(requestId)) state.handledRequestIds.push(requestId);
  writeState(state);
}
