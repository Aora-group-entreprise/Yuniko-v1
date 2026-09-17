import { z } from "zod";

export const moderationTargetTypeSchema = z.enum(["post", "user", "comment"]);
export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "hate",
  "violence",
  "sexual_content",
  "scam",
  "copyright",
  "other",
]);
export const reportStatusSchema = z.enum(["pending", "reviewed", "actioned", "dismissed"]);

export const reportSchema = z.object({
  id: z.string(),
  reporterId: z.string(),
  targetType: moderationTargetTypeSchema,
  targetId: z.string().min(1),
  reason: reportReasonSchema,
  description: z.string().max(500),
  status: reportStatusSchema,
  createdAt: z.string().datetime(),
});

export const blockSchema = z.object({
  id: z.string(),
  blockerId: z.string(),
  blockedId: z.string(),
  createdAt: z.string().datetime(),
});

export const reportLogSchema = z.array(reportSchema);
export const blockLogSchema = z.array(blockSchema);

export type ModerationTargetType = z.infer<typeof moderationTargetTypeSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
export type Report = z.infer<typeof reportSchema>;
export type Block = z.infer<typeof blockSchema>;
