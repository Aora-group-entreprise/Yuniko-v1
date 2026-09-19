import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

export type LikeState = { postId: string; liked: boolean };

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

export async function getLikeState(postId: string): Promise<LikeState> {
  const userId = await currentUserId();
  const { data, error } = await requireYunikoDb().from("likes").select("post_id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (error) throw error;
  return { postId, liked: Boolean(data) };
}

export async function toggleLike(postId: string, nextLiked: boolean): Promise<LikeState> {
  const { data, error } = await requireYunikoDb().rpc("toggle_like_atomic", { p_post_id: postId, p_liked: nextLiked });
  if (error) throw error;
  return { postId, liked: Boolean(data) };
}
