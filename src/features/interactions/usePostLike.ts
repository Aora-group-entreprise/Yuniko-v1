import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLikeState, toggleLike } from "./like.service";

export function usePostLike(postId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["post-like", postId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getLikeState(postId),
    enabled: Boolean(postId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (nextLiked: boolean) => toggleLike(postId, nextLiked),
    onMutate: async (nextLiked) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ postId: string; liked: boolean }>(queryKey);
      queryClient.setQueryData(queryKey, { postId, liked: nextLiked });
      return { previous };
    },
    onError: (_error, _nextLiked, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      else queryClient.invalidateQueries({ queryKey });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return {
    liked: query.data?.liked ?? false,
    isLoading: query.isLoading,
    isPending: mutation.isPending,
    toggle: () => mutation.mutate(!query.data?.liked),
  };
}
