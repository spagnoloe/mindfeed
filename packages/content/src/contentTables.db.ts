/**
 * Access rules of the content tables in local Supabase: any signed-in user can
 * read Topics, Books and Ideas, and no client can write them. Needs local
 * Supabase running with this package's seed loaded (`supabase start` or
 * `supabase db reset` at the repo root). Run with `pnpm test:contract`.
 *
 * Talks to Supabase's HTTP API with plain fetch, exactly as a client would.
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { before, describe, test } from 'node:test';

import { content } from './index.ts';

function localSupabase(): { url: string; anonKey: string } {
  let output: string;
  try {
    output = execSync('supabase status -o json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch {
    throw new Error('Local Supabase is not running. Run `supabase start` at the repo root first.');
  }
  const status = JSON.parse(output) as { API_URL: string; ANON_KEY: string };
  return { url: status.API_URL, anonKey: status.ANON_KEY };
}

const { url, anonKey } = localSupabase();
const tables = ['topics', 'books', 'ideas'] as const;
type Table = (typeof tables)[number];

/** Complete, valid new rows, so an insert can only fail because of the access rules. */
const newRow = (): Record<Table, Record<string, unknown>> => ({
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

const existingId: Record<Table, string> = {
  topics: content.topics[0].id,
  books: content.books[0].id,
  ideas: content.ideas[0].id,
};

/** A REST request as the given access token: a user's after sign-in, or the anon key when signed out. */
async function rest(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  return { status: res.status, body: (await res.json()) as unknown };
}

describe('Content tables', () => {
  let signedIn: string;

  before(async () => {
    const res = await fetch(`${url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `content-${crypto.randomUUID()}@example.com`, password: 'password123' }),
    });
    const body = (await res.json()) as { access_token?: string };
    assert.ok(body.access_token, `sign-up failed: ${JSON.stringify(body)}`);
    signedIn = body.access_token;
  });

  test('a signed-in user can read every Topic, Book and Idea', async () => {
    for (const table of tables) {
      const { status, body } = await rest(signedIn, `${table}?select=id`);
      assert.equal(status, 200);
      assert.equal((body as unknown[]).length, content[table].length, table);
    }
  });

  test('someone not signed in reads nothing', async () => {
    for (const table of tables) {
      assert.deepEqual((await rest(anonKey, `${table}?select=id`)).body, [], table);
    }
  });

  for (const table of tables) {
    test(`a signed-in user cannot insert into ${table}`, async () => {
      const { body } = await rest(signedIn, table, { method: 'POST', body: JSON.stringify(newRow()[table]) });
      // 42501 is Postgres's insufficient_privilege, which row-level security raises.
      assert.equal((body as { code?: string }).code, '42501');
    });

    test(`a signed-in user cannot update or delete ${table}`, async () => {
      const id = existingId[table];
      // RLS hides the row from writes, so these affect nothing rather than erroring.
      const updated = await rest(signedIn, `${table}?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ id: crypto.randomUUID() }),
      });
      assert.deepEqual(updated.body, []);
      const deleted = await rest(signedIn, `${table}?id=eq.${id}`, { method: 'DELETE' });
      assert.deepEqual(deleted.body, []);
      assert.deepEqual((await rest(signedIn, `${table}?select=id&id=eq.${id}`)).body, [{ id }]);
    });
  }
});
