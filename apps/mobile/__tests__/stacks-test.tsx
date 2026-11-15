import { content } from '@mindfeed/content';
import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { renderApp } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

const ideaByTitle = (title: string) => content.ideas.find((idea) => idea.title === title)!;

// A new account for each test, so each starts with no Stacks.
beforeEach(async () => {
  await backend.auth.logOut();
  await backend.auth.signUp({ name: 'Maya Lin', email: `maya-${crypto.randomUUID()}@example.com`, password: 'readmore' });
  await backend.userData.setInterests(content.topics.slice(0, 3).map((topic) => topic.id));
});

afterEach(() => jest.restoreAllMocks());

/** Opens the app on Home and lays out the feed, so its first cards render. */
async function openHome() {
  const user = userEvent.setup();
  await renderApp();
  const feed = await screen.findByTestId('home-feed');
  await act(async () => {
    fireEvent(feed, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
  });
  await screen.findByTestId('feed-card-0');
  return { user };
}

/** The first card and its Idea. */
function firstCard() {
  const card = within(screen.getByTestId('feed-card-0'));
  return { card, idea: ideaByTitle(card.getByRole('header').props.children as string) };
}

/** Opens the Add to stack sheet from the first card. */
async function openSheetFromCard(user: ReturnType<typeof userEvent.setup>) {
  const { card, idea } = firstCard();
  await user.press(card.getByRole('button', { name: 'Add to stack' }));
  const sheet = within(await screen.findByTestId('bottom-sheet'));
  expect(sheet.getByText(idea.title)).toBeOnTheScreen();
  return { card, idea, sheet };
}

const stackRow = (name: string) => screen.getByRole('checkbox', { name });
const stackIds = async (ideaId: string) => backend.userData.getStacksWith(ideaId);

test('from a card, New stack → name → "Create & add" files the Idea in a new Stack, and Idea Detail reads "In 1 stack"', async () => {
  await backend.userData.createStack({ name: 'Work' });
  const { user } = await openHome();
  const { card, idea, sheet } = await openSheetFromCard(user);
  expect(card.getByRole('button', { name: 'Add to stack' })).not.toBeSelected();

  await user.press(sheet.getByRole('button', { name: 'New stack' }));
  const form = within(await screen.findByTestId('stack-form'));
  expect(form.getByText('Will be added')).toBeOnTheScreen();
  expect(form.getByText(idea.title)).toBeOnTheScreen();
  await user.type(form.getByLabelText('Name'), 'Thinking better');
  await user.type(form.getByLabelText('Description (optional)'), 'Mental models');
  await user.press(form.getByRole('button', { name: 'Create & add' }));

  // Back on the sheet, the new Stack is at the top, ticked.
  await waitFor(() => expect(screen.queryByTestId('stack-form')).not.toBeOnTheScreen());
  expect(screen.getAllByRole('checkbox').map((row) => row.props.accessibilityLabel)).toEqual(['Thinking better', 'Work']);
  expect(stackRow('Thinking better')).toBeChecked();
  expect(within(stackRow('Thinking better')).getByText('1 idea')).toBeOnTheScreen();
  expect(stackRow('Work')).not.toBeChecked();
  const [stack] = await backend.userData.getStacks();
  expect(stack).toMatchObject({ name: 'Thinking better', description: 'Mental models', ideaCount: 1 });
  await expect(stackIds(idea.id)).resolves.toEqual([stack.id]);

  await user.press(screen.getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(card.getByRole('button', { name: 'Add to stack' })).toBeSelected());

  await user.press(screen.getByRole('button', { name: idea.title }));
  expect(await screen.findByRole('button', { name: 'In 1 stack' })).toBeOnTheScreen();
});

test('ticking and unticking a Stack in the sheet files and unfiles the Idea at once', async () => {
  const work = await backend.userData.createStack({ name: 'Work' });
  await backend.userData.createStack({ name: 'Reading' });
  const { user } = await openHome();
  const { card, idea } = await openSheetFromCard(user);
  expect(stackRow('Work')).not.toBeChecked();
  expect(stackRow('Reading')).not.toBeChecked();

  await user.press(stackRow('Work'));
  expect(stackRow('Work')).toBeChecked();
  expect(within(stackRow('Work')).getByText('1 idea')).toBeOnTheScreen();
  expect(card.getByRole('button', { name: 'Add to stack' })).toBeSelected();
  await waitFor(async () => expect(await stackIds(idea.id)).toEqual([work.id]));

  await user.press(stackRow('Work'));
  expect(stackRow('Work')).not.toBeChecked();
  expect(within(stackRow('Work')).getByText('0 ideas')).toBeOnTheScreen();
  expect(card.getByRole('button', { name: 'Add to stack' })).not.toBeSelected();
  await waitFor(async () => expect(await stackIds(idea.id)).toEqual([]));
});

test('a tick that fails to save is undone, and so is an untick', async () => {
  const work = await backend.userData.createStack({ name: 'Work' });
  const { user } = await openHome();
  const { idea } = await openSheetFromCard(user);

  let failSave: ((error: Error) => void) | undefined;
  const add = jest.spyOn(backend.userData, 'addToStack').mockImplementationOnce(() => new Promise((_resolve, reject) => (failSave = reject)));
  await user.press(stackRow('Work'));
  expect(stackRow('Work')).toBeChecked();
  await waitFor(() => expect(add).toHaveBeenCalledWith(work.id, idea.id));
  await act(async () => failSave!(new Error('Network request failed')));
  await waitFor(() => expect(stackRow('Work')).not.toBeChecked());
  expect(within(stackRow('Work')).getByText('0 ideas')).toBeOnTheScreen();
  await expect(stackIds(idea.id)).resolves.toEqual([]);

  // A second tick saves, so the untick below has something to undo.
  await user.press(stackRow('Work'));
  await waitFor(async () => expect(await stackIds(idea.id)).toEqual([work.id]));
  const remove = jest
    .spyOn(backend.userData, 'removeFromStack')
    .mockImplementationOnce(() => new Promise((_resolve, reject) => (failSave = reject)));
  await user.press(stackRow('Work'));
  expect(stackRow('Work')).not.toBeChecked();
  await waitFor(() => expect(remove).toHaveBeenCalledWith(work.id, idea.id));
  await act(async () => failSave!(new Error('Network request failed')));
  await waitFor(() => expect(stackRow('Work')).toBeChecked());
  await expect(stackIds(idea.id)).resolves.toEqual([work.id]);
});

test('an empty name says "Give your stack a name." and creates nothing', async () => {
  const { user } = await openHome();
  const { idea, sheet } = await openSheetFromCard(user);
  await user.press(sheet.getByRole('button', { name: 'New stack' }));
  const form = within(await screen.findByTestId('stack-form'));

  await user.type(form.getByLabelText('Name'), '   ');
  await user.press(form.getByRole('button', { name: 'Create & add' }));

  expect(await form.findByText('Give your stack a name.')).toBeOnTheScreen();
  expect(screen.getByTestId('stack-form')).toBeOnTheScreen();
  await expect(backend.userData.getStacks()).resolves.toEqual([]);
  await expect(stackIds(idea.id)).resolves.toEqual([]);

  // Typing clears the error.
  await user.type(form.getByLabelText('Name'), 'W');
  expect(form.queryByText('Give your stack a name.')).not.toBeOnTheScreen();
});

test('Cancel and Android back leave the form without creating a Stack', async () => {
  const { user } = await openHome();
  const { sheet } = await openSheetFromCard(user);

  await user.press(sheet.getByRole('button', { name: 'New stack' }));
  await user.type(within(await screen.findByTestId('stack-form')).getByLabelText('Name'), 'Work');
  await user.press(within(screen.getByTestId('stack-form')).getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByTestId('stack-form')).not.toBeOnTheScreen());

  await user.press(sheet.getByRole('button', { name: 'New stack' }));
  await fireEvent(await screen.findByTestId('stack-form'), 'requestClose');
  expect(screen.queryByTestId('stack-form')).not.toBeOnTheScreen();

  expect(screen.getByText('Add to stack')).toBeOnTheScreen();
  await expect(backend.userData.getStacks()).resolves.toEqual([]);
});

