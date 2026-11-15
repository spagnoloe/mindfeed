// Writes supabase/seed.sql from the content package. Run with `pnpm seed:generate`.
import { writeFileSync } from 'node:fs';

import { content } from '../src/index.ts';
import { seedSql } from '../src/seedSql.ts';
import { seedSqlPath } from '../src/seedSqlPath.ts';

writeFileSync(seedSqlPath, seedSql(content));
console.log(`Wrote ${seedSqlPath}`);
