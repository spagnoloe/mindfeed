import { createClient, type SupportedStorage } from '@supabase/supabase-js';

import type { Backend } from './types';

export type SupabaseBackendOptions = {
  url: string;
  anonKey: string;
  /** Where the session is kept between launches. Omit (e.g. in tests) to keep it in memory, without background token refresh. */
  storage?: SupportedStorage;
};

export function createSupabaseBackend({ url, anonKey, storage }: SupabaseBackendOptions): Backend {
  const client = createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: storage !== undefined,
      autoRefreshToken: storage !== undefined,
      detectSessionInUrl: false,
    },
  });

  return {
    auth: {
      async getSession() {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        const user = data.session?.user;
        return user ? { userId: user.id, email: user.email ?? '' } : null;
      },
    },
    content: {},
    userData: {},
  };
}
