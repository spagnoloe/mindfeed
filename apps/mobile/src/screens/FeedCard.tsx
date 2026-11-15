import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Idea } from '@/backend/types';
import { BookCover } from '@/design/BookCover';
import { InkPill } from '@/design/InkPill';
import { RoundIconButton } from '@/design/RoundIconButton';
import { hardShadow, palette, textStyle, topicTint } from '@/design/theme';

/** How many lines of the explanation a card shows. */
const EXPLANATION_LINES = 7;

/**
 * One full-height card of the Home feed, tinted by its Topic. Tapping it opens the Idea. Like and
 * Add to stack are shown but do nothing yet.
 */
export function FeedCard({ idea, height, onOpen, testID }: { idea: Idea; height: number; onOpen: () => void; testID?: string }) {
  return (
    <View testID={testID} style={[styles.slot, { height }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={idea.title}
        onPress={onOpen}
        style={[styles.card, { backgroundColor: topicTint(idea.topic.hue) }]}
      >
        <InkPill label={idea.topic.name} variant="card" />
        <View style={styles.middle}>
          <Text accessibilityRole="header" textBreakStrategy="balanced" style={styles.title}>
            {idea.title}
          </Text>
          <Text numberOfLines={EXPLANATION_LINES} style={styles.explanation}>
            {idea.explanation}
          </Text>
        </View>
        <View style={styles.footer}>
          <BookCover book={idea.book} size="small" />
          <View style={styles.book}>
            <Text numberOfLines={1} style={styles.bookTitle}>
              {idea.book.title}
            </Text>
            <Text numberOfLines={1} style={styles.author}>
              {idea.book.author}
            </Text>
          </View>
          <RoundIconButton icon="library_add" iconSize={21} accessibilityLabel="Add to stack" onPress={() => {}} />
          <RoundIconButton icon="favorite" iconSize={21} accessibilityLabel="Like" onPress={() => {}} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { paddingTop: 4, paddingRight: 20, paddingBottom: 18, paddingLeft: 16 },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: palette.ink,
    borderRadius: 30,
    boxShadow: hardShadow(4),
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  middle: { flex: 1, minHeight: 0, justifyContent: 'center', gap: 16 },
  title: { ...textStyle(34, 700, { lineHeight: 1.02, letterSpacing: -0.035 }), color: palette.ink },
  explanation: { ...textStyle(17, 400, { lineHeight: 1.5 }), color: palette.ink2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(31,29,26,0.14)',
  },
  book: { flex: 1, minWidth: 0, gap: 1 },
  bookTitle: { ...textStyle(14, 600), lineHeight: 17, color: palette.ink },
  author: { ...textStyle(14, 400), lineHeight: 17, color: palette.ink2 },
});
