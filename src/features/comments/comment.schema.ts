import { z } from "zod";

const commentAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url(),
});

export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  parentId: z.string().nullable(),
  author: commentAuthorSchema,
  body: z.string().trim().min(1).max(1000),
  createdAt: z.string(),
});

export const commentsSchema = z.array(commentSchema);

export type Comment = z.infer<typeof commentSchema>;
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;
