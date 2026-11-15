import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { useLikedIdeas, useToggleLike } from '@/backend/likes';
import { useStacks } from '@/backend/stacks';
import type { Idea } from '@/backend/types';
import { ConfirmDialog } from '@/design/ConfirmDialog';
import { ScreenTitle } from '@/design/headings';
import { Icon } from '@/design/Icon';
import { IdeaRow } from '@/design/IdeaRow';
import { PillButton } from '@/design/PillButton';
import { ScreenStatus } from '@/design/ScreenStatus';
import { SegmentedControl } from '@/design/SegmentedControl';
import { colors, palette, textStyle } from '@/design/theme';
import { tabScreenContent } from '@/navigation/tabScreenContent';
import { useOpenInTab } from '@/navigation/useOpenInTab';
import { StackCard } from '@/screens/StackCard';
import { StackForm } from '@/screens/StackForm';

type LibrarySide = 'liked' | 'stacks';

const SIDES = [
  { value: 'liked', label: 'Liked ideas' },
  { value: 'stacks', label: 'Stacks' },
] as const;

/** Library: the user's Liked Ideas and their Stacks. */
export default function LibraryScreen() {
  const [side, setSide] = useState<LibrarySide>('liked');

  return (
    <ScrollView contentContainerStyle={[tabScreenContent, styles.content]} showsVerticalScrollIndicator={false}>
      <ScreenTitle>library.</ScreenTitle>
      <SegmentedControl options={SIDES} value={side} onChange={setSide} />
      {side === 'liked' ? <LikedIdeas /> : <Stacks />}
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

/** A New stack button over the user's Stacks, newest first. A Stack's card opens it. */
function Stacks() {
  const stacks = useStacks();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <View style={styles.stacks}>
      <PillButton label="New stack" icon="add" size="wide" weight={700} onPress={() => setCreating(true)} />
      {stacks.isPending ? (
        <ScreenStatus />
      ) : stacks.isError ? (
        <ScreenStatus error onRetry={() => void stacks.refetch()} />
      ) : stacks.data.length === 0 ? (
        <Text style={styles.stacksEmpty}>Create a stack, then add ideas to it from any idea.</Text>
      ) : (
        <View style={styles.stackCards}>
          {stacks.data.map((stack) => (
            <StackCard
              key={stack.id}
              stack={stack}
              onPress={() => router.push({ pathname: '/library/stack/[id]', params: { id: stack.id } })}
            />
          ))}
        </View>
      )}
      {creating && <StackForm onClose={() => setCreating(false)} />}
    </View>
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
  stacks: { gap: 18 },
  // Room on the right for the cards stacked behind.
  stackCards: { gap: 22, paddingRight: 10 },
  stacksEmpty: {
    ...textStyle(16, 400, { lineHeight: 1.45 }),
    color: palette.mut,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
});
