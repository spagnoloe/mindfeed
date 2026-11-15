import { useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

import { useBooks, useSearch, useTopicSummaries, useTrendingTopics } from '@/backend/content';
import type { SearchResult } from '@/backend/types';
import { BookCover } from '@/design/BookCover';
import { oklch } from '@/design/color';
import { ScreenTitle, SectionHeading } from '@/design/headings';
import { HighlightRow } from '@/design/HighlightRow';
import { Icon, type IconName } from '@/design/Icon';
import { PressableSurface } from '@/design/PressableSurface';
import { ScreenStatus } from '@/design/ScreenStatus';
import { colors, hardShadow, palette, textStyle, topicTint } from '@/design/theme';
import { tabScreenContent } from '@/navigation/tabScreenContent';
import { useOpenInTab } from '@/navigation/useOpenInTab';
import { ideaCount } from '@/screens/ideaCount';

/** How long after the last keystroke a search runs. */
const SEARCH_DELAY_MS = 200;

/**
 * Explore: the Trending topics, the Books and every Topic. Focusing the search bar swaps them for
 * search results; Cancel, or tapping the Explore tab again, swaps them back.
 */
export default function ExploreScreen() {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<TextInputInstance>(null);
  const navigation = useNavigation();

  const cancel = useCallback(() => {
    input.current?.blur();
    setSearching(false);
    setQuery('');
  }, []);

  // Tapping the tab while Explore is showing ends the search, as Cancel does. Coming from another
  // tab keeps it.
  useEffect(() => {
    const tabs = navigation.getParent<BottomTabNavigationProp<Record<string, undefined>>>();
    return tabs?.addListener('tabPress', () => {
      if (tabs.isFocused()) cancel();
    });
  }, [navigation, cancel]);

  return (
    <ScrollView contentContainerStyle={[tabScreenContent, styles.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {!searching && <ScreenTitle>explore.</ScreenTitle>}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Icon name="search" size={22} color={palette.mut} />
          <TextInput
            ref={input}
            accessibilityLabel="Search ideas, topics, books"
            placeholder="Search ideas, topics, books"
            // The design sets no placeholder colour, so it shows the browser's default grey.
            placeholderTextColor="#757575"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearching(true)}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        {searching && (
          <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        )}
      </View>
      {searching ? <SearchResults query={query} /> : <Browse />}
    </ScrollView>
  );
}

/** `value`, once it has stopped changing for `delayMs`. */
function useSettled<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

const RESULT_LOOK: Record<SearchResult['kind'], { icon: IconName; background: (result: SearchResult) => string }> = {
  topic: { icon: 'tag', background: (result) => topicTint(result.kind === 'topic' ? result.hue : 0, 0.01) },
  book: { icon: 'menu_book', background: () => palette.card },
  idea: { icon: 'lightbulb', background: () => colors.white },
};

const resultSubtitle = (result: SearchResult) => {
  switch (result.kind) {
    case 'topic':
      return `Topic · ${ideaCount(result.ideaCount)}`;
    case 'book':
      return `Book · ${result.author}`;
    case 'idea':
      return `Idea · ${result.bookTitle}`;
  }
};

/** The hint before the user types, then the results for what they typed once they pause. */
function SearchResults({ query }: { query: string }) {
  const settled = useSettled(query, SEARCH_DELAY_MS);
  const search = useSearch(settled);
  const { openTopic, openBook, openIdea } = useOpenInTab();
  const open = { topic: openTopic, book: openBook, idea: openIdea };

  let body;
  if (!query.trim()) body = <Text style={styles.searchNote}>Search across ideas, topics and books.</Text>;
  else if (search.isError) body = <ScreenStatus error onRetry={() => void search.refetch()} />;
  else if (!search.data) body = null;
  else if (search.data.length === 0) body = <Text style={styles.searchNote}>No results for “{settled}”.</Text>;
  else {
    body = search.data.map((result) => {
      const title = result.kind === 'topic' ? result.name : result.title;
      const look = RESULT_LOOK[result.kind];
      return (
        <Pressable
          key={`${result.kind}-${result.id}`}
          testID="search-result"
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => open[result.kind](result.id)}
          style={styles.result}
        >
          <View style={[styles.resultIcon, { backgroundColor: look.background(result) }]}>
            <Icon name={look.icon} size={20} />
          </View>
          <View style={styles.resultText}>
            <Text testID="search-result-title" style={styles.resultTitle}>
              {title}
            </Text>
            <Text testID="search-result-subtitle" style={styles.resultSubtitle}>
              {resultSubtitle(result)}
            </Text>
          </View>
        </Pressable>
      );
    });
  }

  return <View style={styles.results}>{body}</View>;
}

function Browse() {
  const trending = useTrendingTopics();
  const books = useBooks();
  const topics = useTopicSummaries();
  const { openTopic, openBook } = useOpenInTab();

  if (trending.isError || books.isError || topics.isError) {
    return (
      <ScreenStatus
        error
        onRetry={() => {
          void trending.refetch();
          void books.refetch();
          void topics.refetch();
        }}
      />
    );
  }
  if (!trending.data || !books.data || !topics.data) return <ScreenStatus />;

  return (
    <>
      <View style={styles.section}>
        <SectionHeading>Trending topics</SectionHeading>
        <View testID="trending-topics" style={styles.chips}>
          {trending.data.map((topic) => (
            <PressableSurface
              key={topic.id}
              accessibilityLabel={topic.name}
              onPress={() => openTopic(topic.id)}
              style={[styles.chip, { backgroundColor: topicTint(topic.hue, 0.01) }]}
            >
              <Icon name="trending_up" size={18} />
              <Text style={styles.chipLabel}>{topic.name}</Text>
            </PressableSurface>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading>Books</SectionHeading>
        <ScrollView
          testID="explore-books"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.shelf}
          contentContainerStyle={styles.shelfContent}
        >
          {books.data.map((book) => (
            <Pressable key={book.id} accessibilityRole="button" accessibilityLabel={book.title} onPress={() => openBook(book.id)}>
              <BookCover book={book} size="shelf" />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeading>All topics</SectionHeading>
        <View testID="all-topics" style={styles.topicList}>
          {topics.data.map((topic) => (
            <HighlightRow key={topic.id} accessibilityLabel={topic.name} onPress={() => openTopic(topic.id)} style={styles.topicRow}>
              <View style={[styles.dot, { backgroundColor: oklch(0.78, 0.11, topic.hue) }]} />
              <Text style={styles.topicName}>{topic.name}</Text>
              <Text style={styles.topicCount}>{ideaCount(topic.ideaCount)}</Text>
              <Icon name="chevron_right" size={20} color={palette.mut} />
            </HighlightRow>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 28 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // The design's bar is `height: 52px` as a content box, so with its 1.5px border it is 55 tall.
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 55,
    paddingHorizontal: 16,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.ink,
    borderRadius: 26,
    boxShadow: hardShadow(3),
  },
  searchInput: { ...textStyle(16, 400), flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, paddingHorizontal: 0, color: palette.ink },
  cancel: { paddingVertical: 8 },
  cancelLabel: { ...textStyle(15, 600), color: palette.ink },
  results: { marginTop: -8 },
  // The design's `line-height: normal` for 17px, as the browser renders it.
  searchNote: { ...textStyle(17, 400), lineHeight: 21, paddingVertical: 12, paddingHorizontal: 4, color: palette.mut },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1, minWidth: 0, gap: 3 },
  resultTitle: { ...textStyle(16, 600, { lineHeight: 1.25 }), color: palette.ink },
  resultSubtitle: { ...textStyle(13, 400), lineHeight: 16, color: palette.mut },
  section: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 42, paddingLeft: 12, paddingRight: 16, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipLabel: { ...textStyle(15, 600), lineHeight: 18, color: palette.ink },
  // The prototype's `margin:-8px -20px -18px; padding:8px 20px 24px`: covers scroll edge to edge, with room for their shadows.
  shelf: { marginTop: -8, marginHorizontal: -20, marginBottom: -18 },
  shelfContent: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  topicList: { backgroundColor: palette.card, borderWidth: 1.5, borderColor: palette.line, borderRadius: 20, overflow: 'hidden' },
  topicRow: { gap: 14, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: palette.line },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: palette.ink },
  // `line-height: normal` for 16px and 15px, as the browser renders them.
  topicName: { ...textStyle(16, 600), lineHeight: 20, flex: 1, color: palette.ink },
  // The design's `line-height: normal` for 13px, as the browser renders it.
  topicCount: { ...textStyle(13, 400), lineHeight: 16, color: palette.mut },
});
