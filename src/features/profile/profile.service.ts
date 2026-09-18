import { z } from "zod";
import { requireSupabase } from "../../lib/supabase";
import { publicProfileSchema, type PublicProfile } from "./profile.schema";
import { listPostsByAuthor } from "../posts/post-read.service";
import { getFollowProfile } from "../follow/follow.service";

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

type DemoProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  country: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
};

const demoProfiles: DemoProfile[] = [
  {
    id: "1",
    username: "sofia.park",
    displayName: "Sofia Park",
    bio: "Finding color in ordinary days. Photography, city walks, and small moments.",
    avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`,
    country: "South Korea",
    followerCount: 12840,
    followingCount: 486,
    postCount: 18,
    isPrivate: false,
  },
  {
    id: "2",
    username: "noah.reyes",
    displayName: "Noah Reyes",
    bio: "Sound, late nights, and the energy between people.",
    avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`,
    country: "Mexico",
    followerCount: 8420,
    followingCount: 302,
    postCount: 12,
    isPrivate: false,
  },
  {
    id: "3",
    username: "lina.rose",
    displayName: "Lina Rose",
    bio: "Tiny worlds hiding in plain sight.",
    avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`,
    country: "Portugal",
    followerCount: 3910,
    followingCount: 214,
    postCount: 7,
    isPrivate: true,
  },
];

function getDemoProfile(username: string): DemoProfile {
  const profile = demoProfiles.find((item) => item.username === username);
  if (!profile) throw new Error("Profile not found");
  return profile;
}

/**
 * Phase 2 boundary: public profile and profile grid.
 * Profile posts are read through the shared post service so the grid and feed
 * use the same post records. Persistence connects here once Phase 1 exists.
 */
export async function getPublicProfile(username = demoProfiles[0].username): Promise<PublicProfile> {
  const profile = getDemoProfile(username);
  const posts = await listPostsByAuthor(profile.id);
  const followProfile = await getFollowProfile(profile.username);

  return publicProfileSchema.parse({
    ...profile,
    followStatus: followProfile.followStatus,
    posts: posts.map(({ id, mediaUrl, caption, createdAt }) => ({ id, mediaUrl, caption, createdAt })),
  });
}


export const profileUpdateSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().max(500),
  country: z.string().trim().max(80).optional(),
  website: z.string().trim().url().or(z.literal("")).optional(),
  isPrivate: z.boolean().optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export async function getMyProfile() {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;
  const { data, error } = await client.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(input: ProfileUpdateInput) {
  const parsed = profileUpdateSchema.parse(input);
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await client.from("profiles")
    .update({ ...parsed, username: parsed.username.toLowerCase(), updated_at: new Date().toISOString() })
    .eq("id", user.id).select().single();
  if (error) throw error;
  return data;
}

export async function uploadMyAvatar(file: File) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await client.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (uploadError) throw uploadError;
  const { data } = client.storage.from("avatars").getPublicUrl(path);
  const { data: profile, error } = await client.from("profiles").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id).select().single();
  if (error) throw error;
  return profile;
}
