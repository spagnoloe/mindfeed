import { content } from '@mindfeed/content';
import { act, fireEvent, screen, userEvent, within } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { renderApp } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

beforeAll(async () => {
  await backend.auth.signUp({ name: 'Maya Lin', email: 'maya@example.com', password: 'readmore' });
  await backend.userData.setInterests(content.topics.slice(0, 3).map((topic) => topic.id));
});

const back = () => screen.getByRole('button', { name: 'Back' });

/** Opens the app on Explore. */
async function openExplore() {
  const user = userEvent.setup();
  await renderApp();
  await user.press(await screen.findByRole('tab', { name: 'Explore' }));
  expect(await screen.findByText('explore.')).toBeOnTheScreen();
  return { user };
}

test('Explore shows the Trending topics, the Books and every Topic with its Idea count', async () => {
  await openExplore();

  const trending = within(await screen.findByTestId('trending-topics'));
  expect(trending.getAllByRole('button').map((chip) => chip.props.accessibilityLabel)).toEqual([
    'Psychology',
    'Investing',
    'Leadership',
    'History',
  ]);

  const books = within(screen.getByTestId('explore-books'));
  expect(books.getAllByRole('button').map((cover) => cover.props.accessibilityLabel)).toEqual([
    'Conscious Business',
    'Principles',
    'Sapiens',
    'Start with Why',
    'The Intelligent Investor',
  ]);

  const topics = within(screen.getByTestId('all-topics'));
  expect(topics.getAllByRole('button')).toHaveLength(9);
  expect(within(topics.getByRole('button', { name: 'Business' })).getByText('8 ideas')).toBeOnTheScreen();
  expect(within(topics.getByRole('button', { name: 'Economics' })).getByText('3 ideas')).toBeOnTheScreen();
});

test('a Trending chip, a Book cover and a Topic row open their Topic or Book in Explore, and back returns', async () => {
  const { user } = await openExplore();

  await user.press(within(await screen.findByTestId('trending-topics')).getByRole('button', { name: 'Investing' }));
  expect(await screen.findByText('Topic')).toBeOnTheScreen();
  expect(screen.getByRole('header')).toHaveTextContent('Investing');
  expect(screen.getByText('9 ideas')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Explore' })).toBeSelected();
  await user.press(back());

  await user.press(within(await screen.findByTestId('explore-books')).getByRole('button', { name: 'Sapiens' }));
  expect(await screen.findByText('Book')).toBeOnTheScreen();
  expect(screen.getByText('Yuval Noah Harari · 13 ideas')).toBeOnTheScreen();
  await user.press(back());

  await user.press(within(await screen.findByTestId('all-topics')).getByRole('button', { name: 'Economics' }));
  expect(await screen.findByText('Topic')).toBeOnTheScreen();
  expect(screen.getByRole('header')).toHaveTextContent('Economics');
  await user.press(back());
  expect(await screen.findByText('explore.')).toBeOnTheScreen();
});

const searchBar = () => screen.getByLabelText('Search ideas, topics, books');

/** The title and subtitle of each search result, top to bottom. */
const results = () =>
  screen.queryAllByTestId('search-result').map((row) => {
    const text = (testID: string) => within(row).getByTestId(testID).props.children as string;
    return `${text('search-result-title')} | ${text('search-result-subtitle')}`;
  });

test("the search bar keeps the keyboard from capitalising the query's first letter", async () => {
  await openExplore();
  await screen.findByTestId('trending-topics');

  expect(searchBar()).toHaveProp('autoCapitalize', 'none');
});

test('focusing the search bar hides the heading and sections, shows Cancel and the hint until the user types', async () => {
  const { user } = await openExplore();
  await screen.findByTestId('trending-topics');
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeOnTheScreen();

  // Pressing a text input in tests doesn't focus it; typing does.
  await act(async () => fireEvent(searchBar(), 'focus'));

  expect(await screen.findByText('Search across ideas, topics and books.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  expect(screen.queryByText('explore.')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('trending-topics')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('explore-books')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('all-topics')).not.toBeOnTheScreen();

  await user.type(searchBar(), 'zzzz');
  expect(screen.queryByText('Search across ideas, topics and books.')).not.toBeOnTheScreen();
  expect(await screen.findByText('No results for “zzzz”.')).toBeOnTheScreen();
  expect(results()).toEqual([]);
});

test('results appear shortly after typing stops, grouped Topics, Books, Ideas, and each opens its screen', async () => {
  const { user } = await openExplore();
  await screen.findByTestId('trending-topics');

  await user.type(searchBar(), 'invest');
  await act(() => jest.advanceTimersByTimeAsync(150));
  expect(results()).toEqual([]);

  expect(await screen.findByText('Investing')).toBeOnTheScreen();
  expect(results()).toEqual([
    'Investing | Topic · 9 ideas',
    'The Intelligent Investor | Book · Benjamin Graham',
    'Invest the same amount on a schedule | Idea · The Intelligent Investor',
    'Investing is not speculating | Idea · The Intelligent Investor',
    'Past growth is a poor forecast | Idea · The Intelligent Investor',
    'Price is not value | Idea · The Intelligent Investor',
    'Your effort should set your strategy | Idea · The Intelligent Investor',
  ]);

  await user.press(screen.getByRole('button', { name: 'Investing' }));
  expect(await screen.findByText('Topic')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Explore' })).toBeSelected();
  await user.press(back());

  // The search is still there on the way back.
  await user.press(await screen.findByRole('button', { name: 'The Intelligent Investor' }));
  expect(await screen.findByText('Book')).toBeOnTheScreen();
  expect(screen.getByText('Benjamin Graham · 12 ideas')).toBeOnTheScreen();
  await user.press(back());

  await user.press(await screen.findByRole('button', { name: 'Price is not value' }));
  expect(await screen.findByText('Source')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Price is not value' })).toBeOnTheScreen();
});

test('Cancel, or tapping Explore again, clears the search and returns to browsing', async () => {
  const { user } = await openExplore();

  await screen.findByTestId('trending-topics');
  await user.type(searchBar(), 'dalio');
  expect(await screen.findByText('Book · Ray Dalio')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Cancel' }));

  expect(await screen.findByText('explore.')).toBeOnTheScreen();
  expect(screen.getByTestId('trending-topics')).toBeOnTheScreen();
  expect(searchBar()).toHaveDisplayValue('');
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeOnTheScreen();

  await user.type(searchBar(), 'dalio');
  expect(await screen.findByText('Book · Ray Dalio')).toBeOnTheScreen();
  await user.press(screen.getByRole('tab', { name: 'Explore' }));

  expect(await screen.findByText('explore.')).toBeOnTheScreen();
  expect(searchBar()).toHaveDisplayValue('');
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeOnTheScreen();
});

test('another tab keeps the search for when the user comes back', async () => {
  const { user } = await openExplore();
  await screen.findByTestId('trending-topics');
  await user.type(searchBar(), 'dalio');
  expect(await screen.findByText('Book · Ray Dalio')).toBeOnTheScreen();

  await user.press(screen.getByRole('tab', { name: 'Library' }));
  expect(await screen.findByText('library.')).toBeOnTheScreen();
  await user.press(screen.getByRole('tab', { name: 'Explore' }));

  expect(await screen.findByText('Book · Ray Dalio')).toBeOnTheScreen();
  expect(searchBar()).toHaveDisplayValue('dalio');
});
