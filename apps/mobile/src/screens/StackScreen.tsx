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
 * Edit stack form; delete, and each row's remove button, ask first. A confirmed delete returns to
 * the Stacks once it's saved; if it fails, the screen stays and says so.
 */
export function StackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useStack(id);
  const toggleStack = useToggleStack();
  const deleteStack = useDeleteStack();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [removing, setRemoving] = useState<Idea | null>(null);

  if (query.isError) {
    return (
      <IdeaListStatus>
        <ScreenStatus error onRetry={() => void query.refetch()} />
      </IdeaListStatus>
    );
  }
  if (!query.data) {
    return (
      <IdeaListStatus>
        <ScreenStatus />
      </IdeaListStatus>
    );
  }

  const stack = query.data;
  return (
    <>
      <IdeaListScreen
        eyebrow="Stack"
        title={stack.name}
        description={stack.description}
        subtitle={ideaCount(stack.ideaCount)}
        // The prototype has no copy for a Stack that fails to delete.
        error={deleteFailed ? "Couldn't delete this stack. Please try again." : undefined}
        headerActions={
          <>
            <RoundIconButton icon="edit" accessibilityLabel="Edit stack" onPress={() => setEditing(true)} />
            <RoundIconButton icon="delete" accessibilityLabel="Delete stack" onPress={() => setDeleting(true)} />
          </>
        }
        ideas={stack.ideas}
        rowSubtitle={(idea) => `${idea.book.title} · ${idea.topic.name}`}
        rowAction={(idea) => ({ icon: 'remove_circle', accessibilityLabel: 'Remove from stack', color: palette.mut, onPress: () => setRemoving(idea) })}
        empty="This stack is empty. Add ideas from any idea page."
      />
      {editing && <StackForm stack={stack} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        visible={removing !== null}
        title="Remove from stack?"
        body={`“${removing?.title ?? ''}” will be removed from ${stack.name}.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (removing) toggleStack.mutate({ stack, idea: removing, add: false });
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        visible={deleting}
        title={`Delete “${stack.name}”?`}
        body="The stack will be deleted. Its ideas will stay in Mindfeed."
        confirmLabel="Delete"
        onConfirm={() => {
          setDeleting(false);
          if (deleteStack.isPending) return;
          setDeleteFailed(false);
          deleteStack.mutate(stack.id, { onSuccess: () => router.back(), onError: () => setDeleteFailed(true) });
        }}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
