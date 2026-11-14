import type { Backend } from './types';

/** An in-memory Backend for tests. Must behave like the Supabase one (see contract tests). */
export function createFakeBackend(): Backend {
  return {
    auth: {
      async getSession() {
        return null;
      },
    },
    content: {},
    userData: {},
  };
}
