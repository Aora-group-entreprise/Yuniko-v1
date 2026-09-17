import { z } from "zod";

const postRecordSchema = z.object({
  id: z.string(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().url(),
  }),
  mediaUrl: z.string().url(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  saveCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative(),
  location: z.string().optional(),
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type PostRecord = z.infer<typeof postRecordSchema>;

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";
const DELETED_POSTS_KEY = "yuniko.deleted-posts.v1";
const EDITED_CAPTIONS_KEY = "yuniko.edited-captions.v1";

const demoPosts: PostRecord[] = [
  { id: "p1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, caption: "Found a little more color on the way home.", hashtags: ["#nightwalk", "#citylight"], likeCount: 1247, commentCount: 38, saveCount: 91, shareCount: 17, viewCount: 8400, location: "Seoul, South Korea", createdAt: "2026-09-16T17:00:00.000Z", deletedAt: null },
  { id: "p2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, caption: "The room changes when the bass comes in.", hashtags: ["#afterdark", "#soundcheck"], likeCount: 892, commentCount: 24, saveCount: 64, shareCount: 12, viewCount: 5200, createdAt: "2026-09-16T16:00:00.000Z", deletedAt: null },
  { id: "p3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, caption: "Tiny worlds hiding in plain sight.", hashtags: ["#softfocus"], likeCount: 634, commentCount: 19, saveCount: 42, shareCount: 8, viewCount: 3100, location: "Lisbon, Portugal", createdAt: "2026-09-16T15:00:00.000Z", deletedAt: null },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is best-effort in the frontend-only Phase 2 build.
  }
}

function getDeletedPostIds(): Set<string> {
  return new Set(readJson<string[]>(DELETED_POSTS_KEY, []));
}

function getEditedCaptions(): Record<string, string> {
  return readJson<Record<string, string>>(EDITED_CAPTIONS_KEY, {});
}

function materializePost(post: PostRecord): PostRecord {
  const deletedPostIds = getDeletedPostIds();
  const editedCaptions = getEditedCaptions();
  return {
    ...post,
    caption: editedCaptions[post.id] ?? post.caption,
    deletedAt: deletedPostIds.has(post.id) ? post.deletedAt ?? new Date().toISOString() : null,
  };
}

export async function listPosts(): Promise<PostRecord[]> {
  return postRecordSchema.array().parse(
    demoPosts.map(materializePost).filter((post) => !post.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listPostsByAuthor(authorId: string): Promise<PostRecord[]> {
  const posts = await listPosts();
  return posts.filter((post) => post.author.id === authorId);
}

export async function getPostById(postId: string): Promise<PostRecord> {
  const post = demoPosts.find((item) => item.id === postId);
  if (!post) throw new Error("Post not found");
  const materialized = materializePost(post);
  if (materialized.deletedAt) throw new Error("Post not found");
  return postRecordSchema.parse(materialized);
}

/**
 * Temporary Phase 2 write seam. The final server implementation will execute
 * the authenticated transaction and append post_edits in the database.
 * Until then, edited captions survive a page reload through localStorage.
 */
export async function updatePostCaption(postId: string, caption: string): Promise<PostRecord> {
  const nextCaption = z.string().max(2200).parse(caption).trim();
  if (!nextCaption) throw new Error("Caption cannot be empty");

  const post = demoPosts.find((item) => item.id === postId);
  if (!post) throw new Error("Post not found");
  const current = materializePost(post);
  if (current.deletedAt) throw new Error("Post not found");
  if (post.author.id !== "1") throw new Error("You can only edit your own posts");

  const editedCaptions = getEditedCaptions();
  editedCaptions[postId] = nextCaption;
  writeJson(EDITED_CAPTIONS_KEY, editedCaptions);
  return postRecordSchema.parse({ ...current, caption: nextCaption });
}

/**
 * Phase 2 soft-delete seam. The final server transaction will authorize the
 * author, adjust denormalized counters, remove related notifications, append
 * the event, and physically purge media after 30 days.
 *
 * For the current frontend-only build, the soft-delete marker is persisted in
 * localStorage so the post remains hidden after reload without destroying the
 * demo record.
 */
export async function deletePost(postId: string): Promise<void> {
  const post = demoPosts.find((item) => item.id === postId);
  if (!post) throw new Error("Post not found");
  const current = materializePost(post);
  if (current.deletedAt) throw new Error("Post not found");
  if (post.author.id !== "1") throw new Error("You can only delete your own posts");

  const deletedPostIds = getDeletedPostIds();
  deletedPostIds.add(postId);
  writeJson(DELETED_POSTS_KEY, [...deletedPostIds]);
}
