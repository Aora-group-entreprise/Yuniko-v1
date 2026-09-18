import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { z } from "zod";

export const followListItemSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  isPrivate: z.boolean(),
});
export type FollowListItem = z.infer<typeof followListItemSchema>;

async function listUsersForFollowRows(rows: Array<{ follower_id: string; following_id: string }>, side: "follower" | "following") {
  const ids = rows.map((row) => side === "follower" ? row.follower_id : row.following_id);
  if (ids.length === 0) return [];

  const { data, error } = await requireYunikoDb().from("profiles")
    .select("id,username,display_name,avatar_url,is_private")
    .in("id", ids);
  if (error) throw error;

  const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));
  return followListItemSchema.array().parse(ids.map((id) => byId.get(id)).filter(Boolean).map((profile) => ({
    id: profile!.id,
    username: profile!.username,
    displayName: profile!.display_name,
    avatarUrl: profile!.avatar_url,
    isPrivate: profile!.is_private,
  })));
}

export async function listFollowers(profileId: string): Promise<FollowListItem[]> {
  const { data, error } = await requireYunikoDb().from("follows")
    .select("follower_id,following_id")
    .eq("following_id", profileId)
    .eq("status", "accepted");
  if (error) throw error;
  return listUsersForFollowRows(data ?? [], "follower");
}

export async function listFollowing(profileId: string): Promise<FollowListItem[]> {
  const { data, error } = await requireYunikoDb().from("follows")
    .select("follower_id,following_id")
    .eq("follower_id", profileId)
    .eq("status", "accepted");
  if (error) throw error;
  return listUsersForFollowRows(data ?? [], "following");
}

export async function listFollowRequests(profileId: string): Promise<FollowListItem[]> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user || user.id !== profileId) return [];

  const { data, error } = await requireYunikoDb().from("follows")
    .select("follower_id,following_id")
    .eq("following_id", user.id)
    .eq("status", "pending");
  if (error) throw error;
  return listUsersForFollowRows(data ?? [], "follower");
}

export async function removeFollower(followerId: string): Promise<void> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await requireYunikoDb().from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "accepted");
  if (error) throw error;
}

export async function acceptFollowRequest(followerId: string): Promise<void> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await requireYunikoDb().from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "pending");
  if (error) throw error;
}

export async function rejectFollowRequest(followerId: string): Promise<void> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await requireYunikoDb().from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "pending");
  if (error) throw error;
}
