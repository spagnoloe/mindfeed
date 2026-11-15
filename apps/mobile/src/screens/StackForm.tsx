import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCreateStack, useUpdateStack } from '@/backend/stacks';
import type { Idea, StackSummary } from '@/backend/types';
import { FormHeader, FullScreenModal } from '@/design/FullScreenModal';
import { Icon } from '@/design/Icon';
import { PillButton } from '@/design/PillButton';
import { TextField } from '@/design/TextField';
import { colors, palette, textStyle } from '@/design/theme';

/**
 * The stack form, covering the whole screen, tab bar included. It is one of:
 * - New stack with an Idea, from the Add to stack sheet: "Create & add" creates the Stack holding `idea`.
 * - New stack, from the Library: "Create" creates an empty Stack.
 * - Edit stack, from a Stack screen: prefilled with `stack`'s name and description; "Save" saves them.
 *
 * Its CTA closes the form once saved; it stays greyed out until a name is typed, and without one
 * it says so instead. Cancel and Android back close the form, saving nothing.
 */
export function StackForm({ idea, stack, onClose }: { idea?: Idea; stack?: StackSummary; onClose: () => void }) {
  const createStack = useCreateStack();
  const updateStack = useUpdateStack();
  const [name, setName] = useState(stack?.name ?? '');
  const [description, setDescription] = useState(stack?.description ?? '');
  const [error, setError] = useState('');
  const cta = stack ? 'Save' : idea ? 'Create & add' : 'Create';

  function save() {
    if (createStack.isPending || updateStack.isPending) return;
    if (!name.trim()) return setError('Give your stack a name.');
    // The prototype has no copy for a Stack that fails to save.
    const callbacks = { onSuccess: onClose, onError: () => setError('Something went wrong. Please try again.') };
    if (stack) updateStack.mutate({ stackId: stack.id, details: { name, description } }, callbacks);
    else createStack.mutate({ name, description, ideaId: idea?.id }, callbacks);
  }

  return (
    <FullScreenModal testID="stack-form" onClose={onClose}>
      <FormHeader
        title={stack ? 'Edit stack' : 'New stack'}
        onCancel={onClose}
        action={<PillButton label={cta} size="small" weight={700} dimmed={!name.trim()} onPress={save} />}
      />
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
        {idea && (
          <View style={styles.idea}>
            <Icon name="lightbulb" size={22} />
            <View style={styles.ideaText}>
              <Text style={styles.ideaEyebrow}>Will be added</Text>
              <Text style={styles.ideaTitle}>{idea.title}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
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
