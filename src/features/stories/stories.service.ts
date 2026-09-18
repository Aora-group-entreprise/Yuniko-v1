import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { storyLogSchema, type Story } from "./story.schema";

type StoryRow = {
  id: string;
  author_id: string;
  media_url: string;
  created_at: string;
  expires_at: string;
  visibility: string;
  caption: string | null;
};

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return user.id;
}

async function mapStories(rows: StoryRow[]): Promise<Story[]> {
  if (!rows.length) return [];
  const db = requireYunikoDb();
  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const storyIds = rows.map((row) => row.id);
  const [{ data: profiles, error: profileError }, { data: views, error: viewError }] = await Promise.all([
    db.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds),
    db.from("story_views").select("story_id").eq("viewer_id", await currentUserId()).in("story_id", storyIds),
  ]);
  if (profileError) throw profileError;
  if (viewError) throw viewError;

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const viewed = new Set((views ?? []).map((view) => view.story_id));

  return storyLogSchema.parse(rows.map((row) => {
    const author = profileMap.get(row.author_id);
    if (!author) return null;
    return {
      id: row.id,
      authorId: row.author_id,
      authorName: author.display_name,
      authorUsername: author.username,
      authorAvatarUrl: author.avatar_url ?? "https://placehold.co/96x96",
      mediaUrl: row.media_url,
      caption: row.caption ?? "",
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      viewed: viewed.has(row.id) || row.author_id === author.id,
    };
  }).filter(Boolean));
}

export async function getActiveStories(): Promise<Story[]> {
  const db = requireYunikoDb();
  const { data, error } = await db.from("stories")
    .select("id,author_id,media_url,created_at,expires_at,visibility,caption")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return mapStories((data ?? []) as StoryRow[]);
}

export async function markStoryViewed(storyId: string): Promise<void> {
  const id = storyId.trim();
  if (!id) return;
  const viewerId = await currentUserId();
  const { error } = await requireYunikoDb().from("story_views").upsert(
    { story_id: id, viewer_id: viewerId, viewed_at: new Date().toISOString() },
    { onConflict: "story_id,viewer_id" },
  );
  if (error) throw error;
}

export async function createStory(file: File, caption = ""): Promise<Story> {
  if (!file || file.size <= 0) throw new Error("A story media file is required.");
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);
  if (!allowed.has(file.type)) throw new Error("Unsupported story media type.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Story media is too large.");
  const authorId = await currentUserId();
  const client = requireSupabase();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (file.type.startsWith("video/") ? "mp4" : "jpg");
  const objectKey = `${authorId}/stories/${crypto.randomUUID()}.${extension}`;
  const { data: upload, error: uploadError } = await client.storage.from("story-media").createSignedUploadUrl(objectKey);
  if (uploadError) throw uploadError;
  const { error: uploadFileError } = await client.storage.from("story-media").uploadToSignedUrl(objectKey, upload.signedUrl.split("/upload/sign/")[1]?.split("?")[0] ?? "", file);
  if (uploadFileError) throw uploadFileError;
  const mediaUrl = client.storage.from("story-media").getPublicUrl(objectKey).data.publicUrl;
  const db = requireYunikoDb();
  const now = new Date();
  const normalizedCaption = caption.trim().slice(0, 180);
  const { data, error } = await db.from("stories").insert({
    author_id: authorId,
    media_url: mediaUrl,
    caption: normalizedCaption || null,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    visibility: "public",
  }).select("id,author_id,media_url,created_at,expires_at,visibility,caption").single();
  if (error) throw error;
  const stories = await mapStories([data as StoryRow]);
  const created = stories[0];
  if (!created) throw new Error("Unable to load created story.");
  return { ...created, viewed: true };
}

export function subscribeToStories(listener: () => void): () => void {
  const client = requireSupabase();
  const channel = client.channel(`stories:feed:${Date.now()}`).on("postgres_changes", {
    event: "*",
    schema: "yunikov_v1",
    table: "stories",
  }, listener);
  void channel.subscribe();
  return () => { void client.removeChannel(channel); };
}
