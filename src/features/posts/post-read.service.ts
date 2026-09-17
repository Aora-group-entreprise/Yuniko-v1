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
});

export type PostRecord = z.infer<typeof postRecordSchema>;

const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoPosts: PostRecord[] = [
  { id: "p1", author: { id: "1", username: "sofia.park", displayName: "Sofia Park", avatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, caption: "Found a little more color on the way home.", hashtags: ["#nightwalk", "#citylight"], likeCount: 1247, commentCount: 38, saveCount: 91, shareCount: 17, viewCount: 8400, location: "Seoul, South Korea", createdAt: "2026-09-16T17:00:00.000Z" },
  { id: "p2", author: { id: "2", username: "noah.reyes", displayName: "Noah Reyes", avatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, caption: "The room changes when the bass comes in.", hashtags: ["#afterdark", "#soundcheck"], likeCount: 892, commentCount: 24, saveCount: 64, shareCount: 12, viewCount: 5200, createdAt: "2026-09-16T16:00:00.000Z" },
  { id: "p3", author: { id: "3", username: "lina.rose", displayName: "Lina Rose", avatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg` }, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, caption: "Tiny worlds hiding in plain sight.", hashtags: ["#softfocus"], likeCount: 634, commentCount: 19, saveCount: 42, shareCount: 8, viewCount: 3100, location: "Lisbon, Portugal", createdAt: "2026-09-16T15:00:00.000Z" },
];

export async function listPosts(): Promise<PostRecord[]> {
  return postRecordSchema.array().parse([...demoPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function listPostsByAuthor(authorId: string): Promise<PostRecord[]> {
  const posts = await listPosts();
  return posts.filter((post) => post.author.id === authorId);
}

export async function getPostById(postId: string): Promise<PostRecord> {
  const post = (await listPosts()).find((item) => item.id === postId);
  if (!post) throw new Error("Post not found");
  return post;
}

/**
 * Temporary Phase 2 write seam. The real implementation will execute the
 * authenticated server transaction and append post_edits in Phase 1/DB.
 */
export async function updatePostCaption(postId: string, caption: string): Promise<PostRecord> {
  const nextCaption = z.string().max(2200).parse(caption).trim();
  if (!nextCaption) throw new Error("Caption cannot be empty");

  const post = demoPosts.find((item) => item.id === postId);
  if (!post) throw new Error("Post not found");

  post.caption = nextCaption;
  return postRecordSchema.parse({ ...post });
}
