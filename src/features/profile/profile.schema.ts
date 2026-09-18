import { z } from "zod";

const profilePostSchema = z.object({
  id: z.string().uuid(),
  mediaUrl: z.string().url(),
  caption: z.string(),
  createdAt: z.string().datetime(),
});

export const publicProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string(),
  avatarUrl: z.string().url().nullable(),
  bannerUrl: z.string().url().nullable(),
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

export const myProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(30),
  display_name: z.string().min(1).max(80),
  bio: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  banner_url: z.string().url().nullable(),
  is_private: z.boolean(),
  country_code: z.string().nullable(),
  website: z.string().url().nullable(),
  follower_count: z.number().int().nonnegative(),
  following_count: z.number().int().nonnegative(),
});

export type MyProfile = z.infer<typeof myProfileSchema>;
