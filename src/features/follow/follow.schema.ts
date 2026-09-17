import { z } from "zod";

export const followStatusSchema = z.enum(["none", "pending", "following", "requested", "self"]);

export const followProfileSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url(),
  isPrivate: z.boolean(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  followStatus: followStatusSchema,
});

export type FollowProfile = z.infer<typeof followProfileSchema>;
export type FollowStatus = z.infer<typeof followStatusSchema>;