describe('the sheet closes', () => {
  const sheetIsOpen = () => screen.queryByTestId('bottom-sheet') !== null;

  test('with Done', async () => {
    const { user } = await openHome();
    const { sheet } = await openSheetFromCard(user);

    await user.press(sheet.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(sheetIsOpen()).toBe(false));
  });

  test('with a tap on the backdrop', async () => {
    const { user } = await openHome();
    const { sheet } = await openSheetFromCard(user);

    await user.press(sheet.getByLabelText('Close'));

    expect(sheetIsOpen()).toBe(false);
  });

  test('with Android back', async () => {
    const { user } = await openHome();
    await openSheetFromCard(user);

    await fireEvent(screen.getByTestId('bottom-sheet'), 'requestClose');

    expect(sheetIsOpen()).toBe(false);
  });

  test('from Idea Detail too, which opens it for its Idea', async () => {
    const { user } = await openHome();
    const { idea } = firstCard();
    await user.press(screen.getByRole('button', { name: idea.title }));
    await user.press(await screen.findByRole('button', { name: 'Add to stack' }));

    const sheet = within(await screen.findByTestId('bottom-sheet'));
    expect(sheet.getByText(idea.title)).toBeOnTheScreen();
    await user.press(sheet.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(sheetIsOpen()).toBe(false));
  });
});
