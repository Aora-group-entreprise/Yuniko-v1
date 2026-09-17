import type { FeedPost } from "../features/feed/feed.schema";

export const DISTRIBUTION_STAGES = [3, 5, 7] as const;

export type DistributionStage = 3 | 5 | 7 | "global";

export type DistributionAudience = Pick<FeedPost, "likeCount" | "commentCount" | "saveCount" | "shareCount" | "viewCount">;

export type DistributionDecision = {
  stage: DistributionStage;
  countries: string[];
  isGlobal: boolean;
};

/**
 * Progressive world-feed rule:
 * 3 seed countries -> strong audience -> 5 countries -> strong audience
 * -> 7 countries -> strong audience -> worldwide.
 *
 * The thresholds are intentionally centralized so the eventual server model can
 * replace them with data-driven values without changing the feed UI.
 */
export const DISTRIBUTION_RULES = {
  minimumViewsForPromotion: 20,
  strongAudienceRate: 0.12,
  likeWeight: 1,
  commentWeight: 2,
  saveWeight: 3,
  shareWeight: 3,
} as const;

export function audienceStrength(audience: DistributionAudience): number {
  if (audience.viewCount <= 0) return 0;

  const positiveActions =
    audience.likeCount * DISTRIBUTION_RULES.likeWeight +
    audience.commentCount * DISTRIBUTION_RULES.commentWeight +
    audience.saveCount * DISTRIBUTION_RULES.saveWeight +
    audience.shareCount * DISTRIBUTION_RULES.shareWeight;

  return positiveActions / audience.viewCount;
}

export function hasStrongAudience(audience: DistributionAudience): boolean {
  return (
    audience.viewCount >= DISTRIBUTION_RULES.minimumViewsForPromotion &&
    audienceStrength(audience) >= DISTRIBUTION_RULES.strongAudienceRate
  );
}

export function getDistributionStage(audience: DistributionAudience): DistributionStage {
  if (!hasStrongAudience(audience)) return 3;

  // Frontend-only prototype: each promotion represents a successful stage.
  // The eventual backend will evaluate stage-specific country cohorts.
  const score = audienceStrength(audience);
  if (score >= 0.36) return "global";
  if (score >= 0.24) return 7;
  return 5;
}

export function getCountryLimit(stage: DistributionStage): number | null {
  return stage === "global" ? null : stage;
}

export function selectDistributionCountries(
  viewerCountry: string,
  preferredCountries: string[] = ["US", "FR", "BR", "IN", "NG", "JP", "ZA"],
): string[] {
  const normalizedViewer = viewerCountry.trim().toUpperCase();
  const ordered = [normalizedViewer, ...preferredCountries.map((country) => country.trim().toUpperCase())];
  return [...new Set(ordered)].filter(Boolean);
}

export function isPostDistributedToCountry(
  audience: DistributionAudience,
  viewerCountry: string,
): boolean {
  const stage = getDistributionStage(audience);
  if (stage === "global") return true;

  const countries = selectDistributionCountries(viewerCountry);
  return countries.slice(0, stage).includes(viewerCountry.trim().toUpperCase());
}

export function getDistributionDecision(
  audience: DistributionAudience,
  viewerCountry: string,
): DistributionDecision {
  const stage = getDistributionStage(audience);
  if (stage === "global") {
    return { stage, countries: [], isGlobal: true };
  }

  return {
    stage,
    countries: selectDistributionCountries(viewerCountry).slice(0, stage),
    isGlobal: false,
  };
}
