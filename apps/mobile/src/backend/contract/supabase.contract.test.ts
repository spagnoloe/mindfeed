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
