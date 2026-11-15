import { screen, userEvent } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { AuthError } from '@/backend/types';
import { renderApp, settlePress } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

const newEmail = () => `maya-${crypto.randomUUID()}@example.com`;

beforeEach(async () => {
  await backend.auth.logOut();
});

async function fillAuthForm(user: ReturnType<typeof userEvent.setup>, fields: { name?: string; email?: string; password?: string }) {
  if (fields.name !== undefined) await user.type(screen.getByLabelText('Name'), fields.name);
  if (fields.email !== undefined) await user.type(screen.getByLabelText('Email'), fields.email);
  if (fields.password !== undefined) await user.type(screen.getByLabelText('Password'), fields.password);
}

const button = (name: string) => screen.getByRole('button', { name });

test('signing up, then picking 3 topics, lands on Home', async () => {
  const user = userEvent.setup();
  await renderApp();

  expect(await screen.findByText('Interesting ideas from great books, one at a time.')).toBeOnTheScreen();
  await fillAuthForm(user, { name: 'Maya Lin', email: newEmail(), password: 'readmore' });
  await user.press(button('Create account'));

  expect(await screen.findByText('What are you curious about?')).toBeOnTheScreen();
  await user.press(await screen.findByRole('button', { name: 'History' }));
  await user.press(button('Psychology'));
  await user.press(button('Philosophy'));
  await user.press(await screen.findByRole('button', { name: 'Continue' }));

  expect(await screen.findByText('mindfeed.')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
  await expect(backend.userData.getProfile()).resolves.toEqual({ name: 'Maya Lin', bio: '' });
});

describe('the Sign up / Log in form', () => {
  async function openForm(mode: 'Sign up' | 'Log in') {
    const user = userEvent.setup();
    await renderApp();
    await screen.findByText('Interesting ideas from great books, one at a time.');
    if (mode === 'Log in') await user.press(screen.getByRole('tab', { name: 'Log in' }));
    return user;
  }

  test.each([
    ['no name', { email: 'maya@example.com', password: 'readmore' }, 'Enter your name.'],
    ['an invalid email', { name: 'Maya', email: 'maya@example', password: 'readmore' }, 'Enter a valid email address.'],
    ['a short password', { name: 'Maya', email: 'maya@example.com', password: 'short' }, 'Password must be at least 6 characters.'],
  ])('signing up with %s shows "%s"', async (_case, fields, message) => {
    const user = await openForm('Sign up');

    await fillAuthForm(user, fields);
    await user.press(button('Create account'));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    await expect(backend.auth.getSession()).resolves.toBeNull();
  });

  test('signing up with an email that already has an account says so', async () => {
    const email = newEmail();
    await backend.auth.signUp({ name: 'Maya Lin', email, password: 'readmore' });
    await backend.auth.logOut();
    const user = await openForm('Sign up');

    await fillAuthForm(user, { name: 'Maya Lin', email, password: 'readmore' });
    await user.press(button('Create account'));

    expect(await screen.findByText('An account with this email already exists.')).toBeOnTheScreen();
  });

  test('logging in with a wrong password shows "Incorrect email or password."', async () => {
    const email = newEmail();
    await backend.auth.signUp({ name: 'Maya Lin', email, password: 'readmore' });
    await backend.auth.logOut();
    const user = await openForm('Log in');

    expect(screen.queryByLabelText('Name')).not.toBeOnTheScreen();
    await fillAuthForm(user, { email, password: 'wrong-password' });
    await user.press(button('Log in'));

    expect(await screen.findByText('Incorrect email or password.')).toBeOnTheScreen();
    await expect(backend.auth.getSession()).resolves.toBeNull();
  });

  test('a log-in that fails for another reason, such as a lost connection, says so rather than blaming the password', async () => {
    const email = newEmail();
    await backend.auth.signUp({ name: 'Maya Lin', email, password: 'readmore' });
    await backend.auth.logOut();
    // What the Supabase Backend raises when the request never reaches the server.
    jest.spyOn(backend.auth, 'logIn').mockRejectedValueOnce(new AuthError('unknown', 'Failed to fetch'));
    const user = await openForm('Log in');

    await fillAuthForm(user, { email, password: 'readmore' });
    await user.press(button('Log in'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeOnTheScreen();
    expect(screen.queryByText('Incorrect email or password.')).not.toBeOnTheScreen();
  });

  test('logging in with an invalid email or a short password shows the prototype\'s errors', async () => {
    const user = await openForm('Log in');

    await fillAuthForm(user, { email: 'maya', password: 'readmore' });
    await user.press(button('Log in'));
    expect(await screen.findByText('Enter a valid email address.')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Email'));
    await user.clear(screen.getByLabelText('Password'));
    await fillAuthForm(user, { email: 'maya@example.com', password: 'short' });
    await user.press(button('Log in'));
    expect(await screen.findByText('Incorrect email or password.')).toBeOnTheScreen();
  });

  test('switching between Sign up and Log in clears the error', async () => {
    const user = await openForm('Sign up');
    await user.press(button('Create account'));
    expect(await screen.findByText('Enter your name.')).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Log in' }));

    expect(screen.queryByText('Enter your name.')).not.toBeOnTheScreen();
  });

  test('a returning user who logs in with their 3 Interests lands on Home', async () => {
    const email = newEmail();
    await backend.auth.signUp({ name: 'Maya Lin', email, password: 'readmore' });
    await backend.userData.setInterests(await threeTopicIds());
    await backend.auth.logOut();
    const user = await openForm('Log in');

    await fillAuthForm(user, { email, password: 'readmore' });
    await user.press(button('Log in'));

    expect(await screen.findByText('mindfeed.')).toBeOnTheScreen();
  });
});

const threeTopicIds = async () => (await backend.content.getTopics()).slice(0, 3).map((topic) => topic.id);

test('the onboarding CTA reads "Pick N more" and does nothing until 3 Topics are picked', async () => {
  await backend.auth.signUp({ name: 'Maya Lin', email: newEmail(), password: 'readmore' });
  const user = userEvent.setup();
  await renderApp();

  await user.press(await screen.findByRole('button', { name: 'Pick 3 more' }));
  await user.press(screen.getByRole('button', { name: 'History' }));
  // A chip toggles once its press has shown, so wait for the CTA to catch up.
  await user.press(await screen.findByRole('button', { name: 'Pick 2 more' }));
  await user.press(screen.getByRole('button', { name: 'Psychology' }));
  await user.press(await screen.findByRole('button', { name: 'Pick 1 more' }));
  await settlePress();

  expect(screen.getByText('What are you curious about?')).toBeOnTheScreen();
  await expect(backend.userData.getInterests()).resolves.toEqual([]);

  // A selected chip stays pressed in, and pressing it again unpicks it.
  expect(screen.getByRole('button', { name: 'History' })).toBeSelected();
  await user.press(screen.getByRole('button', { name: 'History' }));
  expect(await screen.findByRole('button', { name: 'Pick 2 more' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'History' })).not.toBeSelected();
});

test('a returning user whose session is restored skips sign-in and lands on Home', async () => {
  await backend.auth.signUp({ name: 'Maya Lin', email: newEmail(), password: 'readmore' });
  await backend.userData.setInterests(await threeTopicIds());

  await renderApp();

  expect(await screen.findByText('mindfeed.')).toBeOnTheScreen();
  expect(screen.queryByText('Interesting ideas from great books, one at a time.')).not.toBeOnTheScreen();
});

test('a restored session with fewer than 3 Interests goes to onboarding', async () => {
  await backend.auth.signUp({ name: 'Maya Lin', email: newEmail(), password: 'readmore' });

  await renderApp();

  expect(await screen.findByText('What are you curious about?')).toBeOnTheScreen();
});
