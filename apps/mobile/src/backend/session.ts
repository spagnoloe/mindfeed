import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useBackend } from './BackendProvider';

const sessionKey = ['session'] as const;
const interestsKey = (userId: string | undefined) => ['interests', userId] as const;

/** The current session, kept up to date as the user signs up, logs in or logs out. */
export function useSession() {
  const { auth } = useBackend();
  const queryClient = useQueryClient();

  useEffect(() => auth.onSessionChange((session) => queryClient.setQueryData(sessionKey, session)), [auth, queryClient]);

  return useQuery({ queryKey: sessionKey, queryFn: () => auth.getSession(), staleTime: Infinity });
}

/** The signed-in user's Interests (Topic ids). Disabled while nobody is signed in. */
export function useInterests(userId: string | undefined) {
  const { userData } = useBackend();
  return useQuery({
    queryKey: interestsKey(userId),
    queryFn: () => userData.getInterests(),
    enabled: userId !== undefined,
    staleTime: Infinity,
  });
}

/** Replaces the signed-in user's Interests. */
export function useSetInterests() {
  const { userData } = useBackend();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (topicIds: string[]) => userData.setInterests(topicIds),
    onSuccess: (_result, topicIds) => queryClient.setQueryData(interestsKey(session?.userId), topicIds),
  });
}
