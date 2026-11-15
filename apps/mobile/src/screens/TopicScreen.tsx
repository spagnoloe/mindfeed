import { useLocalSearchParams } from 'expo-router';

import { useTopicIdeas, useTopics } from '@/backend/content';
import { ScreenStatus } from '@/design/ScreenStatus';

import { ideaCount } from './ideaCount';
import { IdeaListScreen, IdeaListStatus } from './IdeaListScreen';

/** A Topic and its Ideas, each with its Book and author. */
export function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topics = useTopics();
  const ideas = useTopicIdeas(id);
  const topic = topics.data?.find((candidate) => candidate.id === id);

  if (topics.isError || ideas.isError || (topics.isSuccess && !topic)) {
    return (
      <IdeaListStatus>
        <ScreenStatus
          error
          onRetry={() => {
            void topics.refetch();
            void ideas.refetch();
          }}
        />
      </IdeaListStatus>
    );
  }
  if (!topic || !ideas.data) {
    return (
      <IdeaListStatus>
        <ScreenStatus />
      </IdeaListStatus>
    );
  }

  return (
    <IdeaListScreen
      eyebrow="Topic"
      title={topic.name}
      subtitle={ideaCount(ideas.data.length)}
      ideas={ideas.data}
      rowSubtitle={(idea) => `${idea.book.title} · ${idea.book.author}`}
    />
  );
}
