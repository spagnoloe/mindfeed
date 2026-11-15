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

    describe('Home feed', () => {
      const total = content.ideas.length;
      // Few Ideas between them, so a short page holds all of them and some others.
      const interests = ['Economics', 'Philosophy', 'History'].map((name) => content.topics.find((topic) => topic.name === name)!.id);
      const inInterests = content.ideas.filter((idea) => interests.includes(idea.topicId));

      beforeEach(async () => {
        await backend.auth.signUp(newAccount());
        await backend.userData.setInterests(interests);
      });

      const wholeFeed = async (seed: string) => (await backend.content.getFeedPage({ seed, offset: 0, limit: total })).map((idea) => idea.id);

      test('lists every Idea once, those in the Interests first', async () => {
        const ids = await wholeFeed('seed-a');

        expect([...ids].sort()).toEqual(content.ideas.map((idea) => idea.id).sort());
        expect([...ids.slice(0, inInterests.length)].sort()).toEqual(inInterests.map((idea) => idea.id).sort());
      });

      test('gives each Idea with its Topic and Book', async () => {
        const [idea] = await backend.content.getFeedPage({ seed: 'seed-a', offset: 0, limit: 1 });
        const source = content.ideas.find((candidate) => candidate.id === idea.id)!;
        const topic = content.topics.find((candidate) => candidate.id === source.topicId)!;
        const book = content.books.find((candidate) => candidate.id === source.bookId)!;

        expect(idea).toEqual({
          id: source.id,
          title: source.title,
          explanation: source.explanation,
          topic: { id: topic.id, name: topic.name, hue: topic.hue },
          book: { id: book.id, title: book.title, author: book.author, isbn: book.isbn, coverHue: book.coverHue },
        });
      });

      test('the same seed gives the same order, and another seed a different one', async () => {
        const order = await wholeFeed('seed-a');

        expect(await wholeFeed('seed-a')).toEqual(order);
        const other = await wholeFeed('seed-b');
        expect(other).not.toEqual(order);
        // Each group is shuffled on its own, so the Interests still come first.
        expect([...other.slice(0, inInterests.length)].sort()).toEqual([...order.slice(0, inInterests.length)].sort());
        expect(other.slice(0, inInterests.length)).not.toEqual(order.slice(0, inInterests.length));
      });

      test('pages follow on from each other, and wrap around past the last Idea forever', async () => {
        const order = await wholeFeed('seed-a');
        const page = async (offset: number, limit: number) =>
          (await backend.content.getFeedPage({ seed: 'seed-a', offset, limit })).map((idea) => idea.id);

        expect([...(await page(0, 10)), ...(await page(10, 10))]).toEqual(order.slice(0, 20));
        expect(await page(total - 2, 4)).toEqual([...order.slice(total - 2), ...order.slice(0, 2)]);
        expect(await page(total * 3 + 5, 3)).toEqual(order.slice(5, 8));
      });
    });

    describe('Ideas, Topics and Books', () => {
      const byTitle = (a: { title: string }, b: { title: string }) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);

      beforeEach(async () => {
        await backend.auth.signUp(newAccount());
      });

      test('gets an Idea by id, with its Topic and Book', async () => {
        const source = content.ideas[7];
        const idea = await backend.content.getIdea(source.id);

        expect(idea.title).toBe(source.title);
        expect(idea.explanation).toBe(source.explanation);
        expect(idea.topic.id).toBe(source.topicId);
        expect(idea.book.id).toBe(source.bookId);
      });

      test('an unknown Idea or Book is rejected', async () => {
        await expect(backend.content.getIdea(crypto.randomUUID())).rejects.toThrow();
        await expect(backend.content.getBook(crypto.randomUUID())).rejects.toThrow();
      });

      test("lists a Topic's Ideas, ordered by title", async () => {
        const topic = content.topics[0];

        const ideas = await backend.content.getTopicIdeas(topic.id);

        const expected = content.ideas.filter((idea) => idea.topicId === topic.id).sort(byTitle);
        expect(ideas.map((idea) => idea.id)).toEqual(expected.map((idea) => idea.id));
        expect(ideas.every((idea) => idea.topic.name === topic.name)).toBe(true);
      });

      test("gets a Book with its Idea count, and lists the Book's Ideas, ordered by title", async () => {
        const book = content.books[1];
        const expected = content.ideas.filter((idea) => idea.bookId === book.id).sort(byTitle);

        await expect(backend.content.getBook(book.id)).resolves.toEqual({
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          coverHue: book.coverHue,
          ideaCount: expected.length,
        });
        const ideas = await backend.content.getBookIdeas(book.id);
        expect(ideas.map((idea) => idea.id)).toEqual(expected.map((idea) => idea.id));
        expect(ideas.every((idea) => idea.book.title === book.title)).toBe(true);
      });
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
