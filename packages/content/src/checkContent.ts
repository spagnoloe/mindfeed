import type { Content } from './types.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The content rules from the seed-content ticket. Returns one message per broken rule; empty means valid. */
export function checkContent({ topics, books, ideas }: Content): string[] {
  const problems: string[] = [];
  const bookIds = new Set(books.map((b) => b.id));
  const topicIds = new Set(topics.map((t) => t.id));

  const seen = new Set<string>();
  for (const { id } of [...topics, ...books, ...ideas]) {
    if (!UUID.test(id)) problems.push(`"${id}" is not a UUID`);
    else if (seen.has(id)) problems.push(`UUID ${id} is used more than once`);
    seen.add(id);
  }

  for (const idea of ideas) {
    if (!bookIds.has(idea.bookId)) problems.push(`Idea "${idea.title}" points at missing Book ${idea.bookId}`);
    if (!topicIds.has(idea.topicId)) problems.push(`Idea "${idea.title}" points at missing Topic ${idea.topicId}`);
    const wordCount = idea.explanation.split(/\s+/).filter(Boolean).length;
    if (wordCount < 25 || wordCount > 80) problems.push(`Idea "${idea.title}" has ${wordCount} words; needs 25–80`);
  }

  for (const topic of topics) {
    const count = ideas.filter((i) => i.topicId === topic.id).length;
    if (count < 3) problems.push(`Topic "${topic.name}" has ${count} Ideas; needs at least 3`);
  }

  for (const book of books) {
    const count = ideas.filter((i) => i.bookId === book.id).length;
    if (count < 8 || count > 20) problems.push(`Book "${book.title}" has ${count} Ideas; needs 8–20`);
  }

  return problems;
}
