import { parsePostContent } from "./post-content";
import { detectPostLanguage, type PostLanguage } from "./post-language";
import { createPostTransactionInputSchema, type CreatePostTransactionInput, type CreatePostTransactionResult } from "./post-create.contract";
import { publishPostSchema, type PostDraft, type PostMedia, type PostVisibility } from "./post.schema";
import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { z } from "zod";

export interface UploadRequest { mediaId: string; uploadUrl: string; publicUrl: string; objectKey: string; }
export interface PublishPostInput { id: string; caption: string; visibility: PostVisibility; media: PostMedia[]; hashtags: string[]; mentions: string[]; languageHint: PostLanguage; createdAt: string; }

const postIdSchema = z.string().uuid();
const mediaUploadSchema = z.object({ mediaId: z.string().uuid(), publicUrl: z.string().url(), objectKey: z.string().min(1) });

export async function requestUploadUrls(media: PostMedia[]): Promise<UploadRequest[]> {
  const client = requireSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Not authenticated.");

  return Promise.all(media.map(async (item) => {
    const extension = item.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const objectKey = `${user.id}/posts/${item.id}.${extension}`;
    const { data, error: signedError } = await client.storage.from("post-media").createSignedUploadUrl(objectKey);
    if (signedError) throw signedError;
    const publicUrl = client.storage.from("post-media").getPublicUrl(objectKey).data.publicUrl;
    return { mediaId: item.id, uploadUrl: data.signedUrl, publicUrl, objectKey };
  }));
}

export async function uploadMedia(file: File, upload: UploadRequest): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.storage.from("post-media").uploadToSignedUrl(upload.objectKey, upload.uploadUrl.split("/upload/sign/")[1]?.split("?")[0] ?? "", file);
  if (error) throw error;
}

export function preparePostPublishInput(draft: PostDraft): PublishPostInput {
  const parsed = publishPostSchema.parse(draft);
  const { hashtags, mentions } = parsePostContent(parsed.caption);
  return { id: parsed.id, caption: parsed.caption.trim(), visibility: parsed.visibility, media: parsed.media, hashtags, mentions, languageHint: detectPostLanguage(parsed.caption), createdAt: parsed.createdAt };
}

export function prepareCreatePostTransaction(prepared: PublishPostInput, uploads: UploadRequest[]): CreatePostTransactionInput {
  if (uploads.length !== prepared.media.length) throw new Error("Uploaded media no longer matches the post draft.");
  return createPostTransactionInputSchema.parse({
    id: prepared.id, caption: prepared.caption, visibility: prepared.visibility,
    media: prepared.media.map((media,index)=>({mediaId:uploads[index].mediaId,publicUrl:uploads[index].publicUrl,width:media.width,height:media.height,blurhash:media.blurhash,position:media.position,fileName:media.fileName})),
    hashtags: prepared.hashtags, mentions: prepared.mentions, languageHint: prepared.languageHint, createdAt: prepared.createdAt,
  });
}

export async function createPostTransaction(input: CreatePostTransactionInput): Promise<CreatePostTransactionResult> {
  const validated = createPostTransactionInputSchema.parse(input);
  postIdSchema.parse(validated.id);
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated.");

  const db = requireYunikoDb();
  const { error: postError } = await db.from("posts").insert({
    id: validated.id,
    author_id: user.id,
    caption: validated.caption,
    visibility: validated.visibility,
    status: "ready",
    created_at: validated.createdAt,
  });
  if (postError) throw postError;

  const mediaRows = validated.media.map((media) => ({
    id: media.mediaId,
    post_id: validated.id,
    url: media.publicUrl,
    width: media.width,
    height: media.height,
    blurhash: media.blurhash,
    position: media.position,
    status: "ready",
    object_key: `${user.id}/posts/${media.mediaId}.${media.fileName.split(".").pop()?.toLowerCase() || "jpg"}`,
  }));
  const { error: mediaError } = await db.from("post_media").insert(mediaRows);
  if (mediaError) {
    await db.from("posts").delete().eq("id", validated.id);
    throw mediaError;
  }

  await db.from("post_stats").upsert({ post_id: validated.id });
  await db.from("post_distribution").upsert({ post_id: validated.id, stage: 1, countries: [] });
  await db.from("events").insert({ user_id: user.id, post_id: validated.id, type: "post_created", weight: 1 });

  return { postId: validated.id, status: "ready" };
}

export function createPostId(): string { return crypto.randomUUID(); }
