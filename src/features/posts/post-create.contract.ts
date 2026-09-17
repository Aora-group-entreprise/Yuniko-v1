import { z } from "zod";

import { postVisibilitySchema } from "./post.schema";

export const uploadedPostMediaSchema = z.object({
  mediaId: z.string().min(1),
  publicUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurhash: z.string().optional(),
  position: z.number().int().nonnegative(),
  fileName: z.string().min(1),
});

export const createPostTransactionInputSchema = z.object({
  id: z.string().min(1),
  caption: z.string().max(2200),
  visibility: postVisibilitySchema,
  media: z.array(uploadedPostMediaSchema).min(1).max(10),
  hashtags: z.array(z.string()),
  mentions: z.array(z.string()),
  languageHint: z.enum(["EN", "FR", "unknown"]),
  createdAt: z.string().datetime(),
});

export const createPostTransactionResultSchema = z.object({
  postId: z.string().min(1),
  status: z.enum(["processing", "ready"]),
});

export type UploadedPostMedia = z.infer<typeof uploadedPostMediaSchema>;
export type CreatePostTransactionInput = z.infer<typeof createPostTransactionInputSchema>;
export type CreatePostTransactionResult = z.infer<typeof createPostTransactionResultSchema>;
