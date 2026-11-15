import { content } from '@mindfeed/content';

import type { Backend } from '../types';

/**
 * The behaviour every Backend must have. Each implementation runs this suite,
 * so the fake used by app tests is proven to behave like Supabase.
 */
export function describeBackendContract(name: string, makeBackend: () => Backend) {
  describe(`${name} Backend`, () => {
    let backend: Backend;

    beforeEach(() => {
      backend = makeBackend();
    });

    const newAccount = () => ({ name: 'Maya Lin', email: `maya-${crypto.randomUUID()}@example.com`, password: 'readmore' });

    test('has no session when nobody is signed in', async () => {
      await expect(backend.auth.getSession()).resolves.toBeNull();
    });

    test('signing up signs the new user in straight away, with no email confirmation', async () => {
      const account = newAccount();

      const session = await backend.auth.signUp(account);

      expect(session.email).toBe(account.email);
      await expect(backend.auth.getSession()).resolves.toEqual(session);
    });

    test('signing up creates a profile with the given name and an empty bio', async () => {
      await backend.auth.signUp(newAccount());

      await expect(backend.userData.getProfile()).resolves.toEqual({ name: 'Maya Lin', bio: '' });
    });

    test('signing up with an email that already has an account fails with email-taken', async () => {
      const account = newAccount();
      await backend.auth.signUp(account);
      await backend.auth.logOut();

      await expect(backend.auth.signUp(account)).rejects.toMatchObject({ code: 'email-taken' });
    });

    test('logging out ends the session, and logging back in restores it', async () => {
      const account = newAccount();
      const session = await backend.auth.signUp(account);

      await backend.auth.logOut();
      await expect(backend.auth.getSession()).resolves.toBeNull();

      await expect(backend.auth.logIn(account)).resolves.toEqual(session);
      await expect(backend.auth.getSession()).resolves.toEqual(session);
    });

    test('a wrong password and an unknown email fail the same way, with invalid-credentials', async () => {
      const account = newAccount();
      await backend.auth.signUp(account);
      await backend.auth.logOut();

      await expect(backend.auth.logIn({ ...account, password: 'wrong-password' })).rejects.toMatchObject({ code: 'invalid-credentials' });
      await expect(backend.auth.logIn({ ...account, email: `nobody-${crypto.randomUUID()}@example.com` })).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
      await expect(backend.auth.getSession()).resolves.toBeNull();
    });

    test('session listeners hear sign-up, log-out and log-in, until they unsubscribe', async () => {
      const account = newAccount();
      const heard: (string | null)[] = [];
      const unsubscribe = backend.auth.onSessionChange((session) => heard.push(session?.email ?? null));

      await backend.auth.signUp(account);
      await backend.auth.logOut();
      await backend.auth.logIn(account);
      unsubscribe();
      await backend.auth.logOut();

      // Supabase also reports the starting state on subscribe, so check the order of the changes only.
      expect(heard.filter((email, i) => email !== heard[i - 1]).slice(-3)).toEqual([account.email, null, account.email]);
    });

    describe('Interests', () => {
      const [history, psychology, philosophy, economics, investing] = content.topics.map((topic) => topic.id);
      const sorted = (ids: string[]) => [...ids].sort();

      test('a new account has none', async () => {
        await backend.auth.signUp(newAccount());

        await expect(backend.userData.getInterests()).resolves.toEqual([]);
      });

      test('setting them replaces the previous ones entirely', async () => {
        await backend.auth.signUp(newAccount());

        await backend.userData.setInterests([history, psychology, philosophy]);
        await backend.userData.setInterests([philosophy, economics, investing]);

        expect(sorted(await backend.userData.getInterests())).toEqual(sorted([philosophy, economics, investing]));
      });

      test('fewer than 3 are rejected and change nothing', async () => {
        await backend.auth.signUp(newAccount());
        await backend.userData.setInterests([history, psychology, philosophy]);

        await expect(backend.userData.setInterests([economics, investing])).rejects.toThrow();
        await expect(backend.userData.setInterests([economics, economics, investing])).rejects.toThrow();

        expect(sorted(await backend.userData.getInterests())).toEqual(sorted([history, psychology, philosophy]));
      });
    });

    test("each user sees only their own profile and Interests, and can't change another's", async () => {
      const maya = newAccount();
      await backend.auth.signUp(maya);
      await backend.userData.setInterests(content.topics.slice(0, 3).map((topic) => topic.id));
      await backend.auth.logOut();

      await backend.auth.signUp({ ...newAccount(), name: 'Sam Reyes' });
      await expect(backend.userData.getProfile()).resolves.toEqual({ name: 'Sam Reyes', bio: '' });
      await expect(backend.userData.getInterests()).resolves.toEqual([]);
      await backend.userData.setInterests(content.topics.slice(3, 6).map((topic) => topic.id));
      await backend.auth.logOut();

      await backend.auth.logIn(maya);
      await expect(backend.userData.getProfile()).resolves.toEqual({ name: 'Maya Lin', bio: '' });
      expect([...(await backend.userData.getInterests())].sort()).toEqual(content.topics.slice(0, 3).map((topic) => topic.id).sort());
    });

    test('user data is out of reach when nobody is signed in', async () => {
      await expect(backend.userData.getProfile()).rejects.toThrow();
      await expect(backend.userData.getInterests()).rejects.toThrow();
      await expect(backend.userData.setInterests(content.topics.slice(0, 3).map((topic) => topic.id))).rejects.toThrow();
    });

    test('lists every Topic, ordered by name', async () => {
      await backend.auth.signUp(newAccount());

      const topics = await backend.content.getTopics();

      expect(topics.map((topic) => topic.name)).toEqual([
        'Business',
        'Communication',
        'Decision-making',
        'Economics',
        'History',
        'Investing',
        'Leadership',
        'Philosophy',
        'Psychology',
      ]);
      expect(topics).toContainEqual({ id: content.topics[0].id, name: 'History', hue: 65 });
    });
  });
}
