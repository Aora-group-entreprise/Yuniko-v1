import { parsePostContent } from "./post-content";
import { detectPostLanguage, type PostLanguage } from "./post-language";
import {
  createPostTransactionInputSchema,
  type CreatePostTransactionInput,
  type CreatePostTransactionResult,
} from "./post-create.contract";
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

/**
 * Builds the exact payload the future trusted server transaction will receive.
 * The uploaded public URLs come from the signed storage service; the client
 * does not create database rows or declare the post published.
 */
export function prepareCreatePostTransaction(
  prepared: PublishPostInput,
  uploads: UploadRequest[],
): CreatePostTransactionInput {
  if (uploads.length !== prepared.media.length) {
    throw new Error("Uploaded media no longer matches the post draft.");
  }

  return createPostTransactionInputSchema.parse({
    id: prepared.id,
    caption: prepared.caption,
    visibility: prepared.visibility,
    media: prepared.media.map((media, index) => ({
      mediaId: uploads[index].mediaId,
      publicUrl: uploads[index].publicUrl,
      width: media.width,
      height: media.height,
      blurhash: media.blurhash,
      position: media.position,
      fileName: media.fileName,
    })),
    hashtags: prepared.hashtags,
    mentions: prepared.mentions,
    languageHint: prepared.languageHint,
    createdAt: prepared.createdAt,
  });
}

/**
 * Trusted transaction seam. It intentionally fails closed until Phase 1
 * server functions, auth, storage and Postgres are implemented.
 */
export async function createPostTransaction(
  input: CreatePostTransactionInput,
): Promise<CreatePostTransactionResult> {
  const validated = createPostTransactionInputSchema.parse(input);
  throw new Error(
    `Post transaction server function is not configured yet. Payload ${validated.id} is validated and ready for trusted persistence.`,
  );
}

export function createPostId(): string {
  return crypto.randomUUID();
}
