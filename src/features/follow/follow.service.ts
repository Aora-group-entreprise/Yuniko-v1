import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import type { FollowStatus } from "./follow.schema";

export async function getFollowProfile(username: string) {
  const db = requireYunikoDb();
  const { data: profile, error } = await db
    .from("profiles")
    .select("id,username,display_name,avatar_url,is_private,follower_count,following_count")
    .eq("username", username.trim())
    .single();
  if (error) throw error;
  if (!profile) throw new Error("Profile not found.");

  const { data: { user }, error: userError } = await requireSupabase().auth.getUser();
  if (userError) throw userError;

  let followStatus: FollowStatus = "none";
  if (user) {
    if (user.id === profile.id) followStatus = "self";
    else {
      const { data: follow, error: followError } = await db.from("follows")
        .select("status")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle();
      if (followError) throw followError;
      followStatus = follow?.status === "accepted" ? "following" : follow?.status === "pending" ? "requested" : "none";
    }
  }

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url ?? "",
    isPrivate: profile.is_private,
    followerCount: profile.follower_count,
    followingCount: profile.following_count,
    followStatus,
  };
}

export async function toggleFollow(profileId: string): Promise<FollowStatus> {
  const db = requireYunikoDb();
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");
  if (profileId === user.id) return "self";

  const { data: target, error: targetError } = await db
    .from("profiles")
    .select("id,is_private")
    .eq("id", profileId)
    .single();
  if (targetError) throw targetError;
  if (!target) throw new Error("Profile not found.");

  const { data: existing, error: existingError } = await db.from("follows")
    .select("id,status")
    .eq("follower_id", user.id)
    .eq("following_id", profileId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error } = await db.from("follows").delete().eq("id", existing.id);
    if (error) throw error;
    return "none";
  }

  const status = target.is_private ? "pending" : "accepted";
  const { error } = await db.from("follows").insert({
    follower_id: user.id,
    following_id: profileId,
    status,
  });
  if (error) throw error;
  return status === "accepted" ? "following" : "requested";
}

export async function acceptFollowRequest(followerId: string): Promise<FollowStatus> {
  const db = requireYunikoDb();
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await db.from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "pending");
  if (error) throw error;
  return "following";
}

export async function rejectFollowRequest(followerId: string): Promise<FollowStatus> {
  const db = requireYunikoDb();
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await db.from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "pending");
  if (error) throw error;
  return "none";
}

export function getFollowingProfileIds(): string[] {
  return [];
}

export function getFollowActorId(): string {
  return "";
}
