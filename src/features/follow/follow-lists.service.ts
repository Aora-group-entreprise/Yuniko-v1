import { z } from "zod";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

export const followListItemSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url(),
  isPrivate: z.boolean(),
});

export type FollowListItem = z.infer<typeof followListItemSchema>;

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

export async function listFollowers(_profileId: string, _cursor?: string): Promise<FollowListItem[]> {
  return followListItemSchema.array().parse(followers);
}

export async function listFollowing(_profileId: string, _cursor?: string): Promise<FollowListItem[]> {
  return followListItemSchema.array().parse(following);
}

export async function listFollowRequests(_profileId: string): Promise<FollowListItem[]> {
  return followListItemSchema.array().parse(requests);
}

export async function removeFollower(profileId: string): Promise<void> {
  const index = followers.findIndex((item) => item.id === profileId);
  if (index >= 0) followers.splice(index, 1);
}
