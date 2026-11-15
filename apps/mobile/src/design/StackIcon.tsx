import { StyleSheet, View } from 'react-native';

import type { Topic } from '@/backend/types';

import { Icon } from './Icon';
import { palette, topicTint } from './theme';

/** An empty Stack's icon background. */
const EMPTY_STACK = '#efe9dd';

/**
 * A Stack's square icon, drawn as two layered cards: tinted by the Topic of its first Idea, or
 * neutral while it is empty.
 */
export function StackIcon({ firstTopic }: { firstTopic: Topic | null }) {
  return (
    <View style={[styles.icon, { backgroundColor: firstTopic ? topicTint(firstTopic.hue) : EMPTY_STACK }]}>
      <Icon name="stacks" size={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    // The card behind: a card-coloured square inset by the border width, then its ink edge.
    boxShadow: `3px 3px 0px -1.5px ${palette.card}, 3px 3px 0px 0px ${palette.ink}`,
  },
});
