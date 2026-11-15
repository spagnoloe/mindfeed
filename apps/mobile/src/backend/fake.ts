import { content } from '@mindfeed/content';

import { AuthError, MIN_INTERESTS, type Backend, type Profile, type Session } from './types';

type Account = { session: Session; password: string; profile: Profile; interests: string[] };

const topics = content.topics
  .map(({ id, name, hue }) => ({ id, name, hue }))
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

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
