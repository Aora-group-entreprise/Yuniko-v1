import { commentsSchema, commentSchema, type Comment, type CommentAuthor } from "./comment.schema";

const STORAGE_KEY = "yuniko.comments.v1";

function readComments(): Comment[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = commentsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeComments(comments: Comment[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
}

export function listComments(postId: string): Comment[] {
  return readComments()
    .filter((comment) => comment.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listAllLocalComments(): Comment[] {
  return readComments();
}

export function createLocalComment(input: {
  postId: string;
  parentId?: string | null;
  author: CommentAuthor;
  body: string;
}): Comment {
  const comment = commentSchema.parse({
    id: `local-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId: input.postId,
    parentId: input.parentId ?? null,
    author: input.author,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  });

  writeComments([...readComments(), comment]);
  return comment;
}

export function deleteLocalComment(commentId: string): void {
  writeComments(readComments().filter((comment) => comment.id !== commentId));
}
