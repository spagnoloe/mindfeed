import { content } from '@mindfeed/content';
import { screen, userEvent, waitFor, within } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { renderApp, settlePress } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

// A new account for each test, so each starts with no Stacks.
beforeEach(async () => {
  await backend.auth.logOut();
  await backend.auth.signUp({ name: 'Maya Lin', email: `maya-${crypto.randomUUID()}@example.com`, password: 'readmore' });
  await backend.userData.setInterests(content.topics.slice(0, 3).map((topic) => topic.id));
});

afterEach(() => jest.restoreAllMocks());

/** Opens the app on Library → Stacks. */
async function openStacks() {
  const user = userEvent.setup();
  await renderApp();
  await user.press(await screen.findByRole('tab', { name: 'Library' }));
  await user.press(await screen.findByRole('tab', { name: 'Stacks' }));
  return { user };
}

/** The names on the Stack cards, top to bottom. */
const stackNames = () => screen.queryAllByTestId('stack-card').map((card) => card.props.accessibilityLabel as string);

test('with no Stacks, the list shows the prototype\'s hint', async () => {
  await openStacks();

  expect(await screen.findByText('Create a stack, then add ideas to it from any idea.')).toBeOnTheScreen();
  expect(stackNames()).toEqual([]);
});

test('New stack → name → Create puts the new Stack at the top of the list with "0 ideas"', async () => {
  await backend.userData.createStack({ name: 'Work', ideaId: content.ideas[0].id });
  const { user } = await openStacks();
  await waitFor(() => expect(stackNames()).toEqual(['Work']));

  await user.press(screen.getByRole('button', { name: 'New stack' }));
  const form = within(await screen.findByTestId('stack-form'));
  expect(form.getByText('New stack')).toBeOnTheScreen();
  expect(form.queryByText('Will be added')).not.toBeOnTheScreen();
  await user.type(form.getByLabelText('Name'), 'Thinking better');
  await user.press(form.getByRole('button', { name: 'Create' }));

  await waitFor(() => expect(screen.queryByTestId('stack-form')).not.toBeOnTheScreen());
  expect(stackNames()).toEqual(['Thinking better', 'Work']);
  expect(within(screen.getAllByTestId('stack-card')[0]).getByText('0 ideas')).toBeOnTheScreen();
  expect(within(screen.getAllByTestId('stack-card')[1]).getByText('1 idea')).toBeOnTheScreen();
  await expect(backend.userData.getStacks()).resolves.toMatchObject([{ name: 'Thinking better', ideaCount: 0 }, { name: 'Work' }]);
});

/** Opens the Stack named `name` from the Stacks list. */
async function openStack(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.press(await screen.findByRole('button', { name }));
  expect(await screen.findByText('Stack')).toBeOnTheScreen();
}

