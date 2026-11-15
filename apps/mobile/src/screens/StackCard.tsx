import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StackSummary } from '@/backend/types';
import { Icon } from '@/design/Icon';
import { colors, palette, textStyle, topicTint } from '@/design/theme';

import { ideaCount } from './ideaCount';

/**
 * A Stack in the Library: a card with two more stacked behind it, tinted by the Topic of the
 * Stack's first Idea (neutral while empty), showing its name, an arrow and its Idea count. Like
 * the prototype's, it has no press effect and acts immediately.
 */
export function StackCard({ stack, onPress }: { stack: StackSummary; onPress: () => void }) {
  return (
    <Pressable
      testID="stack-card"
      accessibilityRole="button"
      accessibilityLabel={stack.name}
      onPress={onPress}
      style={[styles.card, { backgroundColor: stack.firstTopic ? topicTint(stack.firstTopic.hue) : colors.emptyStack }]}
    >
      <View style={styles.top}>
        <Text style={styles.name}>{stack.name}</Text>
        <Icon name="arrow_forward" size={20} />
      </View>
      <Text style={styles.count}>{ideaCount(stack.ideaCount)}</Text>
    </Pressable>
  );
}

/** Each card behind: a card-coloured copy inset by the border width, then its ink edge. */
const layer = (offset: number) => `${offset}px ${offset}px 0px -1.5px ${palette.card}, ${offset}px ${offset}px 0px 0px ${palette.ink}`;

const styles = StyleSheet.create({
  card: {
    height: 76,
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: palette.ink,
    borderRadius: 18,
    boxShadow: `${layer(5)}, ${layer(10)}`,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  name: { ...textStyle(18, 700, { lineHeight: 1.1, letterSpacing: -0.02 }), color: palette.ink, flexShrink: 1 },
  // The design's `line-height: normal`, as the browser renders it.
  count: { ...textStyle(13, 400), lineHeight: 16, color: palette.ink2 },
});
