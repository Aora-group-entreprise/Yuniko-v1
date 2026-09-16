import { z } from "zod";

export const feedPostSchema = z.object({
  id: z.string(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().url(),
  }),
  mediaUrl: z.string().url(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative(),
  location: z.string().optional(),
  createdAt: z.string(),
});

export const feedStorySchema = z.object({
  id: z.string(),
  author: feedPostSchema.shape.author,
  mediaUrl: z.string().url(),
  viewed: z.boolean(),
});

export const chronologicalFeedSchema = z.object({
  posts: z.array(feedPostSchema),
  stories: z.array(feedStorySchema),
});

export type FeedPost = z.infer<typeof feedPostSchema>;
export type FeedStory = z.infer<typeof feedStorySchema>;
export type ChronologicalFeed = z.infer<typeof chronologicalFeedSchema>;
