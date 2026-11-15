import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useBackend } from './BackendProvider';

/** How many Ideas the Home feed loads at a time. */
export const FEED_PAGE_SIZE = 10;

// Content never changes while the app runs, so nothing here goes stale.

/** Every Topic, ordered by name. */
export function useTopics() {
  const { content } = useBackend();
  return useQuery({ queryKey: ['topics'], queryFn: () => content.getTopics(), staleTime: Infinity });
}

/** The signed-in user's endless Home feed, shuffled by `seed`. Each page follows on from the last. */
export function useFeed(userId: string | undefined, seed: string) {
  const { content } = useBackend();
  return useInfiniteQuery({
    queryKey: ['feed', userId, seed],
    queryFn: ({ pageParam }) => content.getFeedPage({ seed, offset: pageParam, limit: FEED_PAGE_SIZE }),
    initialPageParam: 0,
    // The feed wraps around forever, so there is always a next page.
    getNextPageParam: (_lastPage, pages) => pages.length * FEED_PAGE_SIZE,
    enabled: userId !== undefined,
    staleTime: Infinity,
  });
}

export function useIdea(ideaId: string) {
  const { content } = useBackend();
  return useQuery({ queryKey: ['idea', ideaId], queryFn: () => content.getIdea(ideaId), staleTime: Infinity });
}

export function useTopicIdeas(topicId: string) {
  const { content } = useBackend();
  return useQuery({ queryKey: ['topicIdeas', topicId], queryFn: () => content.getTopicIdeas(topicId), staleTime: Infinity });
}

/** A Book and its Idea count. Disabled until `bookId` is known. */
export function useBook(bookId: string | undefined) {
  const { content } = useBackend();
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: () => content.getBook(bookId!),
    enabled: bookId !== undefined,
    staleTime: Infinity,
  });
}

export function useBookIdeas(bookId: string) {
  const { content } = useBackend();
  return useQuery({ queryKey: ['bookIdeas', bookId], queryFn: () => content.getBookIdeas(bookId), staleTime: Infinity });
}
