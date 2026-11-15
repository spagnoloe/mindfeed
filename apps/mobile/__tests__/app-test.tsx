import { act, screen, userEvent } from '@testing-library/react-native';
import { router, type Href } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text, View } from 'react-native';

import { BackHeader } from '@/design/BackHeader';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

/** Stands in for a screen deeper in a tab (Idea, Topic, Book, Stack) until those exist. */
function DeeperScreen() {
  return (
    <View>
      <BackHeader />
      <Text>A deeper screen</Text>
    </View>
  );
}

const renderApp = () =>
  renderRouter({ appDir: './src/app', overrides: { '(tabs)/explore/deeper': DeeperScreen } });

const tab = (name: string) => screen.getByRole('tab', { name });

test('the app opens on Home', async () => {
  await renderApp();

  expect(await screen.findByText('mindfeed.')).toBeOnTheScreen();
  expect(tab('Home')).toBeSelected();
});

test('the tab bar switches between the four tabs', async () => {
  const user = userEvent.setup();
  await renderApp();
  await screen.findByText('mindfeed.');

  await user.press(tab('Explore'));
  expect(await screen.findByText('explore.')).toBeOnTheScreen();
  expect(tab('Explore')).toBeSelected();
  expect(tab('Home')).not.toBeSelected();

  await user.press(tab('Library'));
  expect(await screen.findByText('library.')).toBeOnTheScreen();

  await user.press(tab('Profile'));
  expect(await screen.findByText('profile.')).toBeOnTheScreen();

  await user.press(tab('Home'));
  expect(await screen.findByText('mindfeed.')).toBeOnTheScreen();
});

describe('each tab has its own history', () => {
  async function openDeeperScreenInExplore() {
    const user = userEvent.setup();
    await renderApp();
    await user.press(await screen.findByRole('tab', { name: 'Explore' }));
    await screen.findByText('explore.');
    // The deeper route exists only in this test, so typed routes don't know it.
    await act(() => router.push('/explore/deeper' as Href));
    expect(await screen.findByText('A deeper screen')).toBeOnTheScreen();
    return user;
  }

  test('switching away and back keeps the tab where it was', async () => {
    const user = await openDeeperScreenInExplore();

    await user.press(tab('Library'));
    await screen.findByText('library.');
    await user.press(tab('Explore'));

    expect(await screen.findByText('A deeper screen')).toBeOnTheScreen();
  });

  test('re-tapping the active tab returns to its first screen', async () => {
    const user = await openDeeperScreenInExplore();

    await user.press(tab('Explore'));

    expect(await screen.findByText('explore.')).toBeOnTheScreen();
    expect(screen.queryByText('A deeper screen')).not.toBeOnTheScreen();
  });

  test('the back button steps back', async () => {
    const user = await openDeeperScreenInExplore();

    await user.press(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('explore.')).toBeOnTheScreen();
    expect(screen.queryByText('A deeper screen')).not.toBeOnTheScreen();
  });
});
