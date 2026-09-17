import { parsePostContent } from "./post-content";
import { detectPostLanguage, type PostLanguage } from "./post-language";
import { publishPostSchema, type PostDraft, type PostMedia, type PostVisibility } from "./post.schema";

export interface UploadRequest {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
}

export interface PublishPostInput {
  id: string;
  caption: string;
  visibility: PostVisibility;
  media: PostMedia[];
  hashtags: string[];
  mentions: string[];
  languageHint: PostLanguage;
  createdAt: string;
}

/**
 * Phase 2 boundary: real signed storage URLs are supplied by the Phase 1
 * server function once auth/storage exist. The client never decides storage
 * permissions or post truth.
 */
export async function requestUploadUrls(media: PostMedia[]): Promise<UploadRequest[]> {
  void media;
  throw new Error("Media upload service is not configured yet. Complete the storage server function in Phase 1.");
}

export async function uploadMedia(_file: File, _upload: UploadRequest): Promise<void> {
  throw new Error("Direct media upload is not configured yet. Complete the signed storage endpoint in Phase 1.");
}

/** Pure preparation shared by the future server transaction boundary. */
export function preparePostPublishInput(draft: PostDraft): PublishPostInput {
  const parsed = publishPostSchema.parse(draft);
  const { hashtags, mentions } = parsePostContent(parsed.caption);

  return {
    id: parsed.id,
    caption: parsed.caption.trim(),
    visibility: parsed.visibility,
    media: parsed.media,
    hashtags,
    mentions,
    languageHint: detectPostLanguage(parsed.caption),
    createdAt: parsed.createdAt,
  };
}

export async function createPost(draft: PostDraft): Promise<PostDraft> {
  const prepared = preparePostPublishInput(draft);
  throw new Error(`Post service is not configured yet. Draft ${prepared.id} is ready for the server transaction.`);
}

export function createPostId(): string {
  return crypto.randomUUID();
}
