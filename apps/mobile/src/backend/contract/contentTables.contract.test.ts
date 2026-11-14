/**
 * Access rules of the content tables in local Supabase: any signed-in user can
 * read Topics, Books and Ideas, and no client can write them. Expects the seed
 * from packages/content to be loaded (`supabase start` / `supabase db reset`).
 */
import { content } from '@mindfeed/content';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { localSupabase } from './localSupabase';

const { url, anonKey } = localSupabase();
const newClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

const tables = ['topics', 'books', 'ideas'] as const;
const sampleRow = { topics: content.topics[0], books: content.books[0], ideas: content.ideas[0] };

/** Complete, valid new rows, so an insert can only fail because of the access rules. */
const newRow = (): Record<(typeof tables)[number], Record<string, unknown>> => ({
  topics: { id: crypto.randomUUID(), name: 'New Topic', hue: 10, trending_order: null },
  books: { id: crypto.randomUUID(), title: 'New Book', author: 'Someone', isbn: '9780000000000', cover_hue: 10 },
  ideas: {
    id: crypto.randomUUID(),
    book_id: content.books[0].id,
    topic_id: content.topics[0].id,
    title: 'New Idea',
    explanation: 'Not allowed.',
  },
});

// Postgres's insufficient_privilege, which is what row-level security raises.
const RLS_VIOLATION = '42501';

describe('Content tables', () => {
  let signedIn: SupabaseClient;

  beforeAll(async () => {
    signedIn = newClient();
    const { error } = await signedIn.auth.signUp({
      email: `content-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'password123',
    });
    if (error) throw error;
  });

  test('a signed-in user can read every Topic, Book and Idea', async () => {
    for (const table of tables) {
      const { count, error } = await signedIn.from(table).select('*', { count: 'exact', head: true });
      expect(error).toBeNull();
      expect(count).toBe(content[table].length);
    }
  });

  test('someone not signed in reads nothing', async () => {
    for (const table of tables) {
      const { data, error } = await newClient().from(table).select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  test.each(tables)('a signed-in user cannot insert into %s', async (table) => {
    const { error } = await signedIn.from(table).insert(newRow()[table]);
    expect(error?.code).toBe(RLS_VIOLATION);
  });

  test.each(tables)('a signed-in user cannot update or delete %s', async (table) => {
    const { id } = sampleRow[table];
    // RLS hides the row from writes, so these affect nothing rather than erroring.
    const updated = await signedIn.from(table).update({ id: crypto.randomUUID() }).eq('id', id).select();
    expect(updated.data ?? []).toEqual([]);
    const deleted = await signedIn.from(table).delete().eq('id', id).select();
    expect(deleted.data ?? []).toEqual([]);

    const { data } = await signedIn.from(table).select('id').eq('id', id);
    expect(data).toEqual([{ id }]);
  });
});
