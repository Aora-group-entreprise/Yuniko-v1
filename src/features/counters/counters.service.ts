import { getInteractionEvents } from "../events/events.service";
import { postCounterSchema, type PostCounter } from "./counter.schema";

export function getPostCounters(postId: string, base: Pick<PostCounter, "likes" | "comments" | "saves" | "shares">): PostCounter {
  const events = getInteractionEvents(postId);
  const delta = (positive: string, negative: string) => events.filter((event) => event.type === positive).length - events.filter((event) => event.type === negative).length;
  return postCounterSchema.parse({
    postId,
    likes: Math.max(0, base.likes + delta("like", "unsave")),
    comments: Math.max(0, base.comments + events.filter((event) => event.type === "comment").length + events.filter((event) => event.type === "reply").length),
    saves: Math.max(0, base.saves + delta("save", "unsave")),
    shares: Math.max(0, base.shares + events.filter((event) => event.type === "share").length),
  });
}
