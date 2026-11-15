import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend } from './BackendProvider';
import { useSession } from './session';
import type { Idea } from './types';

const likedIdeasKey = (userId: string | undefined) => ['likedIdeas', userId] as const;
const toggleLikeKey = ['toggleLike'] as const;

/**
 * The signed-in user's Liked Ideas, newest first. Every heart and Like button reads this one list,
 * so liking anywhere shows everywhere at once.
 */
export function useLikedIdeas<T = Idea[]>(select?: (ideas: Idea[]) => T) {
  const { userData } = useBackend();
  const { data: session } = useSession();
  return useQuery({
    queryKey: likedIdeasKey(session?.userId),
    queryFn: () => userData.getLikedIdeas(),
    enabled: session?.userId !== undefined,
    staleTime: Infinity,
    select,
  });
}

/** Whether the signed-in user has liked the Idea. False until their Likes load. */
export function useIsLiked(ideaId: string | undefined): boolean {
  const { data } = useLikedIdeas((ideas) => ideas.some((idea) => idea.id === ideaId));
  return data ?? false;
}

/**
 * Likes (`like: true`) or unlikes an Idea. The change shows at once and is undone if saving it
 * fails (ADR-0001). Quick taps send their saves at once rather than one after another; whichever
 * lands last wins, and the list resyncs with it when the last one settles.
 */
export function useToggleLike() {
  const { userData } = useBackend();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const key = likedIdeasKey(session?.userId);

  return useMutation({
    mutationKey: toggleLikeKey,
    mutationFn: ({ idea, like }: { idea: Idea; like: boolean }) => (like ? userData.like(idea.id) : userData.unlike(idea.id)),
    onMutate: async ({ idea, like }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Idea[]>(key);
      const others = (previous ?? []).filter((candidate) => candidate.id !== idea.id);
      queryClient.setQueryData<Idea[]>(key, like ? [idea, ...others] : others);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      // Resync with the server once the last of a quick run of toggles settles, so an earlier
      // one's refetch can't undo a later one's change on screen.
      if (queryClient.isMutating({ mutationKey: toggleLikeKey }) === 1) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
