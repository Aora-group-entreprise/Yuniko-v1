import { requireYunikoDb } from "../../lib/supabase";

export type DistributionStage = 1 | 2 | 3 | 4;
export type DistributionDecision = "active" | "held" | "stopped";

const STAGE_COUNTRIES: Record<DistributionStage, number> = { 1: 3, 2: 5, 3: 7, 4: Number.MAX_SAFE_INTEGER };

export function getTargetCountryCount(stage: DistributionStage): number {
  return STAGE_COUNTRIES[stage];
}

export function evaluateDistribution(input: {
  stage: DistributionStage;
  impressions: number;
  engagementRate: number;
  velocity: number;
  secondChanceUsed: boolean;
}): { stage: DistributionStage; status: DistributionDecision; secondChance: boolean } {
  const { stage, impressions, engagementRate, velocity, secondChanceUsed } = input;
  if (impressions < 200) return { stage, status: "active", secondChance: false };
  const strong = engagementRate >= 0.04 && velocity >= 0.002;
  const weak = engagementRate < 0.01 && velocity < 0.0005;
  if (strong && stage < 4) return { stage: (stage + 1) as DistributionStage, status: "active", secondChance: false };
  if (weak) {
    if (!secondChanceUsed) return { stage, status: "held", secondChance: true };
    return { stage, status: "stopped", secondChance: false };
  }
  return { stage, status: "active", secondChance: false };
}

export async function getActiveDistribution(limit = 100) {
  const db = requireYunikoDb();
  const { data, error } = await db.from("post_distribution")
    .select("post_id,stage,countries,last_eval_at,impressions_at_stage,engagement_rate,velocity,status,second_chance_used")
    .eq("status", "active")
    .order("last_eval_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getDistributionForPost(postId: string) {
  const { data, error } = await requireYunikoDb().from("post_distribution")
    .select("post_id,stage,countries,last_eval_at,impressions_at_stage,engagement_rate,velocity,status,second_chance_used")
    .eq("post_id", postId).maybeSingle();
  if (error) throw error;
  return data;
}
