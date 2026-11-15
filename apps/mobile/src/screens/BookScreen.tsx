import { useLocalSearchParams } from 'expo-router';

import { useBook, useBookIdeas } from '@/backend/content';
import { BookCover } from '@/design/BookCover';
import { ScreenStatus } from '@/design/ScreenStatus';

import { ideaCount } from './ideaCount';
import { IdeaListScreen, IdeaListStatus } from './IdeaListScreen';

/** A Book with its cover, and its Ideas, each with its Topic. */
export function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = useBook(id);
  const ideas = useBookIdeas(id);

  if (book.isError || ideas.isError) {
    return (
      <IdeaListStatus>
        <ScreenStatus
          error
          onRetry={() => {
            void book.refetch();
            void ideas.refetch();
          }}
        />
      </IdeaListStatus>
    );
  }
  if (!book.data || !ideas.data) {
    return (
      <IdeaListStatus>
        <ScreenStatus />
      </IdeaListStatus>
    );
  }

  return (
    <IdeaListScreen
      eyebrow="Book"
      title={book.data.title}
      subtitle={`${book.data.author} · ${ideaCount(book.data.ideaCount)}`}
      cover={<BookCover book={book.data} size="large" />}
      ideas={ideas.data}
      rowSubtitle={(idea) => idea.topic.name}
    />
  );
}
