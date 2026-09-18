import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCollection, listSaves, savePost, togglePostInCollection, unsavePost } from "./saves.service";

const queryKey = ["saves"] as const;

export function useSaves() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: listSaves, staleTime: 30_000 });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (saved) await unsavePost(postId);
      else await savePost(postId);
    },
    onMutate: async ({ postId, saved }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof listSaves>>>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          savedPosts: saved
            ? previous.savedPosts.filter((item) => item.postId !== postId)
            : [...previous.savedPosts, { postId, collectionIds: [], savedAt: new Date().toISOString() }],
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const collectionMutation = useMutation({
    mutationFn: togglePostInCollection,
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    savedPostIds: query.data?.savedPosts.map((item) => item.postId) ?? [],
    collections: query.data?.collections ?? [],
    toggleSave: (postId: string) => {
      const saved = query.data?.savedPosts.some((item) => item.postId === postId) ?? false;
      saveMutation.mutate({ postId, saved });
    },
    toggleCollection: (postId: string, collectionId: string) => collectionMutation.mutate({ postId, collectionId }),
    addCollection: (name: string) => createCollectionMutation.mutateAsync(name),
    isInCollection: (postId: string, collectionId: string) =>
      query.data?.savedPosts.find((item) => item.postId === postId)?.collectionIds.includes(collectionId) ?? false,
    isPending: saveMutation.isPending || collectionMutation.isPending || createCollectionMutation.isPending,
  };
}
