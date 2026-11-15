import { fileURLToPath } from 'node:url';

/** The committed seed file that `supabase db reset` loads. */
export const seedSqlPath = fileURLToPath(new URL('../../../supabase/seed.sql', import.meta.url));
