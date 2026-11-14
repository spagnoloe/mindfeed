import type { Content } from './types.ts';

type Value = string | number | null;

function literal(value: Value): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

/** `insert … on conflict (id) do update` for every row, so re-applying updates rows in place by UUID. */
function upsert(table: string, columns: string[], rows: Value[][]): string {
  const values = rows.map((row) => `  (${row.map(literal).join(', ')})`).join(',\n');
  const updates = columns
    .filter((c) => c !== 'id')
    .map((c) => `  ${c} = excluded.${c}`)
    .join(',\n');
  return `insert into public.${table} (${columns.join(', ')}) values\n${values}\non conflict (id) do update set\n${updates};\n`;
}

/** The Supabase seed SQL for the content tables. Never touches user tables. */
export function seedSql({ topics, books, ideas }: Content): string {
  const header =
    '-- Generated from @mindfeed/content by `pnpm seed:generate`. Do not edit by hand.\n' +
    '-- Upserts only content tables, so it is safe to apply repeatedly.\n';
  return [
    header,
    upsert(
      'topics',
      ['id', 'name', 'hue', 'trending_order'],
      topics.map((t) => [t.id, t.name, t.hue, t.trendingOrder]),
    ),
    upsert(
      'books',
      ['id', 'title', 'author', 'isbn', 'cover_hue'],
      books.map((b) => [b.id, b.title, b.author, b.isbn, b.coverHue]),
    ),
    upsert(
      'ideas',
      ['id', 'book_id', 'topic_id', 'title', 'explanation'],
      ideas.map((i) => [i.id, i.bookId, i.topicId, i.title, i.explanation]),
    ),
  ].join('\n');
}
