import { createPostTransaction, prepareCreatePostTransaction, preparePostPublishInput, requestUploadUrls, uploadMedia, type PublishPostInput } from "./post.service";
import type { CreatePostTransactionResult } from "./post-create.contract";
import type { PostDraft } from "./post.schema";

export interface PublishProgress { stage: "validating" | "requesting_uploads" | "uploading" | "creating_post"; completed: number; total: number; }
export interface PublishDependencies { files: File[]; onProgress?: (progress: PublishProgress) => void; }

export async function publishPost(draft: PostDraft, { files, onProgress }: PublishDependencies): Promise<CreatePostTransactionResult> {
  const prepared = preparePostPublishInput(draft);
  if (files.length !== prepared.media.length) throw new Error("Selected media no longer matches the post draft.");
  onProgress?.({ stage: "validating", completed: 0, total: files.length });
  onProgress?.({ stage: "requesting_uploads", completed: 0, total: files.length });
  const uploads = await requestUploadUrls(prepared.media);
  if (uploads.length !== files.length) throw new Error("Upload service returned an unexpected number of targets.");
  onProgress?.({ stage: "uploading", completed: 0, total: files.length });
  let completed = 0;
  await Promise.all(uploads.map(async (upload,index) => {
    await uploadMedia(files[index], upload);
    completed += 1;
    onProgress?.({ stage: "uploading", completed, total: files.length });
  }));
  onProgress?.({ stage: "creating_post", completed: files.length, total: files.length });
  return createPostTransaction(prepareCreatePostTransaction(prepared, uploads));
}
