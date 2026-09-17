import { getInteractionEvents } from "../events/events.service";
import {
  DISTRIBUTION_RULES,
  DISTRIBUTION_STAGES,
  normalizeCountryCodes,
} from "../../algorithms/feed-distribution";
import {
  distributionStateSchema,
  type CountryPerformance,
  type DistributionStage,
  type DistributionState,
} from "../distribution/distribution.schema";

const STATE_KEY = "yuniko.post-distribution.v1";
const DEFAULT_COHORT = ["MG", "FR", "US", "BR", "IN", "NG", "JP"];

function readState(): DistributionState {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STATE_KEY) ?? "{}");
    const result = distributionStateSchema.safeParse(parsed);
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

function writeState(state: DistributionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Best effort only.
  }
}

function countryFromEvent(event: ReturnType<typeof getInteractionEvents>[number]): string | null {
  const value = event.metadata?.countryCode?.trim().toUpperCase();
  return value || null;
}

export function getWorldCohort(): string[] {
  if (typeof window === "undefined") return DEFAULT_COHORT;
  try {
    const raw = JSON.parse(window.localStorage.getItem("yuniko.world-cohort.v1") ?? "[]");
    if (!Array.isArray(raw)) return DEFAULT_COHORT;
    const cohort = normalizeCountryCodes(raw.filter((value): value is string => typeof value === "string"));
    return cohort.length >= 3 ? cohort : DEFAULT_COHORT;
  } catch {
    return DEFAULT_COHORT;
  }
}

export function getCountryPerformance(postId: string): CountryPerformance[] {
  const byCountry = new Map<string, CountryPerformance>();

  for (const event of getInteractionEvents(postId)) {
    const countryCode = countryFromEvent(event);
    if (!countryCode) continue;

    const current = byCountry.get(countryCode) ?? {
      countryCode,
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
    };

    if (event.type === "view") current.views += 1;
    if (event.type === "like") current.likes += 1;
    if (event.type === "unlike") current.likes = Math.max(0, current.likes - 1);
    if (event.type === "comment" || event.type === "reply") current.comments += 1;
    if (event.type === "save") current.saves += 1;
    if (event.type === "unsave") current.saves = Math.max(0, current.saves - 1);
    if (event.type === "share") current.shares += 1;

    byCountry.set(countryCode, current);
  }

  return [...byCountry.values()];
}

function cohortPerformance(postId: string, countries: string[]): CountryPerformance[] {
  const allowed = new Set(normalizeCountryCodes(countries));
  return getCountryPerformance(postId).filter((item) => allowed.has(item.countryCode));
}

function cohortViews(postId: string, countries: string[]): number {
  return cohortPerformance(postId, countries).reduce((sum, item) => sum + item.views, 0);
}

function cohortStrength(postId: string, countries: string[]): number {
  const performance = cohortPerformance(postId, countries);
  const views = performance.reduce((sum, item) => sum + item.views, 0);
  if (views < DISTRIBUTION_RULES.minimumViewsForPromotion) return 0;

  const weightedActions = performance.reduce(
    (sum, item) => sum + item.likes + item.comments * 2 + item.saves * 3 + item.shares * 3,
    0,
  );
  return weightedActions / views;
}

function nextStage(stage: DistributionStage): DistributionStage {
  if (stage === 3) return 5;
  if (stage === 5) return 7;
  if (stage === 7) return "global";
  return "global";
}

/**
 * Phase 6 progressive global distribution.
 * Each stage has its own view window: 3 -> 5 -> 7 -> global.
 * The ordered cohort is cumulative, so every promoted stage retains all
 * countries from the previous stage.
 */
export function getPostDistributionStage(postId: string): DistributionStage {
  const state = readState();
  const currentState = state[postId] ?? { stage: 3 as DistributionStage, viewsAtStageStart: 0 };
  const current = currentState.stage;

  if (current === "global") return current;

  const cohort = getWorldCohort();
  const activeCountries = cohort.slice(0, current);
  const totalViews = cohortViews(postId, activeCountries);
  const stageViews = Math.max(0, totalViews - currentState.viewsAtStageStart);

  if (stageViews < DISTRIBUTION_RULES.minimumViewsForPromotion) {
    if (!state[postId]) {
      state[postId] = currentState;
      writeState(state);
    }
    return current;
  }

  const strength = cohortStrength(postId, activeCountries);
  if (strength < DISTRIBUTION_RULES.strongAudienceRate) return current;

  const promoted = nextStage(current);
  state[postId] = {
    stage: promoted,
    viewsAtStageStart: totalViews,
  };
  writeState(state);
  return promoted;
}

export function getPostDistributionCountries(postId: string): string[] | null {
  const stage = getPostDistributionStage(postId);
  if (stage === "global") return null;
  return getWorldCohort().slice(0, stage);
}

export function isPostDistributedToCountry(postId: string, countryCode: string): boolean {
  const normalizedCountry = countryCode.trim().toUpperCase();
  const countries = getPostDistributionCountries(postId);
  return countries === null || countries.includes(normalizedCountry);
}

export { DISTRIBUTION_STAGES };
