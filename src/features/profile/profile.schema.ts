import { z } from "zod";

const profilePostSchema = z.object({
  id: z.string(),
  mediaUrl: z.string().url(),
  caption: z.string(),
  createdAt: z.string().datetime(),
});

export const publicProfileSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string(),
  avatarUrl: z.string().url(),
  country: z.string().optional(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  postCount: z.number().int().nonnegative(),
  isPrivate: z.boolean(),
  followStatus: z.enum(["none", "requested", "following", "self"]).optional(),
  posts: z.array(profilePostSchema),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type ProfilePost = z.infer<typeof profilePostSchema>;
