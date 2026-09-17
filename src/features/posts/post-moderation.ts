import { z } from "zod";

export const mediaModerationDecisionSchema = z.enum(["allow", "limit", "block", "review"]);
export type MediaModerationDecision = z.infer<typeof mediaModerationDecisionSchema>;

export interface MediaModerationResult {
  decision: MediaModerationDecision;
  reason?: string;
}

/**
 * Safe Phase 2 boundary for the media moderation pipeline.
 *
 * The plan requires pHash + image classification (NSFW/violence) before a
 * post is accepted. Those checks must run in a trusted server/media worker;
 * this client seam deliberately does not make a security decision.
 */
export async function moderatePostMedia(_file: Blob): Promise<MediaModerationResult> {
  throw new Error("Media moderation service is not configured yet. Complete the trusted moderation pipeline before publishing.");
}

export function assertMediaAllowed(result: MediaModerationResult): void {
  if (result.decision !== "allow") {
    throw new Error(result.reason ?? `Media moderation result: ${result.decision}.`);
  }
}
