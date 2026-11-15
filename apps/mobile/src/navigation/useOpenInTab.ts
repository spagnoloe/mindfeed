import { useRouter, useSegments } from 'expo-router';

/** Where each tab keeps its own copy of the screens an Idea leads to. */
const tabRoutes = {
  home: { idea: '/idea/[id]', topic: '/topic/[id]', book: '/book/[id]' },
  library: { idea: '/library/idea/[id]', topic: '/library/topic/[id]', book: '/library/book/[id]' },
} as const;

/**
 * Opens an Idea, Topic or Book on top of the current tab, so it joins that tab's history and the
 * tab stays selected.
 */
export function useOpenInTab() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const routes = segments[1] === 'library' ? tabRoutes.library : tabRoutes.home;

  return {
    openIdea: (id: string) => router.push({ pathname: routes.idea, params: { id } }),
    openTopic: (id: string) => router.push({ pathname: routes.topic, params: { id } }),
    openBook: (id: string) => router.push({ pathname: routes.book, params: { id } }),
  };
}
