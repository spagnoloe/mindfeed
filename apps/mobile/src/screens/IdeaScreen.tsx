import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBook, useIdea } from '@/backend/content';
import { useIsLiked, useToggleLike } from '@/backend/likes';
import { BackHeader } from '@/design/BackHeader';
import { BookCover } from '@/design/BookCover';
import { Icon } from '@/design/Icon';
import { PillButton } from '@/design/PillButton';
import { PressableSurface } from '@/design/PressableSurface';
import { ScreenStatus } from '@/design/ScreenStatus';
import { palette, textStyle, topicTint } from '@/design/theme';
import { useOpenInTab } from '@/navigation/useOpenInTab';

import { ideaCount } from './ideaCount';

/**
 * Idea Detail, pushed within the current tab. The Topic chip and the Source card open the Topic
 * and the Book. Like likes or unlikes the Idea at once, with no confirmation, and turns ink-filled
 * "Liked" while liked. Add to stack is shown but does nothing yet.
 */
export function IdeaScreen() {
  const { openTopic, openBook } = useOpenInTab();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idea = useIdea(id);
  const book = useBook(idea.data?.book.id);
  const liked = useIsLiked(id);
  const toggleLike = useToggleLike();

  return (
    <View style={styles.screen}>
      <BackHeader />
      {idea.isPending ? (
        <ScreenStatus />
      ) : idea.isError ? (
        <ScreenStatus error onRetry={() => void idea.refetch()} />
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <PressableSurface
              accessibilityLabel={`Topic: ${idea.data.topic.name}`}
              onPress={() => openTopic(idea.data.topic.id)}
              style={[styles.topicChip, { backgroundColor: topicTint(idea.data.topic.hue, 0.01) }]}
            >
              <Text style={styles.topicLabel}>{idea.data.topic.name}</Text>
            </PressableSurface>
            <Text accessibilityRole="header" textBreakStrategy="balanced" style={styles.title}>
              {idea.data.title}
            </Text>
            <Text style={styles.explanation}>{idea.data.explanation}</Text>
            <PressableSurface
              accessibilityLabel={`Source: ${idea.data.book.title}`}
              onPress={() => openBook(idea.data.book.id)}
              style={styles.source}
            >
              <View style={styles.sourceRow}>
                <BookCover book={idea.data.book} size="medium" />
                <View style={styles.sourceText}>
                  <Text style={styles.sourceEyebrow}>Source</Text>
                  <Text style={styles.sourceTitle}>{idea.data.book.title}</Text>
                  <Text style={styles.sourceMeta}>
                    {/* The count follows once the Book loads; until then, just the author. */}
                    {book.data ? `${idea.data.book.author} · ${ideaCount(book.data.ideaCount)}` : idea.data.book.author}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={palette.mut} />
              </View>
            </PressableSurface>
          </ScrollView>
          <View style={styles.actions}>
            <PillButton
              label={liked ? 'Liked' : 'Like'}
              icon="favorite"
              iconFilled={liked}
              tone={liked ? 'ink' : 'white'}
              size="bar"
              onPress={() => toggleLike.mutate({ idea: idea.data, liked: !liked })}
              style={styles.action}
            />
            <PillButton label="Add to stack" icon="library_add" size="bar" onPress={() => {}} style={styles.action} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingTop: 4, paddingHorizontal: 24, paddingBottom: 28, gap: 18, alignItems: 'flex-start' },
  topicChip: { height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center' },
  topicLabel: { ...textStyle(12, 600, { letterSpacing: 0.05 }), lineHeight: 15, textTransform: 'uppercase', color: palette.ink },
  title: { ...textStyle(36, 700, { lineHeight: 1.02, letterSpacing: -0.035 }), color: palette.ink },
  explanation: { ...textStyle(18, 400, { lineHeight: 1.55 }), color: palette.ink2 },
  source: { alignSelf: 'stretch', marginTop: 8, borderRadius: 22, backgroundColor: palette.card, paddingVertical: 12, paddingLeft: 12, paddingRight: 14 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sourceText: { flex: 1, minWidth: 0, gap: 2 },
  sourceEyebrow: { ...textStyle(11, 600, { letterSpacing: 0.07 }), lineHeight: 14, textTransform: 'uppercase', color: palette.mut },
  sourceTitle: { ...textStyle(16, 700), lineHeight: 20, color: palette.ink },
  sourceMeta: { ...textStyle(15, 400), lineHeight: 18, color: palette.mut },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16, borderTopWidth: 1, borderTopColor: palette.line },
  action: { flex: 1 },
});
