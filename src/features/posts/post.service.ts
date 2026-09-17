import { postDraftSchema, type PostDraft, type PostMedia } from "./post.schema";

export interface UploadRequest {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
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

export async function createPost(draft: PostDraft): Promise<PostDraft> {
  const parsed = postDraftSchema.parse(draft);
  throw new Error(`Post service is not configured yet. Draft ${parsed.id} is ready for the server transaction.`);
}

export function createPostId(): string {
  return crypto.randomUUID();
}
