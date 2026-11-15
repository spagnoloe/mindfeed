import { content } from '@mindfeed/content';
import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';

import { backend } from '@/backend/instance';
import { renderApp, settlePress } from '@/testing/renderApp';

// The real app, with the fake Backend in place of Supabase.
jest.mock('@/backend/instance', () => ({
  backend: jest.requireActual('@/backend/fake').createFakeBackend(),
}));

const topicId = (name: string) => content.topics.find((topic) => topic.name === name)!.id;

let email: string;

// A new account for each test, so each starts from the same profile.
beforeEach(async () => {
  await backend.auth.logOut();
  email = `maya-${crypto.randomUUID()}@example.com`;
  await backend.auth.signUp({ name: 'Maya Lin', email, password: 'readmore' });
  await backend.userData.setInterests(['History', 'Psychology', 'Philosophy'].map(topicId));
});

/** Opens the app on the Profile tab. */
async function openProfile() {
  const user = userEvent.setup();
  await renderApp();
  await user.press(await screen.findByRole('tab', { name: 'Profile' }));
  await screen.findByText('Maya Lin');
  return { user };
}

async function openEditProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole('button', { name: 'Edit profile' }));
  return within(await screen.findByTestId('edit-profile'));
}

test('Profile shows the initials, name and email, and no bio until one is set', async () => {
  await openProfile();

  expect(screen.getByRole('header', { name: 'profile.' })).toBeOnTheScreen();
  expect(screen.getByText('ML')).toBeOnTheScreen();
  expect(screen.getByText(email)).toBeOnTheScreen();
  expect(screen.getByText('Name, bio, password')).toBeOnTheScreen();
});

test('Edit profile → new name and bio → Save shows them on Profile', async () => {
  const { user } = await openProfile();

  const form = await openEditProfile(user);
  expect(form.getByLabelText('Name')).toHaveDisplayValue('Maya Lin');
  await user.clear(form.getByLabelText('Name'));
  await user.type(form.getByLabelText('Name'), 'Sam Reyes');
  await user.type(form.getByLabelText('Bio'), 'Reads about money.');
  await user.press(form.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(screen.queryByTestId('edit-profile')).not.toBeOnTheScreen());
  expect(screen.getByText('Sam Reyes')).toBeOnTheScreen();
  expect(screen.getByText('SR')).toBeOnTheScreen();
  expect(screen.getByText('Reads about money.')).toBeOnTheScreen();
  await expect(backend.userData.getProfile()).resolves.toEqual({ name: 'Sam Reyes', bio: 'Reads about money.' });
});

test('saving an empty name shows "Name can’t be empty." and keeps the form open', async () => {
  const { user } = await openProfile();

  const form = await openEditProfile(user);
  await user.clear(form.getByLabelText('Name'));
  await user.press(form.getByRole('button', { name: 'Save' }));

  expect(await form.findByRole('alert')).toHaveTextContent('Name can’t be empty.');
  await expect(backend.userData.getProfile()).resolves.toEqual({ name: 'Maya Lin', bio: '' });
});

test('Cancel closes Edit profile, saving nothing', async () => {
  const { user } = await openProfile();

  const form = await openEditProfile(user);
  await user.type(form.getByLabelText('Bio'), 'Unsaved');
  await user.press(form.getByRole('button', { name: 'Cancel' }));

  await waitFor(() => expect(screen.queryByTestId('edit-profile')).not.toBeOnTheScreen());
  expect(screen.queryByText('Unsaved')).not.toBeOnTheScreen();
});

describe('changing the password in Edit profile', () => {
  async function changePassword(currentPassword: string, newPassword: string) {
    const { user } = await openProfile();
    const form = await openEditProfile(user);
    if (currentPassword) await user.type(form.getByLabelText('Current password'), currentPassword);
    if (newPassword) await user.type(form.getByLabelText('New password'), newPassword);
    await user.press(form.getByRole('button', { name: 'Save' }));
    return form;
  }

  test('a wrong current password shows "Current password is incorrect." and keeps the old password', async () => {
    const form = await changePassword('not-my-password', 'readmore2');

    expect(await form.findByRole('alert')).toHaveTextContent('Current password is incorrect.');
    await backend.auth.logOut();
    await expect(backend.auth.logIn({ email, password: 'readmore' })).resolves.toMatchObject({ email });
  });

  test('the right current password closes the form, and the new password logs in', async () => {
    await changePassword('readmore', 'readmore2');

    await waitFor(() => expect(screen.queryByTestId('edit-profile')).not.toBeOnTheScreen());
    await backend.auth.logOut();
    await expect(backend.auth.logIn({ email, password: 'readmore2' })).resolves.toMatchObject({ email });
  });

  test.each([
    ['only a new password', '', 'readmore2', 'Enter your current password.'],
    ['a new password under 6 characters', 'readmore', 'short', 'New password must be at least 6 characters.'],
  ])('with %s, it shows "%s"', async (_case, currentPassword, newPassword, message) => {
    const form = await changePassword(currentPassword, newPassword);

    expect(await form.findByRole('alert')).toHaveTextContent(message);
  });
});

