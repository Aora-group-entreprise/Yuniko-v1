import { create } from "zustand";
import type { Comment, CommentAuthor } from "./comment.schema";
import { createLocalComment, deleteLocalComment, listAllLocalComments } from "./comments.service";

const CURRENT_USER: CommentAuthor = {
  id: "1",
  username: "sofia.park",
  displayName: "Sofia Park",
  avatarUrl: "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public/scene-rooftop.jpg",
};

function initialComments(): Comment[] {
  return listAllLocalComments();
}

interface CommentsState {
  comments: Comment[];
  addComment: (postId: string, body: string, parentId?: string | null) => void;
  deleteComment: (commentId: string) => void;
}

export const useCommentsStore = create<CommentsState>((set) => ({
  comments: initialComments(),
  addComment: (postId, body, parentId = null) => {
    const value = body.trim();
    if (!value) return;

    const comment = createLocalComment({
      postId,
      parentId,
      author: CURRENT_USER,
      body: value,
    });

    set((state) => ({ comments: [...state.comments, comment] }));
  },
  deleteComment: (commentId) => {
    deleteLocalComment(commentId);
    set((state) => ({
      comments: state.comments.filter((comment) => comment.id !== commentId && comment.parentId !== commentId),
    }));
  },
}));

export { CURRENT_USER };
