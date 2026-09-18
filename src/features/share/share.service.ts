import { z } from "zod";
import { requireSupabase } from "../../lib/supabase";

const shareChannelSchema = z.string().trim().min(1).max(40);
const postIdSchema = z.string().uuid();

export async function recordShare(postId: string, channel: string): Promise<void> {
  postIdSchema.parse(postId);
  const parsedChannel = shareChannelSchema.parse(channel);
  const { data: { user }, error: authError } = await requireSupabase().auth.getUser();
  if (authError || !user) throw new Error("Authentication required.");

  const { error } = await requireSupabase().schema("yunikov_v1").rpc("record_share_atomic", {
    p_post_id: postId,
    p_user_id: user.id,
    p_channel: parsedChannel,
  });
  if (error) throw error;
}
