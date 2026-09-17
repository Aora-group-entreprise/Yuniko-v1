import {
  createPostTransaction,
  prepareCreatePostTransaction,
  preparePostPublishInput,
  requestUploadUrls,
  uploadMedia,
  type PublishPostInput,
} from "./post.service";
import type { CreatePostTransactionResult } from "./post-create.contract";
import type { PostDraft } from "./post.schema";

export interface PublishProgress {
  stage: "validating" | "requesting_uploads" | "uploading" | "creating_post";
  completed: number;
  total: number;
}

export interface PublishDependencies {
  files: File[];
  onProgress?: (progress: PublishProgress) => void;
}

/**
 * Frontend-only Phase 2 orchestration.
 *
 * Media is compressed and persisted to IndexedDB, while validated post
 * metadata is persisted locally. No backend, Supabase, PostgreSQL or real
 * moderation pipeline is claimed here. The same preparation contract is kept
 * ready for the future trusted server transaction.
 */
export async function publishPost(
  draft: PostDraft,
  { files, onProgress }: PublishDependencies,
): Promise<CreatePostTransactionResult> {
  const prepared = preparePostPublishInput(draft);
  if (files.length !== prepared.media.length) {
    throw new Error("Selected media no longer matches the post draft.");
  }

  onProgress?.({ stage: "validating", completed: 0, total: files.length });

  onProgress?.({ stage: "requesting_uploads", completed: 0, total: files.length });
  const uploads = await requestUploadUrls(prepared.media);
  if (uploads.length !== files.length) {
    throw new Error("Local upload service returned an unexpected number of upload targets.");
  }

  onProgress?.({ stage: "uploading", completed: 0, total: files.length });
  let completed = 0;
  await Promise.all(uploads.map(async (upload, index) => {
    await uploadMedia(files[index], upload);
    completed += 1;
    onProgress?.({ stage: "uploading", completed, total: files.length });
  }));

  onProgress?.({ stage: "creating_post", completed: files.length, total: files.length });
  const transactionInput = prepareCreatePostTransaction(prepared, uploads);
  return createPostTransaction(transactionInput);
}
