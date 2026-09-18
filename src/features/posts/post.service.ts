import { parsePostContent } from "./post-content";
import { detectPostLanguage, type PostLanguage } from "./post-language";
import {
  createPostTransactionInputSchema,
  type CreatePostTransactionInput,
  type CreatePostTransactionResult,
} from "./post-create.contract";
import { publishPostSchema, type PostDraft, type PostMedia, type PostVisibility } from "./post.schema";
import { readStoredJson, writeStoredJson } from "../../lib/storage";

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

const MEDIA_DB_NAME = "yuniko-local-media";
const MEDIA_STORE_NAME = "media";
const LOCAL_POSTS_KEY = "yuniko.local-posts.v1";

interface LocalPostMediaRecord {
  mediaId: string;
  blob: Blob;
}

interface LocalPublishedPost {
  id: string;
  caption: string;
  visibility: PostVisibility;
  media: CreatePostTransactionInput["media"];
  hashtags: string[];
  mentions: string[];
  languageHint: PostLanguage;
  createdAt: string;
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }
    const request = window.indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        db.createObjectStore(MEDIA_STORE_NAME, { keyPath: "mediaId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local media storage."));
  });
}

async function putLocalMedia(record: LocalPostMediaRecord): Promise<void> {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE_NAME, "readwrite");
    transaction.objectStore(MEDIA_STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to store local media."));
  });
  db.close();
}

export async function getLocalMediaUrl(mediaId: string): Promise<string | null> {
  try {
    const db = await openMediaDb();
    const record = await new Promise<LocalPostMediaRecord | undefined>((resolve, reject) => {
      const request = db.transaction(MEDIA_STORE_NAME, "readonly").objectStore(MEDIA_STORE_NAME).get(mediaId);
      request.onsuccess = () => resolve(request.result as LocalPostMediaRecord | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record ? URL.createObjectURL(record.blob) : null;
  } catch {
    return null;
  }
}

function readLocalPosts(): LocalPublishedPost[] {
  return readStoredJson<LocalPublishedPost[]>(LOCAL_POSTS_KEY, []);
}

function writeLocalPosts(posts: LocalPublishedPost[]): void {
  if (typeof window === "undefined") return;
  writeStoredJson(LOCAL_POSTS_KEY, posts);
}

/**
 * Frontend-only Phase 2 upload seam.
 *
 * In production this function will request signed storage URLs from a trusted
 * server function. For the current prototype, the upload target is IndexedDB
 * and the resulting metadata remains local to this browser.
 */
export async function requestUploadUrls(media: PostMedia[]): Promise<UploadRequest[]> {
  return media.map((item) => ({
    mediaId: item.id,
    uploadUrl: `indexeddb://yuniko/${encodeURIComponent(item.id)}`,
    publicUrl: `https://local.yuniko/media/${encodeURIComponent(item.id)}`,
  }));
}

export async function uploadMedia(file: File, upload: UploadRequest): Promise<void> {
  await putLocalMedia({ mediaId: upload.mediaId, blob: file });
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
 * Frontend-only Phase 2 persistence.
 *
 * This is intentionally local and is not presented as server truth. The same
 * validated transaction payload can later be sent to the real server function
 * without changing the composer contract.
 */
export async function createPostTransaction(
  input: CreatePostTransactionInput,
): Promise<CreatePostTransactionResult> {
  const validated = createPostTransactionInputSchema.parse(input);
  const posts = readLocalPosts();
  const withoutDuplicate = posts.filter((post) => post.id !== validated.id);
  withoutDuplicate.push(validated);
  writeLocalPosts(withoutDuplicate);
  return { postId: validated.id, status: "ready" };
}

export function getLocalPublishedPosts(): CreatePostTransactionInput[] {
  return readLocalPosts().map((post) => createPostTransactionInputSchema.parse(post));
}

export function createPostId(): string {
  return crypto.randomUUID();
}
