import { z } from "zod";
import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

const shareChannelSchema = z.string().trim().min(1).max(40);
const postIdSchema = z.string().uuid();

export async function recordShare(postId: string, channel: string): Promise<void> {
  postIdSchema.parse(postId);
  const parsedChannel = shareChannelSchema.parse(channel);
  const { data: { user }, error: authError } = await requireSupabase().auth.getUser();
  if (authError || !user) throw new Error("Authentication required.");

  const db = requireYunikoDb();
  const { error } = await db.from("shares").insert({
    post_id: postId,
    user_id: user.id,
    channel: parsedChannel,
  });
  if (error) throw error;

  const { error: eventError } = await db.from("events").insert({
    user_id: user.id,
    post_id: postId,
    type: "share.created",
    weight: 5,
  });
  if (eventError) throw eventError;
}
