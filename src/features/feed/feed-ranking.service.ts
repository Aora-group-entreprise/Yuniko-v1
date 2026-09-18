import type { ChronologicalFeed } from "./feed.schema";
import { rankFeedPosts } from "../../algorithms/feed-ranking";
import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

export async function getAlgorithmicFeed<T extends ChronologicalFeed>(feed: T): Promise<T> {
  const { data: { user } } = await requireSupabase().auth.getUser();
  if (!user || !feed.posts.length) return feed;
  const db = requireYunikoDb();

  const [{ data: follows }, { data: affinities }, { data: topicAffinities }, { data: distributions }] = await Promise.all([
    db.from("follows").select("following_id").eq("follower_id", user.id).eq("status","accepted"),
    db.from("user_affinity").select("target_user_id,score").eq("user_id", user.id),
    db.from("user_topic_affinity").select("topic_id,score").eq("user_id", user.id),\n    db.from("post_distribution").select("post_id,status,stage").in("post_id", feed.posts.map((post) => post.id)),
  ]);

  const followingIds = new Set((follows ?? []).map(row => row.following_id));
  const affinityByAuthor = new Map((affinities ?? []).map(row => [row.target_user_id, Number(row.score)]));
  const topicAffinity = new Map((topicAffinities ?? []).map(row => [row.topic_id, Number(row.score)]));\n  const distributionFactorByPost = new Map((distributions ?? []).map((row) => [\n    row.post_id, row.status === "stopped" ? 0 : row.status === "held" ? 0.5 : Math.min(1, 0.75 + Number(row.stage ?? 1) * 0.0625),\n  ]));

  return {
    ...feed,
    posts: rankFeedPosts(feed.posts, {
      followingIds,
      affinityByAuthor,
      topicAffinity,
      now: Date.now(),
    }),
  };
}

export async function markPostSeen(postId: string): Promise<void> {
  const { data: { user } } = await requireSupabase().auth.getUser();
  if (!user) return;
  await requireYunikoDb().from("seen_posts").upsert(
    { user_id: user.id, post_id: postId, seen_at: new Date().toISOString() },
    { onConflict: "user_id,post_id" },
  );
}
