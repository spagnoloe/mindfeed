import { content } from '@mindfeed/content';
import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { renderApp, settlePress } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

const ideaByTitle = (title: string) => content.ideas.find((idea) => idea.title === title)!;
const bookOf = (idea: (typeof content.ideas)[number]) => content.books.find((book) => book.id === idea.bookId)!;
const topicOf = (idea: (typeof content.ideas)[number]) => content.topics.find((topic) => topic.id === idea.topicId)!;

// A new account for each test, so each starts with no Likes.
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

/** The card at `position`, which must be rendered, and its Idea. */
function feedCard(position: number) {
  const card = within(screen.getByTestId(`feed-card-${position}`));
  return { card, idea: ideaByTitle(card.getByRole('header').props.children as string) };
}

async function openLibrary(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole('tab', { name: 'Library' }));
  expect(await screen.findByText('library.')).toBeOnTheScreen();
}

/** The titles of the Liked Ideas rows, top to bottom. */
const likedTitles = () => screen.queryAllByTestId('liked-idea').map((row) => row.props.accessibilityLabel as string);

test("liking an Idea on a feed card fills the card's heart and puts the Idea at the top of Liked Ideas", async () => {
  const { user } = await openHome();
  const first = feedCard(0);
  const second = feedCard(1);

  expect(first.card.getByRole('button', { name: 'Like' })).not.toBeSelected();
  await user.press(first.card.getByRole('button', { name: 'Like' }));
  expect(first.card.getByRole('button', { name: 'Like' })).toBeSelected();
  await user.press(second.card.getByRole('button', { name: 'Like' }));

  await openLibrary(user);
  await screen.findAllByTestId('liked-idea');
  expect(likedTitles()).toEqual([second.idea.title, first.idea.title]);
  const top = within(screen.getAllByTestId('liked-idea')[0]);
  expect(top.getByText(`${bookOf(second.idea).title} · ${topicOf(second.idea).name}`)).toBeOnTheScreen();
});

test('Like on Idea Detail turns into Liked straight away, with no confirmation, and back again', async () => {
  const { user } = await openHome();
  const { idea } = feedCard(0);
  await user.press(screen.getByRole('button', { name: idea.title }));
  expect(await screen.findByText('Source')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Like' }));
  expect(await screen.findByRole('button', { name: 'Liked' })).toBeOnTheScreen();
  expect(screen.queryByText('Remove from Liked?')).not.toBeOnTheScreen();
  await expect(backend.userData.isLiked(idea.id)).resolves.toBe(true);

  await user.press(screen.getByRole('button', { name: 'Liked' }));
  expect(await screen.findByRole('button', { name: 'Like' })).toBeOnTheScreen();
  expect(screen.queryByText('Remove from Liked?')).not.toBeOnTheScreen();
  await settlePress();
  await expect(backend.userData.isLiked(idea.id)).resolves.toBe(false);
});

test('unliking from Liked Ideas asks first: Cancel keeps the Idea, Remove takes it out', async () => {
  const [kept, removed] = content.ideas;
  await backend.userData.like(kept.id);
  await backend.userData.like(removed.id);
  const { user } = await openHome();
  await openLibrary(user);
  await screen.findAllByTestId('liked-idea');
  const unlike = () => within(screen.getByRole('button', { name: removed.title })).getByRole('button', { name: 'Unlike' });

  await user.press(unlike());
  expect(screen.getByText('Remove from Liked?')).toBeOnTheScreen();
  expect(screen.getByText(`“${removed.title}” will be removed from your Liked ideas.`)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  await settlePress();
  expect(screen.queryByText('Remove from Liked?')).not.toBeOnTheScreen();
  expect(likedTitles()).toEqual([removed.title, kept.title]);

  await user.press(unlike());
  await user.press(screen.getByRole('button', { name: 'Remove' }));
  await settlePress();
  expect(screen.queryByText('Remove from Liked?')).not.toBeOnTheScreen();
  expect(likedTitles()).toEqual([kept.title]);
  await expect(backend.userData.isLiked(removed.id)).resolves.toBe(false);
});

test('Liked Ideas shows an empty state when there are no Likes', async () => {
  const { user } = await openHome();
  await openLibrary(user);

  expect(await screen.findByText('No liked ideas yet')).toBeOnTheScreen();
  expect(screen.getByText('Tap the heart on any idea to keep it here.')).toBeOnTheScreen();
  expect(screen.queryAllByTestId('liked-idea')).toEqual([]);
});

test('a Like that fails to save is undone', async () => {
  let failSave: ((error: Error) => void) | undefined;
  const like = jest.spyOn(backend.userData, 'like').mockImplementation(() => new Promise((_resolve, reject) => (failSave = reject)));
  const { user } = await openHome();
  const { card, idea } = feedCard(0);
  const heart = () => card.getByRole('button', { name: 'Like' });

  await user.press(heart());
  // The heart fills before the save finishes…
  expect(heart()).toBeSelected();

  // …and empties again when it fails.
  await waitFor(() => expect(like).toHaveBeenCalledWith(idea.id));
  await act(async () => failSave!(new Error('Network request failed')));
  await waitFor(() => expect(heart()).not.toBeSelected());
  await expect(backend.userData.isLiked(idea.id)).resolves.toBe(false);
  await openLibrary(user);
  expect(await screen.findByText('No liked ideas yet')).toBeOnTheScreen();
});

test('a Liked Ideas row opens its Idea within the Library tab, already Liked, and back returns to the list', async () => {
  const idea = content.ideas[0];
  await backend.userData.like(idea.id);
  const { user } = await openHome();
  await openLibrary(user);

  await user.press(await screen.findByRole('button', { name: idea.title }));
  expect(await screen.findByText('Source')).toBeOnTheScreen();
  expect(screen.getByText(idea.explanation)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Liked' })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Library' })).toBeSelected();

  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(await screen.findByText('library.')).toBeOnTheScreen();
  expect(likedTitles()).toEqual([idea.title]);
});
