import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seedSql } from './seedSql.ts';

test('writes one upsert per content table, in dependency order', () => {
  const sql = seedSql({
    topics: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'History', hue: 65, trendingOrder: 4 },
      { id: '00000000-0000-4000-8000-000000000002', name: 'Business', hue: 95, trendingOrder: null },
    ],
    books: [
      { id: '00000000-0000-4000-8000-0000000000b1', title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', coverHue: 65 },
    ],
    ideas: [
      {
        id: '00000000-0000-4000-8000-000000000100',
        bookId: '00000000-0000-4000-8000-0000000000b1',
        topicId: '00000000-0000-4000-8000-000000000001',
        title: "Money is everyone's trust",
        explanation: 'It works because everyone expects everyone else to accept it.',
      },
    ],
  });

  assert.equal(
    sql,
    `-- Generated from @mindfeed/content by \`pnpm seed:generate\`. Do not edit by hand.
-- Upserts only content tables, so it is safe to apply repeatedly.

insert into public.topics (id, name, hue, trending_order) values
  ('00000000-0000-4000-8000-000000000001', 'History', 65, 4),
  ('00000000-0000-4000-8000-000000000002', 'Business', 95, null)
on conflict (id) do update set
  name = excluded.name,
  hue = excluded.hue,
  trending_order = excluded.trending_order;

insert into public.books (id, title, author, isbn, cover_hue) values
  ('00000000-0000-4000-8000-0000000000b1', 'Sapiens', 'Yuval Noah Harari', '9780062316097', 65)
on conflict (id) do update set
  title = excluded.title,
  author = excluded.author,
  isbn = excluded.isbn,
  cover_hue = excluded.cover_hue;

insert into public.ideas (id, book_id, topic_id, title, explanation) values
  ('00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', 'Money is everyone''s trust', 'It works because everyone expects everyone else to accept it.')
on conflict (id) do update set
  book_id = excluded.book_id,
  topic_id = excluded.topic_id,
  title = excluded.title,
  explanation = excluded.explanation;
`,
  );
});
