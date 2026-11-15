import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useFeed } from '@/backend/content';
import { useSession } from '@/backend/session';
import type { Idea } from '@/backend/types';
import { RoundIconButton } from '@/design/RoundIconButton';
import { ScreenStatus } from '@/design/ScreenStatus';
import { palette, textStyle } from '@/design/theme';
import { useOpenInTab } from '@/navigation/useOpenInTab';
import { FeedCard } from '@/screens/FeedCard';

/** The next page loads once the user is this many cards from the end (the prototype's 4). */
const LOAD_AHEAD = 4;

/** A new shuffle of the feed each time Home mounts: on launch and after each log-in. */
const newSeed = () => Math.random().toString(36).slice(2);

/** Home: the endless feed, one full-height card at a time. */
export default function HomeScreen() {
  const { openIdea } = useOpenInTab();
  const { data: session } = useSession();
  const [seed] = useState(newSeed);
  const feed = useFeed(session?.userId, seed);
  const ideas = feed.data?.pages.flat() ?? [];
  const list = useRef<FlatList<Idea>>(null);
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  useEffect(() => {
    if (ideas.length > 0 && index >= ideas.length - LOAD_AHEAD && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [index, ideas.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  function move(by: number) {
    const next = Math.min(Math.max(0, index + by), Math.max(0, ideas.length - 1));
    if (next === index) return;
    setIndex(next);
    list.current?.scrollToOffset({ offset: next * height, animated: true });
  }

  function onSettle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (height > 0) setIndex(Math.round(event.nativeEvent.contentOffset.y / height));
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          mindfeed.
        </Text>
        <View style={styles.arrows}>
          <RoundIconButton icon="keyboard_arrow_up" size={38} accessibilityLabel="Previous idea" disabled={index === 0} onPress={() => move(-1)} />
          <RoundIconButton icon="keyboard_arrow_down" size={38} accessibilityLabel="Next idea" onPress={() => move(1)} />
        </View>
      </View>
      {feed.isPending ? (
        <ScreenStatus />
      ) : !feed.data ? (
        // Only when the first page failed: a later page failing keeps the cards already shown, and
        // the next card the user reaches tries it again.
        <ScreenStatus error onRetry={() => void feed.refetch()} />
      ) : (
        <FlatList
          ref={list}
          testID="home-feed"
          // The cards are as tall as the list, so nothing renders until its height is known.
          data={height > 0 ? ideas : []}
          // The feed wraps around, so an Idea can come back: a card is keyed by its position.
          keyExtractor={(_idea, position) => String(position)}
          renderItem={({ item, index: position }) => (
            <FeedCard
              testID={`feed-card-${position}`}
              idea={item}
              height={height}
              onOpen={() => openIdea(item.id)}
            />
          )}
          getItemLayout={(_data, position) => ({ length: height, offset: height * position, index: position })}
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
          onMomentumScrollEnd={onSettle}
          pagingEnabled
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          style={styles.feed}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, paddingRight: 16 },
  wordmark: { ...textStyle(26, 800, { letterSpacing: -0.045 }), color: palette.ink },
  arrows: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feed: { flex: 1 },
});
