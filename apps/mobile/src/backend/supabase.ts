import { createClient, type AuthError as SupabaseAuthError, type SupportedStorage, type User } from '@supabase/supabase-js';

import { AuthError, type Backend, type Book, type Idea, type Session } from './types';

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

const BOOK_COLUMNS = 'id, title, author, isbn, cover_hue';
const IDEA_COLUMNS = `id, title, explanation, topic:topics!inner(id, name, hue), book:books!inner(${BOOK_COLUMNS})`;

type BookRow = { id: string; title: string; author: string; isbn: string; cover_hue: number };
type IdeaRow = { id: string; title: string; explanation: string; topic: { id: string; name: string; hue: number }; book: BookRow };

/** A row of the `feed_page` function: an Idea with its Topic and Book flattened into columns. */
type FeedRow = {
  id: string;
  title: string;
  explanation: string;
  topic_id: string;
  topic_name: string;
  topic_hue: number;
  book_id: string;
  book_title: string;
  book_author: string;
  book_isbn: string;
  book_cover_hue: number;
};

const toBook = ({ id, title, author, isbn, cover_hue }: BookRow): Book => ({ id, title, author, isbn, coverHue: cover_hue });

const toIdea = ({ id, title, explanation, topic, book }: IdeaRow): Idea => ({ id, title, explanation, topic, book: toBook(book) });

const feedRowToIdea = (row: FeedRow): Idea => ({
  id: row.id,
  title: row.title,
  explanation: row.explanation,
  topic: { id: row.topic_id, name: row.topic_name, hue: row.topic_hue },
  book: { id: row.book_id, title: row.book_title, author: row.book_author, isbn: row.book_isbn, coverHue: row.book_cover_hue },
});

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
      async getFeedPage({ seed, offset, limit }) {
        const { data, error } = await client.rpc('feed_page', { seed, start_at: offset, page_size: limit });
        if (error) throw dataError(error);
        return (data as FeedRow[]).map(feedRowToIdea);
      },
      async getIdea(ideaId) {
        const { data, error } = await client.from('ideas').select(IDEA_COLUMNS).eq('id', ideaId).single();
        if (error) throw dataError(error);
        return toIdea(data as unknown as IdeaRow);
      },
      async getTopicIdeas(topicId) {
        const { data, error } = await client.from('ideas').select(IDEA_COLUMNS).eq('topic_id', topicId).order('title');
        if (error) throw dataError(error);
        return (data as unknown as IdeaRow[]).map(toIdea);
      },
      async getBook(bookId) {
        const { data, error } = await client.from('books').select(`${BOOK_COLUMNS}, ideas(count)`).eq('id', bookId).single();
        if (error) throw dataError(error);
        const { ideas, ...book } = data as unknown as BookRow & { ideas: { count: number }[] };
        return { ...toBook(book), ideaCount: ideas[0]?.count ?? 0 };
      },
      async getBookIdeas(bookId) {
        const { data, error } = await client.from('ideas').select(IDEA_COLUMNS).eq('book_id', bookId).order('title');
        if (error) throw dataError(error);
        return (data as unknown as IdeaRow[]).map(toIdea);
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
      async getLikedIdeas() {
        const userId = await signedInUserId();
        const { data, error } = await client
          .from('likes')
          .select(`idea:ideas!inner(${IDEA_COLUMNS})`)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw dataError(error);
        return (data as unknown as { idea: IdeaRow }[]).map((row) => toIdea(row.idea));
      },
      async like(ideaId) {
        const userId = await signedInUserId();
        // Already liked: the existing row, and its place in Liked Ideas, stay as they are.
        const { error } = await client
          .from('likes')
          .upsert({ user_id: userId, idea_id: ideaId }, { onConflict: 'user_id,idea_id', ignoreDuplicates: true });
        if (error) throw dataError(error);
      },
      async unlike(ideaId) {
        const userId = await signedInUserId();
        const { error } = await client.from('likes').delete().eq('user_id', userId).eq('idea_id', ideaId);
        if (error) throw dataError(error);
      },
      async isLiked(ideaId) {
        const userId = await signedInUserId();
        const { count, error } = await client
          .from('likes')
          .select('idea_id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('idea_id', ideaId);
        if (error) throw dataError(error);
        return (count ?? 0) > 0;
      },
    },
  };
}
