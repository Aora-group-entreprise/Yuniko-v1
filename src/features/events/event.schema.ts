import { z } from "zod";

export const eventTypeSchema = z.enum(["like", "comment", "reply", "save", "unsave", "collection_add", "collection_remove", "share"]);

export const interactionEventSchema = z.object({
  id: z.string(),
  type: eventTypeSchema,
  postId: z.string(),
  actorId: z.string(),
  targetId: z.string().optional(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const eventLogSchema = z.array(interactionEventSchema);
export type EventType = z.infer<typeof eventTypeSchema>;
export type InteractionEvent = z.infer<typeof interactionEventSchema>;
