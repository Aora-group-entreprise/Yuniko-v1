import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { getBlockedUserIds } from "../moderation/moderation.service";

export type RecommendationSignals = Awaited<ReturnType<typeof getRecommendationSignals>>;

export async function getRecommendationSignals() {
  const { data: { user } } = await requireSupabase().auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const db = requireYunikoDb();
  const [{ data: affinities, error: affinityError }, { data: topics, error: topicError }, blockedIds] = await Promise.all([
    db.from("user_affinity").select("target_user_id,score,updated_at").eq("user_id", user.id).order("score", { ascending: false }).limit(200),
    db.from("user_topic_affinity").select("topic_id,score,updated_at").eq("user_id", user.id).order("score", { ascending: false }).limit(200),
    getBlockedUserIds(),
  ]);
  if (affinityError) throw affinityError;
  if (topicError) throw topicError;
  const blocked = new Set(blockedIds);
  return { affinities: (affinities ?? []).filter(row => !blocked.has(row.target_user_id)), topics: topics ?? [] };
}

export async function getRecommendedAuthorIds(limit = 50): Promise<string[]> {
  const signals = await getRecommendationSignals();
  return signals.affinities.slice(0, Math.max(1, Math.min(limit, 200))).map(row => row.target_user_id);
}


export async function getRecommendedAuthorScores(limit = 50): Promise<Array<{ authorId: string; score: number }>> {
  const signals = await getRecommendationSignals();
  return signals.affinities
    .slice(0, Math.max(1, Math.min(limit, 200)))
    .map(row => ({ authorId: row.target_user_id, score: Number(row.score) }))
    .filter(row => Number.isFinite(row.score) && row.score > 0);
}

export function mergeRecommendationScores(base: number, recommendationScore: number, following: boolean): number {
  const affinity = Math.max(0, Math.min(1, recommendationScore / 10));
  return base + affinity * 0.12 + (following ? 0.04 : 0);
}
