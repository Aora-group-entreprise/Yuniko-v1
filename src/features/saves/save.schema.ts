import { z } from "zod";

export const savedPostSchema = z.object({
  postId: z.string(),
  collectionIds: z.array(z.string()),
  savedAt: z.string(),
});

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  createdAt: z.string(),
});

export const savesStateSchema = z.object({
  savedPosts: z.array(savedPostSchema),
  collections: z.array(collectionSchema),
});

export type SavedPost = z.infer<typeof savedPostSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type SavesState = z.infer<typeof savesStateSchema>;
