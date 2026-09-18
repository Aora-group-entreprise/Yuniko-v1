import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

export async function getRecommendationSignals() {
  const { data: { user } } = await requireSupabase().auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const db = requireYunikoDb();
  const [{ data: affinities, error: affinityError }, { data: topics, error: topicError }] = await Promise.all([
    db.from("user_affinity").select("target_user_id,score,updated_at").eq("user_id", user.id).order("score", { ascending: false }).limit(200),
    db.from("user_topic_affinity").select("topic_id,score,updated_at").eq("user_id", user.id).order("score", { ascending: false }).limit(200),
  ]);
  if (affinityError) throw affinityError;
  if (topicError) throw topicError;
  return { affinities: affinities ?? [], topics: topics ?? [] };
}

export async function getRecommendedAuthorIds(limit = 50): Promise<string[]> {
  const signals = await getRecommendationSignals();
  return signals.affinities.slice(0, Math.max(1, Math.min(limit, 200))).map(row => row.target_user_id);
}
