import { z } from "zod";

export const postCounterSchema = z.object({
  postId: z.string(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
});

export type PostCounter = z.infer<typeof postCounterSchema>;
