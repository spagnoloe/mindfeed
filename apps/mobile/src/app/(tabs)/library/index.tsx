import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLikedIdeas, useToggleLike } from '@/backend/likes';
import type { Idea } from '@/backend/types';
import { ConfirmDialog } from '@/design/ConfirmDialog';
import { ScreenTitle } from '@/design/headings';
import { Icon } from '@/design/Icon';
import { IdeaRow } from '@/design/IdeaRow';
import { ScreenStatus } from '@/design/ScreenStatus';
import { SegmentedControl } from '@/design/SegmentedControl';
import { colors, palette, textStyle } from '@/design/theme';
import { tabScreenContent } from '@/navigation/tabScreenContent';
import { useOpenInTab } from '@/navigation/useOpenInTab';

type LibrarySide = 'liked' | 'stacks';

const SIDES = [
  { value: 'liked', label: 'Liked ideas' },
  { value: 'stacks', label: 'Stacks' },
] as const;

/** Library: the user's Liked Ideas and, from the Stacks ticket, their Stacks. */
export default function LibraryScreen() {
  const [side, setSide] = useState<LibrarySide>('liked');

  return (
    <ScrollView contentContainerStyle={[tabScreenContent, styles.content]} showsVerticalScrollIndicator={false}>
      <ScreenTitle>library.</ScreenTitle>
      <SegmentedControl options={SIDES} value={side} onChange={setSide} />
      {side === 'liked' ? (
        <LikedIdeas />
      ) : (
        // A placeholder until Stacks arrive: the prototype's empty-Stacks line, without its New stack button.
        <Text style={styles.stacksPlaceholder}>Create a stack, then add ideas to it from any idea.</Text>
      )}
    </ScrollView>
  );
}

/** The Liked Ideas, newest first. Each row's heart unlikes its Idea once the user confirms. */
function LikedIdeas() {
  const liked = useLikedIdeas();
  const toggleLike = useToggleLike();
  const { openIdea } = useOpenInTab();
  const [unliking, setUnliking] = useState<Idea | null>(null);

  if (liked.isPending) return <ScreenStatus />;
  if (liked.isError) return <ScreenStatus error onRetry={() => void liked.refetch()} />;

  return (
    <>
      {liked.data.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="favorite" size={32} color={palette.mut} />
          <Text style={styles.emptyTitle}>No liked ideas yet</Text>
          <Text style={styles.emptyBody}>Tap the heart on any idea to keep it here.</Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {liked.data.map((idea) => (
            <IdeaRow
              key={idea.id}
              testID="liked-idea"
              title={idea.title}
              subtitle={`${idea.book.title} · ${idea.topic.name}`}
              onPress={() => openIdea(idea.id)}
              action={{ icon: 'favorite', accessibilityLabel: 'Unlike', color: colors.liked, filled: true, onPress: () => setUnliking(idea) }}
            />
          ))}
        </View>
      )}
      <ConfirmDialog
        visible={unliking !== null}
        title="Remove from Liked?"
        body={`“${unliking?.title ?? ''}” will be removed from your Liked ideas.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (unliking) toggleLike.mutate({ idea: unliking, like: false });
          setUnliking(null);
        }}
        onCancel={() => setUnliking(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  rows: { gap: 10 },
  empty: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.line2,
    borderRadius: 22,
  },
  emptyTitle: { ...textStyle(17, 700), lineHeight: 21, color: palette.ink, textAlign: 'center' },
  emptyBody: { ...textStyle(16, 400, { lineHeight: 1.45 }), color: palette.mut, textAlign: 'center', maxWidth: 240 },
  stacksPlaceholder: {
    ...textStyle(16, 400, { lineHeight: 1.45 }),
    color: palette.mut,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
});
