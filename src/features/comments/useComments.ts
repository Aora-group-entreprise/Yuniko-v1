import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createComment, deleteComment, listComments } from "./comments.service";

export const commentsQueryKey = (postId: string) => ["comments", postId] as const;

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: () => listComments(postId),
    staleTime: 15_000,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; parentId?: string | null }) =>
      createComment({ postId, body: input.body, parentId: input.parentId ?? null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["posts", postId] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["posts", postId] });
    },
  });
}
