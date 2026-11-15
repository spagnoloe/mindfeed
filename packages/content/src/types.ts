/** An oklch hue angle, 0–359, as used by the design's tints and cover fallbacks. */
export type Hue = number;

export type Topic = {
  id: string;
  name: string;
  hue: Hue;
  /** Position among the Trending topics (1 first), or null when not trending. */
  trendingOrder: number | null;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  /** ISBN-13 used to fetch the cover from Open Library. */
  isbn: string;
  /** Background hue shown when the cover image is missing. */
  coverHue: Hue;
};

export type Idea = {
  id: string;
  bookId: string;
  topicId: string;
  title: string;
  /** Original paraphrase, never quoted text; 25–80 words. */
  explanation: string;
};

export type Content = {
  topics: readonly Topic[];
  books: readonly Book[];
  ideas: readonly Idea[];
};
