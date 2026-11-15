import { content } from '@mindfeed/content';
import { act, fireEvent, screen, userEvent, within } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { renderApp } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

const topicId = (name: string) => content.topics.find((topic) => topic.name === name)!.id;
// Few Ideas between them (14), so the test can walk past them all.
const interests = ['Economics', 'Philosophy', 'History'].map(topicId);
const ideaByTitle = (title: string) => content.ideas.find((idea) => idea.title === title)!;

beforeAll(async () => {
  await backend.auth.signUp({ name: 'Maya Lin', email: 'maya@example.com', password: 'readmore' });
  await backend.userData.setInterests(interests);
});

/** The height of the feed on a phone; Jest lays nothing out, so the test reports it. */
const FEED_HEIGHT = 700;

async function openHome() {
  const user = userEvent.setup();
  await renderApp();
  const feed = await screen.findByTestId('home-feed');
  await act(async () => {
    fireEvent(feed, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: FEED_HEIGHT } } });
  });
  await screen.findByTestId('feed-card-0');
  return { user, feed };
}

/**
 * Swipes the feed to the card at `position` and returns that card's title. The list renders only
 * the cards near where it has scrolled to, and only once it knows its content's size.
 */
async function swipeTo(feed: ReturnType<typeof screen.getByTestId>, position: number): Promise<string> {
  const contentSize = { width: 390, height: (position + 10) * FEED_HEIGHT };
  const nativeEvent = { contentOffset: { x: 0, y: position * FEED_HEIGHT }, contentSize, layoutMeasurement: { width: 390, height: FEED_HEIGHT } };
  await act(async () => {
    fireEvent(feed, 'contentSizeChange', contentSize.width, contentSize.height);
    fireEvent.scroll(feed, { nativeEvent });
    fireEvent(feed, 'momentumScrollEnd', { nativeEvent });
    await jest.advanceTimersByTimeAsync(200);
  });
  const card = await screen.findByTestId(`feed-card-${position}`);
  return within(card).getByRole('header').props.children as string;
}

test('the feed shows the Ideas in the Interests first, then the others, and keeps going past the last Idea', async () => {
  const { feed } = await openHome();
  const total = content.ideas.length;
  const inInterests = content.ideas.filter((idea) => interests.includes(idea.topicId)).length;

  const titles: string[] = [];
  for (let position = 0; position <= total; position++) titles.push(await swipeTo(feed, position));

  const topics = titles.map((title) => ideaByTitle(title).topicId);
  expect(topics.slice(0, inInterests).every((id) => interests.includes(id))).toBe(true);
  expect(topics.slice(inInterests, total).some((id) => interests.includes(id))).toBe(false);
  expect(new Set(titles.slice(0, total)).size).toBe(total);
  // Past the last Idea, the feed starts over.
  expect(titles[total]).toBe(titles[0]);
});

test('each card shows its Topic, title, explanation and Book', async () => {
  await openHome();

  const card = screen.getByTestId('feed-card-0');
  const idea = ideaByTitle(within(card).getByRole('header').props.children as string);
  const topic = content.topics.find((candidate) => candidate.id === idea.topicId)!;
  const book = content.books.find((candidate) => candidate.id === idea.bookId)!;

  expect(within(card).getByText(topic.name)).toBeOnTheScreen();
  expect(within(card).getByText(idea.explanation)).toBeOnTheScreen();
  expect(within(card).getByText(book.title)).toBeOnTheScreen();
  expect(within(card).getByText(book.author)).toBeOnTheScreen();
  expect(within(card).getByRole('button', { name: 'Like' })).toBeOnTheScreen();
  expect(within(card).getByRole('button', { name: 'Add to stack' })).toBeOnTheScreen();
});

test('the up and down buttons move one card, and up is disabled on the first card', async () => {
  const { user } = await openHome();
  const up = () => screen.getByRole('button', { name: 'Previous idea' });

  expect(up()).toBeDisabled();

  await user.press(screen.getByRole('button', { name: 'Next idea' }));
  expect(up()).toBeEnabled();

  await user.press(up());
  expect(up()).toBeDisabled();
});

test('a card opens its Idea, whose Topic chip and Source card open the Topic and the Book, and back returns each step', async () => {
  const { user } = await openHome();
  const card = screen.getByTestId('feed-card-0');
  const title = within(card).getByRole('header').props.children as string;
  const idea = ideaByTitle(title);
  const topic = content.topics.find((candidate) => candidate.id === idea.topicId)!;
  const book = content.books.find((candidate) => candidate.id === idea.bookId)!;
  const back = () => screen.getByRole('button', { name: 'Back' });

  await user.press(screen.getByRole('button', { name: title }));
  expect(await screen.findByText(idea.explanation)).toBeOnTheScreen();
  expect(screen.getByText('Source')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();

  // The Topic screen lists every Idea in the Topic.
  await user.press(screen.getByRole('button', { name: `Topic: ${topic.name}` }));
  expect(await screen.findByText('Topic')).toBeOnTheScreen();
  const topicIdeas = content.ideas.filter((candidate) => candidate.topicId === topic.id);
  expect(screen.getByText(`${topicIdeas.length} ideas`)).toBeOnTheScreen();
  for (const topicIdea of topicIdeas) expect(screen.getByText(topicIdea.title)).toBeOnTheScreen();

  await user.press(back());
  expect(await screen.findByText('Source')).toBeOnTheScreen();

  // The Book screen lists every Idea from the Book.
  await user.press(screen.getByRole('button', { name: `Source: ${book.title}` }));
  expect(await screen.findByText('Book')).toBeOnTheScreen();
  const bookIdeas = content.ideas.filter((candidate) => candidate.bookId === book.id);
  expect(screen.getByText(`${book.author} · ${bookIdeas.length} ideas`)).toBeOnTheScreen();
  for (const bookIdea of bookIdeas) expect(screen.getByText(bookIdea.title)).toBeOnTheScreen();

  // A row opens that Idea.
  const other = bookIdeas.find((candidate) => candidate.id !== idea.id)!;
  await user.press(screen.getByRole('button', { name: other.title }));
  expect(await screen.findByText(other.explanation)).toBeOnTheScreen();

  await user.press(back());
  expect(await screen.findByText('Book')).toBeOnTheScreen();
  await user.press(back());
  expect(await screen.findByText(idea.explanation)).toBeOnTheScreen();
  await user.press(back());
  expect(await screen.findByTestId('home-feed')).toBeOnTheScreen();
  expect(screen.queryByText('Source')).not.toBeOnTheScreen();
});
