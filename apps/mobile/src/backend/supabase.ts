import { createClient, type AuthError as SupabaseAuthError, type SupportedStorage, type User } from '@supabase/supabase-js';

import { AuthError, type Backend, type Session } from './types';

export type SupabaseBackendOptions = {
  url: string;
  anonKey: string;
  /** Where the session is kept between launches. Omit (e.g. in tests) to keep it in memory, without background token refresh. */
  storage?: SupportedStorage;
};

const toSession = (user: User): Session => ({ userId: user.id, email: user.email ?? '' });

/** Supabase's error codes, in the app's terms. */
function toAuthError(error: SupabaseAuthError): AuthError {
  switch (error.code) {
    case 'invalid_credentials':
      return new AuthError('invalid-credentials', error.message);
    case 'user_already_exists':
    case 'email_exists':
      return new AuthError('email-taken', error.message);
    default:
      return new AuthError('unknown', error.message);
  }
}

/** A PostgREST error is a plain object; callers get a real Error. */
function dataError(error: { message: string }): Error {
  return new Error(error.message, { cause: error });
}

export function createSupabaseBackend({ url, anonKey, storage }: SupabaseBackendOptions): Backend {
  const client = createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: storage !== undefined,
      autoRefreshToken: storage !== undefined,
      detectSessionInUrl: false,
    },
  });

  async function signedInUserId(): Promise<string> {
    const { data } = await client.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw new AuthError('unknown', 'Not signed in');
    return userId;
  }

  return {
    auth: {
      async getSession() {
        const { data, error } = await client.auth.getSession();
        if (error) throw toAuthError(error);
        const user = data.session?.user;
        return user ? toSession(user) : null;
      },
      async signUp({ name, email, password }) {
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw toAuthError(error);
        // No session means Supabase wants the email confirmed first, which config.toml turns off.
        if (!data.session) throw new AuthError('unknown', 'Sign-up did not sign the user in');
        return toSession(data.session.user);
      },
      async logIn({ email, password }) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw toAuthError(error);
        return toSession(data.user);
      },
      async logOut() {
        const { error } = await client.auth.signOut();
        if (error) throw toAuthError(error);
      },
      onSessionChange(listener) {
        const { data } = client.auth.onAuthStateChange((_event, session) => {
          listener(session ? toSession(session.user) : null);
        });
        return () => data.subscription.unsubscribe();
      },
    },
    content: {
      async getTopics() {
        const { data, error } = await client.from('topics').select('id, name, hue').order('name');
        if (error) throw dataError(error);
        return data;
      },
    },
    userData: {
      async getProfile() {
        const userId = await signedInUserId();
        const { data, error } = await client.from('profiles').select('name, bio').eq('id', userId).single();
        if (error) throw dataError(error);
        return data;
      },
      async getInterests() {
        const userId = await signedInUserId();
        const { data, error } = await client.from('interests').select('topic_id').eq('user_id', userId);
        if (error) throw dataError(error);
        return data.map((row) => row.topic_id as string);
      },
      async setInterests(topicIds) {
        const { error } = await client.rpc('set_interests', { topic_ids: topicIds });
        if (error) throw dataError(error);
      },
    },
  };
}
