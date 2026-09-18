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
  const { data, error } = await requireYunikoDb()
    .from("likes")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();
  if (error) throw error;
  return { postId, liked: Boolean(data) };
}

export async function toggleLike(postId: string, nextLiked: boolean): Promise<LikeState> {
  const userId = await currentUserId();
  const db = requireYunikoDb();

  if (nextLiked) {
    const { error } = await db.from("likes").upsert(
      { user_id: userId, post_id: postId },
      { onConflict: "user_id,post_id", ignoreDuplicates: true },
    );
    if (error) throw error;

    const { error: eventError } = await db.from("events").insert({
      user_id: userId,
      post_id: postId,
      type: "like.created",
      weight: 1,
    });
    if (eventError) throw eventError;
  } else {
    const { error } = await db.from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    if (error) throw error;

    const { error: eventError } = await db.from("events").insert({
      user_id: userId,
      post_id: postId,
      type: "like.removed",
      weight: 1,
    });
    if (eventError) throw eventError;
  }

  return { postId, liked: nextLiked };
}
