import { getInteractionEvents } from "../events/events.service";
import { postCounterSchema, type PostCounter } from "./counter.schema";

export function getPostCounters(postId: string, base: Pick<PostCounter, "likes" | "comments" | "saves" | "shares">): PostCounter {
  const events = getInteractionEvents(postId);
  const count = (type: string) => events.filter((event) => event.type === type).length;
  return postCounterSchema.parse({
    postId,
    likes: Math.max(0, base.likes + count("like") - count("unlike")),
    comments: Math.max(0, base.comments + count("comment") + count("reply")),
    saves: Math.max(0, base.saves + count("save") - count("unsave")),
    shares: Math.max(0, base.shares + count("share")),
  });
}
