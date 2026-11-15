import { content } from '@mindfeed/content';

import type { Backend, SearchResult } from '../types';

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
      const ideaId = content.ideas[0].id;
      await expect(backend.userData.getProfile()).rejects.toThrow();
      await expect(backend.userData.getInterests()).rejects.toThrow();
      await expect(backend.userData.setInterests(content.topics.slice(0, 3).map((topic) => topic.id))).rejects.toThrow();
      await expect(backend.userData.getLikedIdeas()).rejects.toThrow();
      await expect(backend.userData.like(ideaId)).rejects.toThrow();
      await expect(backend.userData.unlike(ideaId)).rejects.toThrow();
      await expect(backend.userData.isLiked(ideaId)).rejects.toThrow();
      await expect(backend.userData.getStacks()).rejects.toThrow();
      await expect(backend.userData.createStack({ name: 'Work', ideaId })).rejects.toThrow();
      await expect(backend.userData.addToStack(crypto.randomUUID(), ideaId)).rejects.toThrow();
      await expect(backend.userData.removeFromStack(crypto.randomUUID(), ideaId)).rejects.toThrow();
      await expect(backend.userData.getStacksWith(ideaId)).rejects.toThrow();
      await expect(backend.userData.getStack(crypto.randomUUID())).rejects.toThrow();
      await expect(backend.userData.updateStack(crypto.randomUUID(), { name: 'Work', description: '' })).rejects.toThrow();
      await expect(backend.userData.deleteStack(crypto.randomUUID())).rejects.toThrow();
    });

    describe('Likes', () => {
      const [first, second, third] = content.ideas.map((idea) => idea.id);
      const likedIds = async () => (await backend.userData.getLikedIdeas()).map((idea) => idea.id);

      beforeEach(async () => {
        await backend.auth.signUp(newAccount());
      });

      test('a new account has none', async () => {
        await expect(backend.userData.getLikedIdeas()).resolves.toEqual([]);
        await expect(backend.userData.isLiked(first)).resolves.toBe(false);
      });

      test('Liked Ideas are newest first, each with its Topic and Book', async () => {
        await backend.userData.like(first);
        await backend.userData.like(second);
        await backend.userData.like(third);

        expect(await likedIds()).toEqual([third, second, first]);
        const [newest] = await backend.userData.getLikedIdeas();
        await expect(backend.content.getIdea(third)).resolves.toEqual(newest);
      });

      test('like and unlike change is-liked', async () => {
        await backend.userData.like(first);
        await expect(backend.userData.isLiked(first)).resolves.toBe(true);
        await expect(backend.userData.isLiked(second)).resolves.toBe(false);

        await backend.userData.unlike(first);
        await expect(backend.userData.isLiked(first)).resolves.toBe(false);
        expect(await likedIds()).toEqual([]);
      });

      test('liking twice keeps one Like, in its first place, and unliking twice is harmless', async () => {
        await backend.userData.like(first);
        await backend.userData.like(second);
        await backend.userData.like(first);

        expect(await likedIds()).toEqual([second, first]);

        await backend.userData.unlike(second);
        await backend.userData.unlike(second);
        await backend.userData.unlike(third);
        expect(await likedIds()).toEqual([first]);
      });
    });

    test("each user sees and changes only their own Likes", async () => {
      const [first, second] = content.ideas.map((idea) => idea.id);
      const maya = newAccount();
      await backend.auth.signUp(maya);
      await backend.userData.like(first);
      await backend.auth.logOut();

      await backend.auth.signUp(newAccount());
      await expect(backend.userData.getLikedIdeas()).resolves.toEqual([]);
      await expect(backend.userData.isLiked(first)).resolves.toBe(false);
      await backend.userData.like(second);
      await backend.userData.unlike(first);
      await backend.auth.logOut();

      await backend.auth.logIn(maya);
      expect((await backend.userData.getLikedIdeas()).map((idea) => idea.id)).toEqual([first]);
    });

    describe('Stacks', () => {
      const [first, second, third] = content.ideas;
      const topicOf = (idea: (typeof content.ideas)[number]) => {
        const { id, name, hue } = content.topics.find((topic) => topic.id === idea.topicId)!;
        return { id, name, hue };
      };

      beforeEach(async () => {
        await backend.auth.signUp(newAccount());
      });

      test('a new account has none', async () => {
        await expect(backend.userData.getStacks()).resolves.toEqual([]);
        await expect(backend.userData.getStacksWith(first.id)).resolves.toEqual([]);
      });

      test('creating a Stack with an Idea gives a Stack holding it, tinted by its Topic', async () => {
        const stack = await backend.userData.createStack({ name: '  Thinking better ', description: ' Mental models ', ideaId: first.id });

        expect(stack).toEqual({ id: expect.any(String), name: 'Thinking better', description: 'Mental models', ideaCount: 1, firstTopic: topicOf(first) });
        await expect(backend.userData.getStacks()).resolves.toEqual([stack]);
        await expect(backend.userData.getStacksWith(first.id)).resolves.toEqual([stack.id]);
      });

      test('a Stack created without an Idea or description is empty and untinted', async () => {
        const stack = await backend.userData.createStack({ name: 'Work' });

        expect(stack).toEqual({ id: expect.any(String), name: 'Work', description: '', ideaCount: 0, firstTopic: null });
      });

      test('Stacks are newest first', async () => {
        const older = await backend.userData.createStack({ name: 'Older' });
        const newer = await backend.userData.createStack({ name: 'Newer' });
        const newest = await backend.userData.createStack({ name: 'Newest' });

        expect((await backend.userData.getStacks()).map((stack) => stack.id)).toEqual([newest.id, newer.id, older.id]);
      });

      test('a blank name is rejected and creates nothing', async () => {
        await expect(backend.userData.createStack({ name: '   ', ideaId: first.id })).rejects.toThrow();

        await expect(backend.userData.getStacks()).resolves.toEqual([]);
        await expect(backend.userData.getStacksWith(first.id)).resolves.toEqual([]);
      });

      test('adding and removing Ideas changes the count and which Stacks hold them, and the first Idea added tints the Stack', async () => {
        const work = await backend.userData.createStack({ name: 'Work' });
        const reading = await backend.userData.createStack({ name: 'Reading', ideaId: second.id });

        await backend.userData.addToStack(work.id, second.id);
        await backend.userData.addToStack(work.id, third.id);

        const [readingNow, workNow] = await backend.userData.getStacks();
        expect(workNow).toMatchObject({ id: work.id, ideaCount: 2, firstTopic: topicOf(second) });
        expect(readingNow).toMatchObject({ id: reading.id, ideaCount: 1 });
        expect([...(await backend.userData.getStacksWith(second.id))].sort()).toEqual([work.id, reading.id].sort());

        await backend.userData.removeFromStack(work.id, second.id);

        const [, workAfter] = await backend.userData.getStacks();
        expect(workAfter).toMatchObject({ ideaCount: 1, firstTopic: topicOf(third) });
        await expect(backend.userData.getStacksWith(second.id)).resolves.toEqual([reading.id]);
      });

      test('adding twice keeps one, in its first place, and removing twice is harmless', async () => {
        const stack = await backend.userData.createStack({ name: 'Work', ideaId: first.id });

        await backend.userData.addToStack(stack.id, second.id);
        await backend.userData.addToStack(stack.id, first.id);
        await backend.userData.addToStack(stack.id, second.id);
        expect((await backend.userData.getStacks())[0]).toMatchObject({ ideaCount: 2, firstTopic: topicOf(first) });

        await backend.userData.removeFromStack(stack.id, second.id);
        await backend.userData.removeFromStack(stack.id, second.id);
        await backend.userData.removeFromStack(stack.id, third.id);
        expect((await backend.userData.getStacks())[0]).toMatchObject({ ideaCount: 1 });
      });

      test('a Stack comes with its Ideas in the order they were added', async () => {
        const stack = await backend.userData.createStack({ name: 'Work', description: 'For work', ideaId: second.id });
        await backend.userData.addToStack(stack.id, third.id);
        await backend.userData.addToStack(stack.id, first.id);

        const got = await backend.userData.getStack(stack.id);

        expect(got).toMatchObject({ id: stack.id, name: 'Work', description: 'For work', ideaCount: 3, firstTopic: topicOf(second) });
        expect(got.ideas.map((idea) => idea.id)).toEqual([second.id, third.id, first.id]);
        expect(got.ideas[0]).toEqual(await backend.content.getIdea(second.id));
      });

      test('getting a Stack that does not exist rejects', async () => {
        await expect(backend.userData.getStack(crypto.randomUUID())).rejects.toThrow();
      });

      test('updating a Stack trims and saves its name and description, keeping its Ideas', async () => {
        const stack = await backend.userData.createStack({ name: 'Work', description: 'For work', ideaId: first.id });

        const updated = await backend.userData.updateStack(stack.id, { name: ' Deep work ', description: '  ' });

        expect(updated).toEqual({ ...stack, name: 'Deep work', description: '' });
        await expect(backend.userData.getStacks()).resolves.toEqual([updated]);
        expect((await backend.userData.getStack(stack.id)).ideas.map((idea) => idea.id)).toEqual([first.id]);
      });

      test('updating a Stack with a blank name is rejected and changes nothing', async () => {
        const stack = await backend.userData.createStack({ name: 'Work', description: 'For work' });

        await expect(backend.userData.updateStack(stack.id, { name: '  ', description: 'Other' })).rejects.toThrow();

        await expect(backend.userData.getStacks()).resolves.toEqual([stack]);
      });

      test('deleting a Stack removes it and its entries, but not its Ideas or their Likes', async () => {
        const doomed = await backend.userData.createStack({ name: 'Work', ideaId: first.id });
        const kept = await backend.userData.createStack({ name: 'Reading', ideaId: first.id });
        await backend.userData.like(first.id);

        await backend.userData.deleteStack(doomed.id);

        await expect(backend.userData.getStacks()).resolves.toEqual([kept]);
        await expect(backend.userData.getStack(doomed.id)).rejects.toThrow();
        await expect(backend.userData.getStacksWith(first.id)).resolves.toEqual([kept.id]);
        await expect(backend.content.getIdea(first.id)).resolves.toMatchObject({ id: first.id });
        await expect(backend.userData.isLiked(first.id)).resolves.toBe(true);
      });
    });

    test("each user sees and changes only their own Stacks", async () => {
      const [first, second] = content.ideas.map((idea) => idea.id);
      const maya = newAccount();
      await backend.auth.signUp(maya);
      const mayas = await backend.userData.createStack({ name: 'Thinking better', ideaId: first });
      await backend.auth.logOut();

      await backend.auth.signUp(newAccount());
      await expect(backend.userData.getStacks()).resolves.toEqual([]);
      await expect(backend.userData.getStacksWith(first)).resolves.toEqual([]);
      await expect(backend.userData.addToStack(mayas.id, second)).rejects.toThrow();
      await backend.userData.removeFromStack(mayas.id, first);
      await expect(backend.userData.getStack(mayas.id)).rejects.toThrow();
      await expect(backend.userData.updateStack(mayas.id, { name: 'Hacked', description: '' })).rejects.toThrow();
      await expect(backend.userData.deleteStack(mayas.id)).rejects.toThrow();
      await backend.auth.logOut();

      await backend.auth.logIn(maya);
      await expect(backend.userData.getStacks()).resolves.toEqual([mayas]);
      await expect(backend.userData.getStacksWith(first)).resolves.toEqual([mayas.id]);
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

    describe('Explore', () => {
      beforeEach(async () => {
        await backend.auth.signUp(newAccount());
      });

      test('lists the Trending topics in their trending order', async () => {
        const trending = await backend.content.getTrendingTopics();

        expect(trending.map((topic) => topic.name)).toEqual(['Psychology', 'Investing', 'Leadership', 'History']);
        expect(trending[0]).toEqual({ id: content.topics[1].id, name: 'Psychology', hue: 30 });
      });

      test('lists every Topic with its Idea count, ordered by name', async () => {
        const topics = await backend.content.getTopicSummaries();

        expect(topics.map(({ name, ideaCount }) => `${name} ${ideaCount}`)).toEqual([
          'Business 8',
          'Communication 7',
          'Decision-making 7',
          'Economics 3',
          'History 6',
          'Investing 9',
          'Leadership 8',
          'Philosophy 5',
          'Psychology 7',
        ]);
        expect(topics).toContainEqual({ id: content.topics[0].id, name: 'History', hue: 65, ideaCount: 6 });
      });

      test('lists every Book, ordered by title', async () => {
        const books = await backend.content.getBooks();

        expect(books.map((book) => book.title)).toEqual(['Conscious Business', 'Principles', 'Sapiens', 'Start with Why', 'The Intelligent Investor']);
        expect(books).toContainEqual({
          id: content.books[0].id,
          title: 'Sapiens',
          author: 'Yuval Noah Harari',
          isbn: '9780062316097',
          coverHue: 65,
        });
      });
    });

    describe('Search', () => {
      const ideaId = (title: string) => content.ideas.find((idea) => idea.title === title)!.id;
      const labels = (results: SearchResult[]) =>
        results.map((result) => `${result.kind}: ${result.kind === 'topic' ? result.name : result.title}`);

      beforeEach(async () => {
        await backend.auth.signUp(newAccount());
      });

      test('matches Topic names, Book titles and Idea titles and explanations case-insensitively, grouped Topics, Books, Ideas', async () => {
        const results = await backend.content.search('iNVeSt');

        expect(labels(results)).toEqual([
          'topic: Investing',
          'book: The Intelligent Investor',
          // The first two by title, the others by explanation, all ordered by title.
          'idea: Invest the same amount on a schedule',
          'idea: Investing is not speculating',
          'idea: Past growth is a poor forecast',
          'idea: Price is not value',
          'idea: Your effort should set your strategy',
        ]);
        expect(results.slice(0, 3)).toEqual([
          { kind: 'topic', id: content.topics[4].id, name: 'Investing', hue: 110, ideaCount: 9 },
          { kind: 'book', id: content.books[3].id, title: 'The Intelligent Investor', author: 'Benjamin Graham' },
          { kind: 'idea', id: ideaId('Invest the same amount on a schedule'), title: 'Invest the same amount on a schedule', bookTitle: 'The Intelligent Investor' },
        ]);
      });

      test('matches Book authors', async () => {
        await expect(backend.content.search('DALIO')).resolves.toEqual([
          { kind: 'book', id: content.books[1].id, title: 'Principles', author: 'Ray Dalio' },
        ]);
      });

      test('ignores surrounding spaces, and a blank query or one matching nothing finds nothing', async () => {
        expect(labels(await backend.content.search('  wishful '))).toEqual(['idea: Face reality as it is']);
        await expect(backend.content.search('   ')).resolves.toEqual([]);
        await expect(backend.content.search('zzzz')).resolves.toEqual([]);
        // Wildcards match only themselves.
        await expect(backend.content.search('%')).resolves.toEqual([]);
        await expect(backend.content.search('_')).resolves.toEqual([]);
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
