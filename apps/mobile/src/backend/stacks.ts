import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend } from './BackendProvider';
import { useSession } from './session';
import type { Idea, NewStack, StackSummary } from './types';

const stacksKey = (userId: string | undefined) => ['stacks', userId] as const;
/** Every Idea's Stacks for one user: the prefix of {@link stacksWithKey}. */
const allStacksWithKey = (userId: string | undefined) => ['stacksWith', userId] as const;
const stacksWithKey = (userId: string | undefined, ideaId: string | undefined) => [...allStacksWithKey(userId), ideaId] as const;
const toggleStackKey = ['toggleStack'] as const;

/** The signed-in user's Stacks, newest first. */
export function useStacks() {
  const { userData } = useBackend();
  const { data: session } = useSession();
  return useQuery({
    queryKey: stacksKey(session?.userId),
    queryFn: () => userData.getStacks(),
    enabled: session?.userId !== undefined,
    staleTime: Infinity,
  });
}

/** The ids of the signed-in user's Stacks that hold the Idea. Undefined until they load. */
export function useStacksWith(ideaId: string | undefined): string[] | undefined {
  const { userData } = useBackend();
  const { data: session } = useSession();
  const { data } = useQuery({
    queryKey: stacksWithKey(session?.userId, ideaId),
    queryFn: () => userData.getStacksWith(ideaId!),
    enabled: session?.userId !== undefined && ideaId !== undefined,
    staleTime: Infinity,
  });
  return data;
}

/**
 * Adds an Idea to a Stack (`add: true`) or takes it out. The tick and the Stack's count change at
 * once and are undone if saving fails (ADR-0001). Like Likes, quick taps save at once, and the
 * lists resync when the last one settles.
 */
export function useToggleStack() {
  const { userData } = useBackend();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.userId;

  return useMutation({
    mutationKey: toggleStackKey,
    mutationFn: ({ stack, idea, add }: { stack: StackSummary; idea: Idea; add: boolean }) =>
      add ? userData.addToStack(stack.id, idea.id) : userData.removeFromStack(stack.id, idea.id),
    onMutate: async ({ stack, idea, add }) => {
      const withKey = stacksWithKey(userId, idea.id);
      await queryClient.cancelQueries({ queryKey: stacksKey(userId) });
      await queryClient.cancelQueries({ queryKey: withKey });
      const previousStacks = queryClient.getQueryData<StackSummary[]>(stacksKey(userId));
      const previousWith = queryClient.getQueryData<string[]>(withKey);

      const others = (previousWith ?? []).filter((id) => id !== stack.id);
      queryClient.setQueryData<string[]>(withKey, add ? [...others, stack.id] : others);
      queryClient.setQueryData<StackSummary[]>(stacksKey(userId), (stacks) =>
        stacks?.map((candidate) => {
          if (candidate.id !== stack.id) return candidate;
          const ideaCount = Math.max(0, candidate.ideaCount + (add ? 1 : -1));
          // An Idea added to an empty Stack is its first; otherwise the first stays until the resync.
          const firstTopic = ideaCount === 0 ? null : (candidate.firstTopic ?? idea.topic);
          return { ...candidate, ideaCount, firstTopic };
        }),
      );
      return { previousStacks, previousWith, withKey };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(stacksKey(userId), context.previousStacks);
      queryClient.setQueryData(context.withKey, context.previousWith);
    },
    onSettled: () => {
      // Resync with the server once the last of a quick run of toggles settles, so an earlier
      // one's refetch can't undo a later one's change on screen.
      if (queryClient.isMutating({ mutationKey: toggleStackKey }) !== 1) return;
      void queryClient.invalidateQueries({ queryKey: stacksKey(userId) });
      void queryClient.invalidateQueries({ queryKey: allStacksWithKey(userId) });
    },
  });
}

/** Creates a Stack, holding `ideaId` if given, and puts it at the top of the Stacks. */
export function useCreateStack() {
  const { userData } = useBackend();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.userId;

  return useMutation({
    mutationFn: (details: NewStack) => userData.createStack(details),
    onSuccess: async (stack, { ideaId }) => {
      // A fetch that started before the Stack existed would otherwise overwrite it when it lands.
      await queryClient.cancelQueries({ queryKey: stacksKey(userId) });
      if (ideaId !== undefined) await queryClient.cancelQueries({ queryKey: stacksWithKey(userId, ideaId) });
      queryClient.setQueryData<StackSummary[]>(stacksKey(userId), (stacks) => stacks && [stack, ...stacks]);
      if (ideaId !== undefined) {
        queryClient.setQueryData<string[]>(stacksWithKey(userId, ideaId), (ids) => ids && [...ids, stack.id]);
      }
    },
  });
}
