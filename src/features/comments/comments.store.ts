import { create } from "zustand";
import type { Comment } from "./comment.schema";
import { listComments, createComment, deleteComment } from "./comments.service";

interface CommentsState {
  comments: Comment[];
  loading: boolean;
  load: (postId: string) => Promise<void>;
  addComment: (postId: string, body: string, parentId?: string | null) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
}

export const useCommentsStore = create<CommentsState>((set) => ({
  comments: [],
  loading: false,
  load: async (postId) => {
    set({ loading: true });
    try { set({ comments: await listComments(postId), loading: false }); }
    catch (error) { set({ loading: false }); throw error; }
  },
  addComment: async (postId, body, parentId = null) => {
    const comment = await createComment({ postId, body, parentId });
    set((state) => ({ comments: [...state.comments, comment] }));
    return comment;
  },
  deleteComment: async (commentId) => {
    await deleteComment(commentId);
    set((state) => ({ comments: state.comments.filter((item) => item.id !== commentId && item.parentId !== commentId) }));
  },
}));
