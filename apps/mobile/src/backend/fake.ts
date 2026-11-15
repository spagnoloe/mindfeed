import { content } from '@mindfeed/content';

import { AuthError, MAX_FEED_PAGE, MIN_INTERESTS, type Backend, type Book, type Idea, type Profile, type Session, type Topic } from './types';

type Account = { session: Session; password: string; profile: Profile; interests: string[] };

const topics = content.topics
  .map(({ id, name, hue }) => ({ id, name, hue }))
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const topicsById = new Map<string, Topic>(topics.map((topic) => [topic.id, topic]));
const booksById = new Map<string, Book>(
  content.books.map(({ id, title, author, isbn, coverHue }) => [id, { id, title, author, isbn, coverHue }]),
);
const ideas: Idea[] = content.ideas.map(({ id, title, explanation, topicId, bookId }) => ({
  id,
  title,
  explanation,
  topic: topicsById.get(topicId)!,
  book: booksById.get(bookId)!,
}));

const byTitle = (a: Idea, b: Idea) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);

/** A copy, so callers can't change the fake's content. */
const copy = (idea: Idea): Idea => ({ ...idea, topic: { ...idea.topic }, book: { ...idea.book } });

/** 32-bit FNV-1a: a stable, seedable shuffle key. Supabase uses md5 instead; only the properties match. */
function shuffleKey(seed: string, id: string): number {
  let hash = 0x811c9dc5;
  for (const char of seed + id) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash;
}

/** An in-memory Backend for tests. Must behave like the Supabase one (see contract tests). */
export function createFakeBackend(): Backend {
  const accounts = new Map<string, Account>();
  let current: Session | null = null;
  const listeners = new Set<(session: Session | null) => void>();

  function setSession(session: Session | null) {
    current = session;
    for (const listener of listeners) listener(session);
  }

  function signedInAccount(): Account {
    const account = current && accounts.get(current.email);
    if (!account) throw new AuthError('unknown', 'Not signed in');
    return account;
  }

  return {
    auth: {
      async getSession() {
        return current;
      },
      async signUp({ name, email, password }) {
        if (accounts.has(email)) throw new AuthError('email-taken');
        const session = { userId: crypto.randomUUID(), email };
        accounts.set(email, { session, password, profile: { name, bio: '' }, interests: [] });
        setSession(session);
        return session;
      },
      async logIn({ email, password }) {
        const account = accounts.get(email);
        if (!account || account.password !== password) throw new AuthError('invalid-credentials');
        setSession(account.session);
        return account.session;
      },
      async logOut() {
        setSession(null);
      },
      onSessionChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    content: {
      async getTopics() {
        return topics.map((topic) => ({ ...topic }));
      },
      async getFeedPage({ seed, offset, limit }) {
        if (offset < 0 || limit < 1 || limit > MAX_FEED_PAGE) throw new Error('Invalid feed page');
        const interests = signedInAccount().interests;
        const rank = (idea: Idea) => (interests.includes(idea.topic.id) ? 0 : 1);
        const order = [...ideas].sort((a, b) => rank(a) - rank(b) || shuffleKey(seed, a.id) - shuffleKey(seed, b.id));
        return Array.from({ length: limit }, (_, i) => copy(order[(offset + i) % order.length]));
      },
      async getIdea(ideaId) {
        const idea = ideas.find((candidate) => candidate.id === ideaId);
        if (!idea) throw new Error(`No Idea ${ideaId}`);
        return copy(idea);
      },
      async getTopicIdeas(topicId) {
        return ideas.filter((idea) => idea.topic.id === topicId).sort(byTitle).map(copy);
      },
      async getBook(bookId) {
        const book = booksById.get(bookId);
        if (!book) throw new Error(`No Book ${bookId}`);
        return { ...book, ideaCount: ideas.filter((idea) => idea.book.id === bookId).length };
      },
      async getBookIdeas(bookId) {
        return ideas.filter((idea) => idea.book.id === bookId).sort(byTitle).map(copy);
      },
    },
    userData: {
      async getProfile() {
        return { ...signedInAccount().profile };
      },
      async getInterests() {
        return [...signedInAccount().interests];
      },
      async setInterests(topicIds) {
        const account = signedInAccount();
        const distinct = [...new Set(topicIds)];
        if (distinct.length < MIN_INTERESTS) throw new Error(`Pick at least ${MIN_INTERESTS} Interests`);
        account.interests = distinct;
      },
    },
  };
}