test('Rename → Edit stack is prefilled, and Save shows the new name and description on the Stack screen and in the list', async () => {
  await backend.userData.createStack({ name: 'Work', description: 'For work', ideaId: content.ideas[0].id });
  const { user } = await openStacks();
  await openStack(user, 'Work');
  expect(screen.getByRole('header')).toHaveTextContent('Work');
  expect(screen.getByText('For work')).toBeOnTheScreen();
  expect(screen.getByText('1 idea')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Rename stack' }));
  const form = within(await screen.findByTestId('stack-form'));
  expect(form.getByText('Edit stack')).toBeOnTheScreen();
  expect(form.getByLabelText('Name')).toHaveDisplayValue('Work');
  expect(form.getByLabelText('Description (optional)')).toHaveDisplayValue('For work');
  await user.clear(form.getByLabelText('Name'));
  await user.type(form.getByLabelText('Name'), 'Deep work');
  await user.clear(form.getByLabelText('Description (optional)'));
  await user.type(form.getByLabelText('Description (optional)'), 'Focus, without distraction');
  await user.press(form.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(screen.queryByTestId('stack-form')).not.toBeOnTheScreen());
  expect(screen.getByRole('header')).toHaveTextContent('Deep work');
  expect(screen.getByText('Focus, without distraction')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => expect(stackNames()).toEqual(['Deep work']));
  await expect(backend.userData.getStacks()).resolves.toMatchObject([{ name: 'Deep work', description: 'Focus, without distraction' }]);
});

test('an empty Stack shows the prototype\'s empty state', async () => {
  await backend.userData.createStack({ name: 'Work' });
  const { user } = await openStacks();
  await openStack(user, 'Work');

  expect(screen.getByText('This stack is empty. Add ideas from any idea page.')).toBeOnTheScreen();
  expect(screen.getByText('0 ideas')).toBeOnTheScreen();
});

test('removing an Idea asks first, then updates the count; the Idea stays in Mindfeed and stays liked', async () => {
  const [kept, removed] = content.ideas;
  const stack = await backend.userData.createStack({ name: 'Work', ideaId: kept.id });
  await backend.userData.addToStack(stack.id, removed.id);
  await backend.userData.like(removed.id);
  const { user } = await openStacks();
  await openStack(user, 'Work');
  expect(screen.getByText('2 ideas')).toBeOnTheScreen();
  const rowOf = (title: string) => within(screen.getByRole('button', { name: title }));

  // Cancel keeps it.
  await user.press(rowOf(removed.title).getByRole('button', { name: 'Remove from stack' }));
  const dialog = within(await screen.findByTestId('confirm-dialog'));
  expect(dialog.getByText('Remove from stack?')).toBeOnTheScreen();
  expect(dialog.getByText(`“${removed.title}” will be removed from Work.`)).toBeOnTheScreen();
  await user.press(dialog.getByRole('button', { name: 'Cancel' }));
  await settlePress();
  expect(screen.getByText('2 ideas')).toBeOnTheScreen();

  await user.press(rowOf(removed.title).getByRole('button', { name: 'Remove from stack' }));
  await user.press(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Remove' }));
  await settlePress();

  expect(await screen.findByText('1 idea')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: removed.title })).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: kept.title })).toBeOnTheScreen();
  await waitFor(async () => expect((await backend.userData.getStack(stack.id)).ideas.map((idea) => idea.id)).toEqual([kept.id]));
  await expect(backend.content.getIdea(removed.id)).resolves.toMatchObject({ id: removed.id });
  await expect(backend.userData.isLiked(removed.id)).resolves.toBe(true);

  await user.press(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => expect(within(screen.getByTestId('stack-card')).getByText('1 idea')).toBeOnTheScreen());
});

test('deleting asks first, then returns to the list without the Stack', async () => {
  await backend.userData.createStack({ name: 'Reading' });
  await backend.userData.createStack({ name: 'Work', ideaId: content.ideas[0].id });
  const { user } = await openStacks();
  await openStack(user, 'Work');

  // Cancel keeps it.
  await user.press(screen.getByRole('button', { name: 'Delete stack' }));
  let dialog = within(await screen.findByTestId('confirm-dialog'));
  expect(dialog.getByText('Delete “Work”?')).toBeOnTheScreen();
  expect(dialog.getByText('The stack will be deleted. Its ideas will stay in Mindfeed.')).toBeOnTheScreen();
  await user.press(dialog.getByRole('button', { name: 'Cancel' }));
  await settlePress();
  expect(screen.getByText('Stack')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Delete stack' }));
  dialog = within(await screen.findByTestId('confirm-dialog'));
  await user.press(dialog.getByRole('button', { name: 'Delete' }));
  await settlePress();

  expect(await screen.findByText('library.')).toBeOnTheScreen();
  await waitFor(() => expect(stackNames()).toEqual(['Reading']));
  await expect(backend.userData.getStacks()).resolves.toMatchObject([{ name: 'Reading' }]);
  await expect(backend.content.getIdea(content.ideas[0].id)).resolves.toMatchObject({ id: content.ideas[0].id });
});

test('a delete that fails to save puts the Stack back in the list', async () => {
  await backend.userData.createStack({ name: 'Work' });
  const { user } = await openStacks();
  await openStack(user, 'Work');
  jest.spyOn(backend.userData, 'deleteStack').mockRejectedValueOnce(new Error('Network request failed'));

  await user.press(screen.getByRole('button', { name: 'Delete stack' }));
  await user.press(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Delete' }));
  await settlePress();

  expect(await screen.findByText('library.')).toBeOnTheScreen();
  await waitFor(() => expect(stackNames()).toEqual(['Work']));
});
