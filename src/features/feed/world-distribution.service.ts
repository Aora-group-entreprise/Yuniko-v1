/**
 * Compatibility boundary for the feed feature.
 * Phase 6 distribution logic lives in the dedicated distribution feature.
 */
export {
  DISTRIBUTION_STAGES,
  getCountryPerformance,
  getPostDistributionCountries,
  getPostDistributionStage,
  getWorldCohort,
  isPostDistributedToCountry,
} from "../distribution/distribution.service";
