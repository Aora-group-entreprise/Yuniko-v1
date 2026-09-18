import { requireYunikoDb } from "../../lib/supabase";

export type DistributionStage = 1 | 2 | 3 | 4;
export const DISTRIBUTION_STAGES = [1, 2, 3, 4] as const;
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


export type DistributionCountryMetric = {
  countryCode: string;
  impressions: number;
  engagements: number;
};

export function wilsonLowerBound(successes: number, trials: number, z = 1.96): number {
  if (trials <= 0 || successes < 0 || successes > trials) return 0;
  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials);
  return Math.max(0, (center - spread) / denominator);
}

export function chooseDistributionCountries(metrics: DistributionCountryMetric[], targetCount: number): string[] {
  return [...metrics]
    .filter(metric => metric.countryCode.trim() && metric.impressions > 0)
    .map(metric => ({ ...metric, rate: metric.engagements / metric.impressions, lowerBound: wilsonLowerBound(metric.engagements, metric.impressions) }))
    .sort((a, b) => b.lowerBound - a.lowerBound || b.rate - a.rate || b.impressions - a.impressions)
    .slice(0, Math.max(1, Math.min(targetCount, metrics.length)))
    .map(metric => metric.countryCode.trim().toUpperCase());
}

export function evaluateCountryDistribution(metrics: DistributionCountryMetric[], stage: DistributionStage, secondChanceUsed: boolean) {
  const countries = chooseDistributionCountries(metrics, getTargetCountryCount(stage));
  const totalImpressions = metrics.reduce((sum, metric) => sum + metric.impressions, 0);
  const totalEngagements = metrics.reduce((sum, metric) => sum + metric.engagements, 0);
  const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;
  const velocity = totalImpressions > 0 ? totalEngagements / Math.max(totalImpressions, 1) : 0;
  const decision = evaluateDistribution({ stage, impressions: totalImpressions, engagementRate, velocity, secondChanceUsed });
  return { ...decision, countries };
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


export async function getPostDistributionCountries(postId: string): Promise<string[]> {
  const row = await getDistributionForPost(postId);
  return Array.isArray(row?.countries) ? row.countries.filter((country): country is string => typeof country === "string") : [];
}

export async function getPostDistributionStage(postId: string): Promise<DistributionStage> {
  const row = await getDistributionForPost(postId);
  return (row?.stage ?? 1) as DistributionStage;
}

export async function isPostDistributedToCountry(postId: string, countryCode: string): Promise<boolean> {
  const countries = await getPostDistributionCountries(postId);
  return countries.includes(countryCode.trim().toUpperCase());
}

export async function getWorldCohort(stage: DistributionStage = 1) {
  const db = requireYunikoDb();
  const { data, error } = await db.from("post_distribution")
    .select("post_id,stage,countries,status")
    .eq("stage", stage)
    .eq("status", "active")
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getCountryPerformance(stage: DistributionStage = 1) {
  const cohort = await getWorldCohort(stage);
  const counts = new Map<string, number>();
  for (const row of cohort) {
    for (const country of Array.isArray(row.countries) ? row.countries : []) {
      if (typeof country === "string") counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([countryCode, posts]) => ({ countryCode, posts }));
}
