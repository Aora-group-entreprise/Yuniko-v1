import { z } from "zod";
import { requireYunikoDb, requireSupabase } from "../../lib/supabase";
import { myProfileSchema, profileUpdateSchema, publicProfileSchema, type MyProfile, type ProfileUpdateInput, type PublicProfile } from "./profile.schema";

export { profileUpdateSchema };
export type { ProfileUpdateInput };

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const db = requireYunikoDb();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,username,display_name,bio,avatar_url,banner_url,is_private,country_code,follower_count,following_count")
    .eq("username", username.trim())
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error("Profile not found.");

  const { data: posts, error: postsError } = await db
    .from("posts")
    .select("id,caption,created_at")
    .eq("author_id", profile.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (postsError) throw postsError;

  const postIds = (posts ?? []).map((post) => post.id);
  let mediaRows: Array<{ post_id: string; url: string; position: number }> = [];

  if (postIds.length > 0) {
    const { data: media, error: mediaError } = await db
      .from("post_media")
      .select("post_id,url,position")
      .in("post_id", postIds)
      .order("position", { ascending: true });

    if (mediaError) throw mediaError;
    mediaRows = media ?? [];
  }

  const mediaByPost = new Map<string, string>();
  for (const media of mediaRows) {
    if (!mediaByPost.has(media.post_id)) mediaByPost.set(media.post_id, media.url);
  }

  const { data: { user }, error: userError } = await requireSupabase().auth.getUser();
  if (userError) throw userError;

  let followStatus: PublicProfile["followStatus"] = "none";
  if (user) {
    if (user.id === profile.id) {
      followStatus = "self";
    } else {
      const { data: follow, error: followError } = await db
        .from("follows")
        .select("status")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle();

      if (followError) throw followError;
      followStatus = follow?.status === "accepted"
        ? "following"
        : follow?.status === "pending"
          ? "requested"
          : "none";
    }
  }

  return publicProfileSchema.parse({
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatar_url,
    bannerUrl: profile.banner_url,
    country: profile.country_code ?? undefined,
    followerCount: profile.follower_count,
    followingCount: profile.following_count,
    postCount: posts?.length ?? 0,
    isPrivate: profile.is_private,
    followStatus,
    posts: (posts ?? [])
      .map((post) => ({
        id: post.id,
        mediaUrl: mediaByPost.get(post.id),
        caption: post.caption ?? "",
        createdAt: post.created_at,
      }))
      .filter((post): post is { id: string; mediaUrl: string; caption: string; createdAt: string } => Boolean(post.mediaUrl)),
  });
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await requireYunikoDb()
    .from("profiles")
    .select("id,username,display_name,bio,avatar_url,banner_url,is_private,country_code,website,follower_count,following_count")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return myProfileSchema.parse(data);
}

export async function updateMyProfile(input: ProfileUpdateInput): Promise<MyProfile> {
  const parsed = profileUpdateSchema.parse(input);
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await requireYunikoDb()
    .from("profiles")
    .update({
      username: parsed.username.toLowerCase(),
      display_name: parsed.displayName,
      bio: parsed.bio,
      country_code: parsed.country?.trim() || null,
      website: parsed.website?.trim() || null,
    })
    .eq("id", user.id)
    .select("id,username,display_name,bio,avatar_url,banner_url,is_private,country_code,website,follower_count,following_count")
    .single();

  if (error) throw error;
  return myProfileSchema.parse(data);
}

export async function uploadMyAvatar(file: File): Promise<MyProfile> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Avatar must be a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Avatar must be smaller than 5 MB.");
  }

  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = client.storage.from("avatars").getPublicUrl(path);
  const { data, error } = await requireYunikoDb()
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", user.id)
    .select("id,username,display_name,bio,avatar_url,banner_url,is_private,country_code,website,follower_count,following_count")
    .single();

  if (error) throw error;
  return myProfileSchema.parse(data);
}
