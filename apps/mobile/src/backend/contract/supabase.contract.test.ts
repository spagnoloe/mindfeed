import { content } from '@mindfeed/content';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import path from 'node:path';

import { createSupabaseBackend, type SupabaseBackendOptions } from '../supabase';
import { describeBackendContract } from './backendContract';

/** Connection details of the local Supabase started with `supabase start` at the repo root. */
function localSupabase(): SupabaseBackendOptions {
  const repoRoot = path.resolve(__dirname, '../../../../..');
  let output: string;
  try {
    output = execSync('supabase status -o json', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch {
    throw new Error('Local Supabase is not running. Run `supabase start` at the repo root first.');
  }
  const status = JSON.parse(output) as { API_URL: string; ANON_KEY: string };
  return { url: status.API_URL, anonKey: status.ANON_KEY };
}

const connection = localSupabase();

describeBackendContract('Supabase', () => createSupabaseBackend(connection));

/**
 * The Backend only ever asks for the signed-in user's rows, so the shared suite can't try
 * to reach someone else's. This asks Supabase directly, as a client could, to prove the
 * row-level security behind it.
 */
describe('Supabase row-level security on user data', () => {
  const topicIds = content.topics.map((topic) => topic.id);

  async function signedInClient(name: string) {
    const client = createClient(connection.url, connection.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signUp({
      email: `rls-${crypto.randomUUID()}@example.com`,
      password: 'readmore',
      options: { data: { name } },
    });
    if (error || !data.user) throw error ?? new Error('sign-up failed');
    return { client, userId: data.user.id };
  }

  let maya: Awaited<ReturnType<typeof signedInClient>>;
  let sam: Awaited<ReturnType<typeof signedInClient>>;

  beforeAll(async () => {
    maya = await signedInClient('Maya Lin');
    sam = await signedInClient('Sam Reyes');
    const { error } = await maya.client.rpc('set_interests', { topic_ids: topicIds.slice(0, 3) });
    if (error) throw new Error(error.message);
  });

  test("a user can't read another user's profile or Interests", async () => {
    expect((await sam.client.from('profiles').select('id').eq('id', maya.userId)).data).toEqual([]);
    expect((await sam.client.from('interests').select('topic_id').eq('user_id', maya.userId)).data).toEqual([]);
    expect((await sam.client.from('profiles').select('id')).data).toEqual([{ id: sam.userId }]);
  });

  test("a user can't change another user's profile", async () => {
    const { data } = await sam.client.from('profiles').update({ name: 'Hacked' }).eq('id', maya.userId).select();

    expect(data).toEqual([]);
    expect((await maya.client.from('profiles').select('name').single()).data).toEqual({ name: 'Maya Lin' });
  });

  test('a user can change only the name and bio of their own profile', async () => {
    const moved = await maya.client.from('profiles').update({ id: sam.userId }).eq('id', maya.userId);
    // 42501: the column grant leaves id read-only.
    expect(moved.error?.code).toBe('42501');

    const renamed = await maya.client.from('profiles').update({ name: 'Maya Lin', bio: 'Reads' }).eq('id', maya.userId).select('name, bio');
    expect(renamed.data).toEqual([{ name: 'Maya Lin', bio: 'Reads' }]);
  });

  test("a user can't add to or remove another user's Interests", async () => {
    const inserted = await sam.client.from('interests').insert({ user_id: maya.userId, topic_id: topicIds[5] });
    // 42501 is Postgres's insufficient_privilege, which row-level security raises.
    expect(inserted.error?.code).toBe('42501');

    const deleted = await sam.client.from('interests').delete().eq('user_id', maya.userId).select();
    expect(deleted.data).toEqual([]);

    const { data } = await maya.client.from('interests').select('topic_id');
    expect(data?.map((row) => row.topic_id).sort()).toEqual(topicIds.slice(0, 3).sort());
  });

  test('a user can only change their own Interests through set_interests, which keeps at least 3', async () => {
    const inserted = await maya.client.from('interests').insert({ user_id: maya.userId, topic_id: topicIds[5] });
    expect(inserted.error?.code).toBe('42501');

    const deleted = await maya.client.from('interests').delete().eq('user_id', maya.userId).select();
    expect(deleted.data).toEqual([]);

    const { data } = await maya.client.from('interests').select('topic_id');
    expect(data).toHaveLength(3);
  });

  test("a user can't read, add to or remove another user's Likes", async () => {
    const [liked, other] = content.ideas.map((idea) => idea.id);
    const like = await maya.client.from('likes').insert({ user_id: maya.userId, idea_id: liked });
    if (like.error) throw new Error(like.error.message);

    expect((await sam.client.from('likes').select('idea_id').eq('user_id', maya.userId)).data).toEqual([]);

    const inserted = await sam.client.from('likes').insert({ user_id: maya.userId, idea_id: other });
    expect(inserted.error?.code).toBe('42501');

    const deleted = await sam.client.from('likes').delete().eq('user_id', maya.userId).select();
    expect(deleted.data).toEqual([]);

    expect((await maya.client.from('likes').select('idea_id')).data).toEqual([{ idea_id: liked }]);
  });

  test("a user can't read, create in, or change another user's Stacks", async () => {
    const [filed, other] = content.ideas.map((idea) => idea.id);
    const created = await maya.client.rpc('create_stack', { stack_name: 'Thinking better', idea_id: filed });
    if (created.error) throw new Error(created.error.message);
    const stackId = created.data as string;

    expect((await sam.client.from('stacks').select('id').eq('id', stackId)).data).toEqual([]);
    expect((await sam.client.from('stack_summaries').select('id').eq('id', stackId)).data).toEqual([]);
    expect((await sam.client.from('stack_ideas').select('idea_id').eq('stack_id', stackId)).data).toEqual([]);

    const stolen = await sam.client.from('stacks').insert({ user_id: maya.userId, name: 'Hacked' });
    expect(stolen.error?.code).toBe('42501');
    const inserted = await sam.client.from('stack_ideas').insert({ stack_id: stackId, idea_id: other });
    expect(inserted.error?.code).toBe('42501');
    const renamed = await sam.client.from('stacks').update({ name: 'Hacked' }).eq('id', stackId).select();
    expect(renamed.data ?? []).toEqual([]);
    const deleted = await sam.client.from('stack_ideas').delete().eq('stack_id', stackId).select();
    expect(deleted.data).toEqual([]);
    const removed = await sam.client.from('stacks').delete().eq('id', stackId).select();
    expect(removed.data).toEqual([]);

    expect((await maya.client.from('stack_summaries').select('name, idea_count').eq('id', stackId)).data).toEqual([
      { name: 'Thinking better', idea_count: 1 },
    ]);
  });

  test('a user can change only the name and description of their own Stack', async () => {
    const created = await maya.client.rpc('create_stack', { stack_name: 'Work' });
    if (created.error) throw new Error(created.error.message);
    const stackId = created.data as string;

    const moved = await maya.client.from('stacks').update({ user_id: sam.userId }).eq('id', stackId);
    // 42501 again: the column grant leaves user_id and created_at read-only.
    expect(moved.error?.code).toBe('42501');
    const redated = await maya.client.from('stacks').update({ created_at: '2000-01-01' }).eq('id', stackId);
    expect(redated.error?.code).toBe('42501');

    const renamed = await maya.client.from('stacks').update({ name: 'Deep work', description: 'Focus' }).eq('id', stackId).select('name, description');
    expect(renamed.data).toEqual([{ name: 'Deep work', description: 'Focus' }]);
  });

  test('nobody signed in reads no profiles, Interests or Likes', async () => {
    const anon = createClient(connection.url, connection.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    expect((await anon.from('profiles').select('id')).data).toEqual([]);
    expect((await anon.from('interests').select('topic_id')).data).toEqual([]);
    expect((await anon.from('likes').select('idea_id')).data).toEqual([]);
  });
});
