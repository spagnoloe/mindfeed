import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkContent } from './checkContent.ts';
import type { Content, Idea } from './types.ts';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

/** A small, valid Content to break one rule at a time. */
function validContent(): Content {
  const topics = [
    { id: '00000000-0000-4000-8000-000000000001', name: 'History', hue: 65, trendingOrder: 1 },
    { id: '00000000-0000-4000-8000-000000000002', name: 'Psychology', hue: 30, trendingOrder: null },
  ];
  const books = [
    { id: '00000000-0000-4000-8000-0000000000b1', title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', coverHue: 65 },
  ];
  const ideas: Idea[] = Array.from({ length: 8 }, (_, n) => ({
    id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`,
    bookId: books[0].id,
    topicId: topics[n % 2].id,
    title: `Idea ${n}`,
    explanation: words(40),
  }));
  return { topics, books, ideas };
}

test('valid content has no problems', () => {
  assert.deepEqual(checkContent(validContent()), []);
});

test('reports an Idea whose Book does not exist', () => {
  const content = validContent();
  const ideas = content.ideas.map((i, n) => (n === 0 ? { ...i, bookId: '00000000-0000-4000-8000-00000000dead' } : i));
  assert.deepEqual(checkContent({ ...content, ideas }), [
    'Idea "Idea 0" points at missing Book 00000000-0000-4000-8000-00000000dead',
    'Book "Sapiens" has 7 Ideas; needs 8–20',
  ]);
});

test('reports an Idea whose Topic does not exist', () => {
  const content = validContent();
  const ideas = content.ideas.map((i, n) => (n === 0 ? { ...i, topicId: '00000000-0000-4000-8000-00000000beef' } : i));
  assert.deepEqual(checkContent({ ...content, ideas }), [
    'Idea "Idea 0" points at missing Topic 00000000-0000-4000-8000-00000000beef',
  ]);
});

test('reports a Topic with fewer than 3 Ideas', () => {
  const content = validContent();
  const leadership = { id: '00000000-0000-4000-8000-000000000003', name: 'Leadership', hue: 200, trendingOrder: null };
  const ideas = content.ideas.map((i, n) => (n < 2 ? { ...i, topicId: leadership.id } : i));
  assert.deepEqual(checkContent({ ...content, topics: [...content.topics, leadership], ideas }), [
    'Topic "Leadership" has 2 Ideas; needs at least 3',
  ]);
});

test('reports a Book with more than 20 Ideas', () => {
  const content = validContent();
  const extra = Array.from({ length: 13 }, (_, n) => ({
    ...content.ideas[0],
    id: `00000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`,
    title: `Extra ${n}`,
  }));
  assert.deepEqual(checkContent({ ...content, ideas: [...content.ideas, ...extra] }), [
    'Book "Sapiens" has 21 Ideas; needs 8–20',
  ]);
});

test('reports a UUID used twice, across Topics, Books and Ideas', () => {
  const content = validContent();
  const ideas = content.ideas.map((i, n) => (n === 1 ? { ...i, id: content.books[0].id } : i));
  assert.deepEqual(checkContent({ ...content, ideas }), [
    'UUID 00000000-0000-4000-8000-0000000000b1 is used more than once',
  ]);
});

test('reports an id that is not a UUID', () => {
  const content = validContent();
  const ideas = content.ideas.map((i, n) => (n === 0 ? { ...i, id: 'i1' } : i));
  assert.deepEqual(checkContent({ ...content, ideas }), ['"i1" is not a UUID']);
});

test('reports explanations shorter than 25 or longer than 80 words', () => {
  const content = validContent();
  const lengths: Record<number, number> = { 0: 24, 1: 25, 2: 80, 3: 81 };
  const ideas = content.ideas.map((i, n) => (n in lengths ? { ...i, explanation: words(lengths[n]) } : i));
  assert.deepEqual(checkContent({ ...content, ideas }), [
    'Idea "Idea 0" has 24 words; needs 25–80',
    'Idea "Idea 3" has 81 words; needs 25–80',
  ]);
});
