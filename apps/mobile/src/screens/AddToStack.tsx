import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStacks, useStacksWith, useToggleStack } from '@/backend/stacks';
import type { Idea, StackSummary } from '@/backend/types';
import { BottomSheet } from '@/design/BottomSheet';
import { Icon } from '@/design/Icon';
import { ScreenStatus } from '@/design/ScreenStatus';
import { StackIcon } from '@/design/StackIcon';
import { colors, palette, textStyle } from '@/design/theme';

import { ideaCount } from './ideaCount';
import { NewStackForm } from './NewStackForm';

/**
 * The Add to stack sheet for one Idea: a New stack row, then every Stack with a check that files
 * the Idea in it or takes it out at once. New stack opens the New stack form over it; creating
 * a Stack there returns here. Done, a tap outside and Android back call `onClose`.
 */
export function AddToStack({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const stacks = useStacks();
  const filedIn = useStacksWith(idea.id);
  const toggleStack = useToggleStack();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <BottomSheet visible title="Add to stack" onClose={onClose}>
        <View style={styles.content}>
          <Text textBreakStrategy="balanced" style={styles.idea}>
            {idea.title}
          </Text>
          {/* Until both load, a row could show the wrong tick, and a tap would act on it. */}
          {stacks.isPending || (filedIn === undefined && !stacks.isError) ? (
            <ScreenStatus />
          ) : stacks.isError ? (
            <ScreenStatus error onRetry={() => void stacks.refetch()} />
          ) : (
            <View style={styles.list}>
              <Pressable accessibilityRole="button" accessibilityLabel="New stack" onPress={() => setCreating(true)} style={styles.row}>
                <View style={styles.newIcon}>
                  <Icon name="add" size={22} />
                </View>
                <Text style={styles.name}>New stack</Text>
              </Pressable>
              {stacks.data.map((stack) => (
                <StackRow
                  key={stack.id}
                  stack={stack}
                  checked={filedIn?.includes(stack.id) ?? false}
                  onPress={() => toggleStack.mutate({ stack, idea, add: !filedIn?.includes(stack.id) })}
                />
              ))}
            </View>
          )}
        </View>
      </BottomSheet>
      {creating && <NewStackForm idea={idea} onClose={() => setCreating(false)} />}
    </>
  );
}

/** A Stack in the sheet. It has no press effect, like the prototype's. */
function StackRow({ stack, checked, onPress }: { stack: StackSummary; checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={stack.name}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.row}
    >
      <StackIcon firstTopic={stack.firstTopic} />
      <View style={styles.text}>
        <Text style={styles.name}>{stack.name}</Text>
        <Text style={styles.count}>{ideaCount(stack.ideaCount)}</Text>
      </View>
      <Icon
        name={checked ? 'check_circle' : 'radio_button_unchecked'}
        size={26}
        color={checked ? palette.ink : colors.disabled}
        filled={checked}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  idea: { ...textStyle(19, 400, { lineHeight: 1.35 }), color: palette.ink2 },
  list: { backgroundColor: palette.card, borderWidth: 1.5, borderColor: palette.line, borderRadius: 20, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  newIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  // The design's `line-height: normal`, as the browser renders it.
  name: { ...textStyle(16, 600), lineHeight: 20, color: palette.ink },
  count: { ...textStyle(13, 400), lineHeight: 16, color: palette.mut },
});
