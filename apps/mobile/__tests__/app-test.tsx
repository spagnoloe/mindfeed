import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

test('the app opens on the Mindfeed placeholder, signed out', async () => {
  await renderRouter('./src/app', {});

  expect(screen.getByText('Mindfeed')).toBeOnTheScreen();
  expect(await screen.findByText('Not signed in')).toBeOnTheScreen();
});
