import { z } from "zod";

export const distributionStageSchema = z.union([z.literal(3), z.literal(5), z.literal(7), z.literal("global")]);

export const distributionPostStateSchema = z.object({
  stage: distributionStageSchema,
  viewsAtStageStart: z.number().nonnegative(),
});

export const distributionStateSchema = z.record(z.string(), distributionPostStateSchema);

export const countryPerformanceSchema = z.object({
  countryCode: z.string().min(2),
  views: z.number().nonnegative(),
  likes: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  saves: z.number().nonnegative(),
  shares: z.number().nonnegative(),
});

export type DistributionStage = z.infer<typeof distributionStageSchema>;
export type DistributionPostState = z.infer<typeof distributionPostStateSchema>;
export type DistributionState = z.infer<typeof distributionStateSchema>;
export type CountryPerformance = z.infer<typeof countryPerformanceSchema>;
