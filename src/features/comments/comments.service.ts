import { z } from "zod";
import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { commentSchema, type Comment, type CommentAuthor } from "./comment.schema";

const commentInputSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(1000),
});

async function currentUserId(): Promise<string> {
  const { data: { user }, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

async function authorMap(ids: string[]): Promise<Map<string, CommentAuthor>> {
  if (!ids.length) return new Map();
  const { data, error } = await requireYunikoDb()
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }]));
}

function toComment(row: {
  id: string; post_id: string; author_id: string; parent_id: string | null; body: string; created_at: string; deleted_at: string | null;
}, authors: Map<string, CommentAuthor>): Comment | null {
  const author = authors.get(row.author_id);
  if (!author || row.deleted_at !== null) return null;
  return commentSchema.parse({
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    author,
    body: row.body,
    createdAt: row.created_at,
  });
}

export async function listComments(postId: string): Promise<Comment[]> {
  const parsed = z.string().uuid().parse(postId);
  const { data, error } = await requireYunikoDb()
    .from("comments")
    .select("id,post_id,author_id,parent_id,body,created_at,deleted_at")
    .eq("post_id", parsed)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const authors = await authorMap([...new Set((data ?? []).map((row) => row.author_id))]);
  return (data ?? []).map((row) => toComment(row, authors)).filter((row): row is Comment => row !== null);
}

export async function createComment(input: { postId: string; parentId?: string | null; body: string }): Promise<Comment> {
  const validated = commentInputSchema.parse(input);
  const userId = await currentUserId();
  const db = requireYunikoDb();
  const { data, error } = await db.from("comments").insert({
    post_id: validated.postId,
    author_id: userId,
    parent_id: validated.parentId ?? null,
    body: validated.body,
  }).select("id,post_id,author_id,parent_id,body,created_at,deleted_at").single();
  if (error) throw error;

  const { error: eventError } = await db.from("events").insert({
    user_id: userId,
    post_id: validated.postId,
    type: "comment.created",
    weight: 3,
    metadata: { comment_id: data.id, parent_id: validated.parentId ?? null },
  });
  if (eventError) throw eventError;

  const authors = await authorMap([userId]);
  const comment = toComment(data, authors);
  if (!comment) throw new Error("Comment author profile is unavailable.");
  return comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const id = z.string().uuid().parse(commentId);
  const userId = await currentUserId();
  const { error } = await requireYunikoDb()
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", userId)
    .is("deleted_at", null);
  if (error) throw error;
}