describe('Topics of interest', () => {
  const button = (name: string) => screen.getByRole('button', { name });

  async function openInterests(user: ReturnType<typeof userEvent.setup>) {
    await user.press(button('Topics of interest'));
    return within(await screen.findByTestId('topics-of-interest'));
  }

  /** Reports the feed's height (Jest lays nothing out) and waits for its first card. */
  async function showFeed() {
    const feed = await screen.findByTestId('home-feed');
    await act(async () => {
      fireEvent(feed, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
    });
    return within(await screen.findByTestId('feed-card-0'));
  }

  test('the Profile row shows the Interests, and the screen has them pressed in', async () => {
    const { user } = await openProfile();
    expect(within(button('Topics of interest')).getByText('History, Philosophy, Psychology')).toBeOnTheScreen();

    const sheet = await openInterests(user);
    expect(sheet.getByText('Your Home feed is built from these. Keep at least 3.')).toBeOnTheScreen();
    expect(sheet.getByRole('button', { name: 'History' })).toBeSelected();
    expect(sheet.getByRole('button', { name: 'Economics' })).not.toBeSelected();
  });

  test('with fewer than 3, the CTA reads "Pick N more" and saves nothing', async () => {
    const { user } = await openProfile();
    const sheet = await openInterests(user);

    await user.press(sheet.getByRole('button', { name: 'History' }));
    await user.press(sheet.getByRole('button', { name: 'Psychology' }));
    await user.press(await sheet.findByRole('button', { name: 'Pick 2 more' }));
    await settlePress();

    expect(screen.getByTestId('topics-of-interest')).toBeOnTheScreen();
    expect([...(await backend.userData.getInterests())].sort()).toEqual(['History', 'Psychology', 'Philosophy'].map(topicId).sort());
  });

  test('saving new Interests updates the Profile row and restarts Home with them first', async () => {
    const user = userEvent.setup();
    await renderApp();
    await showFeed();
    await user.press(screen.getByRole('button', { name: 'Next idea' }));
    await waitFor(() => expect(button('Previous idea')).toBeEnabled());

    await user.press(screen.getByRole('tab', { name: 'Profile' }));
    const sheet = await openInterests(user);
    await user.press(sheet.getByRole('button', { name: 'History' }));
    await user.press(sheet.getByRole('button', { name: 'Psychology' }));
    await user.press(await sheet.findByRole('button', { name: 'Economics' }));
    await user.press(sheet.getByRole('button', { name: 'Investing' }));
    await user.press(await sheet.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByTestId('topics-of-interest')).not.toBeOnTheScreen());
    expect(within(button('Topics of interest')).getByText('Economics, Investing, Philosophy')).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Home' }));
    const card = await showFeed();
    const title = card.getByRole('header').props.children as string;
    const idea = content.ideas.find((candidate) => candidate.title === title)!;
    expect(['Economics', 'Investing', 'Philosophy'].map(topicId)).toContain(idea.topicId);
    expect(button('Previous idea')).toBeDisabled();
  });
});

describe('Log out', () => {
  test('asks first, and Cancel stays signed in', async () => {
    const { user } = await openProfile();

    await user.press(screen.getByRole('button', { name: 'Log out' }));
    const dialog = within(await screen.findByTestId('confirm-dialog'));
    expect(dialog.getByText('Log out of Mindfeed?')).toBeOnTheScreen();
    expect(dialog.getByText('Your liked ideas and stacks are saved to your account.')).toBeOnTheScreen();
    await user.press(dialog.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeOnTheScreen());
    expect(screen.getByText('Maya Lin')).toBeOnTheScreen();
    await expect(backend.auth.getSession()).resolves.toMatchObject({ email });
  });

  test('confirming lands on Log in with the email filled in, ready to log back in', async () => {
    const { user } = await openProfile();

    await user.press(screen.getByRole('button', { name: 'Log out' }));
    const dialog = within(await screen.findByTestId('confirm-dialog'));
    await user.press(dialog.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Interesting ideas from great books, one at a time.')).toBeOnTheScreen();
    await expect(backend.auth.getSession()).resolves.toBeNull();
    expect(screen.getByRole('tab', { name: 'Log in' })).toBeSelected();
    expect(screen.getByLabelText('Email')).toHaveDisplayValue(email);

    await user.type(screen.getByLabelText('Password'), 'readmore');
    await user.press(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('mindfeed.')).toBeOnTheScreen();
  });
});
