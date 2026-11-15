import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { checkContent } from './checkContent.ts';
import { content } from './index.ts';
import { seedSql } from './seedSql.ts';
import { seedSqlPath } from './seedSqlPath.ts';

test('the launch content passes every content check', () => {
  assert.deepEqual(checkContent(content), []);
});

test('the launch content has 9 Topics, 5 Books and 40–100 Ideas', () => {
  assert.equal(content.topics.length, 9);
  assert.equal(content.books.length, 5);
  assert.ok(content.ideas.length >= 40 && content.ideas.length <= 100, `${content.ideas.length} Ideas`);
});

test('the Trending topics are Psychology, Investing, Leadership, History', () => {
  const trending = content.topics
    .filter((t) => t.trendingOrder !== null)
    .toSorted((a, b) => a.trendingOrder! - b.trendingOrder!)
    .map((t) => t.name);
  assert.deepEqual(trending, ['Psychology', 'Investing', 'Leadership', 'History']);
});

test('the committed supabase/seed.sql is up to date (run `pnpm seed:generate` if not)', () => {
  assert.equal(readFileSync(seedSqlPath, 'utf8'), seedSql(content));
});
