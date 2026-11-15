import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useDeleteStack, useStack, useToggleStack } from '@/backend/stacks';
import type { Idea } from '@/backend/types';
import { ConfirmDialog } from '@/design/ConfirmDialog';
import { RoundIconButton } from '@/design/RoundIconButton';
import { ScreenStatus } from '@/design/ScreenStatus';
import { palette } from '@/design/theme';

import { ideaCount } from './ideaCount';
import { IdeaListScreen, IdeaListStatus } from './IdeaListScreen';
import { StackForm } from './StackForm';

/**
 * One of the user's Stacks: its name, description and Ideas, first added first. Edit opens the
 * Edit stack form; delete, and each row's remove button, ask first.
 */
export function StackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const stack = useStack(id);
  const toggleStack = useToggleStack();
  const deleteStack = useDeleteStack();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<Idea | null>(null);

  if (stack.isError) {
    return (
      <IdeaListStatus>
        <ScreenStatus error onRetry={() => void stack.refetch()} />
      </IdeaListStatus>
    );
  }
  if (!stack.data) {
    return (
      <IdeaListStatus>
        <ScreenStatus />
      </IdeaListStatus>
    );
  }

  const data = stack.data;
  return (
    <>
      <IdeaListScreen
        eyebrow="Stack"
        title={data.name}
        description={data.description}
        subtitle={ideaCount(data.ideaCount)}
        headerActions={
          <>
            <RoundIconButton icon="edit" accessibilityLabel="Rename stack" onPress={() => setEditing(true)} />
            <RoundIconButton icon="delete" accessibilityLabel="Delete stack" onPress={() => setDeleting(true)} />
          </>
        }
        ideas={data.ideas}
        rowSubtitle={(idea) => `${idea.book.title} · ${idea.topic.name}`}
        rowAction={(idea) => ({ icon: 'remove_circle', accessibilityLabel: 'Remove from stack', color: palette.mut, onPress: () => setRemoving(idea) })}
        empty="This stack is empty. Add ideas from any idea page."
      />
      {editing && <StackForm stack={data} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        visible={removing !== null}
        title="Remove from stack?"
        body={`“${removing?.title ?? ''}” will be removed from ${data.name}.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (removing) toggleStack.mutate({ stack: data, idea: removing, add: false });
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        visible={deleting}
        title={`Delete “${data.name}”?`}
        body="The stack will be deleted. Its ideas will stay in Mindfeed."
        confirmLabel="Delete"
        onConfirm={() => {
          setDeleting(false);
          deleteStack.mutate(data.id);
          router.back();
        }}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
