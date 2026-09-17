import { z } from "zod";

export const storySchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string().min(1),
  authorUsername: z.string().min(1),
  authorAvatarUrl: z.string().url(),
  mediaUrl: z.string().url(),
  caption: z.string().max(180),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  viewed: z.boolean(),
});

export const storyLogSchema = z.array(storySchema);
export type Story = z.infer<typeof storySchema>;
