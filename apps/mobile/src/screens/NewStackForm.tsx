import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateStack } from '@/backend/stacks';
import type { Idea } from '@/backend/types';
import { Icon } from '@/design/Icon';
import { PillButton } from '@/design/PillButton';
import { TextField } from '@/design/TextField';
import { colors, palette, textStyle } from '@/design/theme';

/**
 * The New stack form, opened from the Add to stack sheet and covering the whole screen, tab bar
 * included. "Create & add" creates the Stack with `idea` in it and closes the form; it stays
 * greyed out until a name is typed, and without one it says so instead. Cancel and Android back
 * close the form, creating nothing. Like the prototype, it appears without an animation.
 */
export function NewStackForm({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const createStack = useCreateStack();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function create() {
    if (createStack.isPending) return;
    if (!name.trim()) return setError('Give your stack a name.');
    createStack.mutate(
      { name, description, ideaId: idea.id },
      // The prototype has no copy for a Stack that fails to save.
      { onSuccess: onClose, onError: () => setError('Something went wrong. Please try again.') },
    );
  }

  return (
    <Modal
      testID="new-stack-form"
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <PillButton label="Cancel" size="small" onPress={onClose} />
          <Text style={styles.title}>New stack</Text>
          <PillButton label="Create & add" size="small" weight={700} dimmed={!name.trim()} onPress={create} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextField
            label="Name"
            placeholder="e.g. Ideas for work"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
          />
          <TextField label="Description (optional)" rows={4} placeholder="What is this stack for?" value={description} onChangeText={setDescription} />
          {error !== '' && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <View style={styles.idea}>
            <Icon name="lightbulb" size={22} />
            <View style={styles.ideaText}>
              <Text style={styles.ideaEyebrow}>Will be added</Text>
              <Text style={styles.ideaTitle}>{idea.title}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { ...textStyle(17, 700), lineHeight: 21, color: palette.ink },
  scroll: { flex: 1 },
  content: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  error: { ...textStyle(14, 600), lineHeight: 17, color: colors.danger },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: palette.ink,
    backgroundColor: palette.acc,
  },
  ideaText: { flex: 1, minWidth: 0, gap: 2 },
  ideaEyebrow: { ...textStyle(12, 600), lineHeight: 15, color: palette.ink },
  ideaTitle: { ...textStyle(16, 400, { lineHeight: 1.35 }), color: palette.ink },
});
