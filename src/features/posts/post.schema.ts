import { z } from "zod";

export const postVisibilitySchema = z.enum(["public", "followers", "private"]);

export const postMediaSchema = z.object({
  id: z.string(),
  fileName: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurhash: z.string().optional(),
  position: z.number().int().nonnegative(),
  status: z.enum(["uploading", "ready", "failed"]),
});

export const postDraftSchema = z.object({
  id: z.string(),
  caption: z.string().max(2200),
  visibility: postVisibilitySchema,
  media: z.array(postMediaSchema).min(1).max(10),
  createdAt: z.string().datetime(),
});

export type PostVisibility = z.infer<typeof postVisibilitySchema>;
export type PostMedia = z.infer<typeof postMediaSchema>;
export type PostDraft = z.infer<typeof postDraftSchema>;
