// Makes sure local Supabase has the dev account, signed up and onboarded, so the app can be
// opened straight to Home: Maya Lin, maya@example.com, password "readmore".
// Safe to run any time; run it again after `supabase db reset`, which deletes every account.
//
// Usage: node scripts/dev-account.mjs
//
// It goes through the same Auth sign-up and `set_interests` call as the app, so the profile is
// made the way a real sign-up makes it. These credentials only ever exist in local Supabase.
import { execFileSync } from 'node:child_process';

const ACCOUNT = { name: 'Maya Lin', email: 'maya@example.com', password: 'readmore' };
const INTERESTS = ['Psychology', 'Philosophy', 'History'];

try {
  await main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}

async function main() {
  let status;
  try {
    status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    throw new Error("local Supabase isn't running; start it with 'supabase start'");
  }
  const api = (path, { token, ...init } = {}) =>
    fetch(`${status.API_URL}${path}`, {
      ...init,
      headers: {
        apikey: status.ANON_KEY,
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

  let created = false;
  let response = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: ACCOUNT.email, password: ACCOUNT.password }),
  });
  if (!response.ok) {
    response = await api('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email: ACCOUNT.email, password: ACCOUNT.password, data: { name: ACCOUNT.name } }),
    });
    if (!response.ok) throw new Error(`sign-up failed: ${response.status} ${await response.text()}`);
    created = true;
  }
  const { access_token: token } = await response.json();
  if (!token) throw new Error('signing in returned no session; is email confirmation turned on?');

  const topics = await (await api(`/rest/v1/topics?select=id,name`, { token })).json();
  const ids = INTERESTS.map((name) => {
    const topic = topics.find((t) => t.name === name);
    if (!topic) throw new Error(`no Topic named "${name}"; the seed may not be loaded`);
    return topic.id;
  });
  response = await api('/rest/v1/rpc/set_interests', { method: 'POST', token, body: JSON.stringify({ topic_ids: ids }) });
  if (!response.ok) throw new Error(`setting Interests failed: ${response.status} ${await response.text()}`);

  console.log(`${created ? 'Created' : 'Checked'} the dev account: ${ACCOUNT.email} / ${ACCOUNT.password} (${INTERESTS.join(', ')})`);
}
