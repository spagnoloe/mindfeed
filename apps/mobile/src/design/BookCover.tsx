import { Image, View } from 'react-native';

import type { Book } from '@/backend/types';

import { oklch } from './color';

/** The prototype's `cover(h)`: the coloured placeholder behind a cover. */
export const coverPlaceholder = (hue: number) => oklch(0.52, 0.1, hue);

/**
 * Open Library's medium cover for an ISBN. `default=false` makes a missing cover fail rather
 * than return a blank image, so the placeholder shows through.
 */
const coverUrl = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;

/** The sizes the prototype draws a cover at: radius and drop shadow go with each. */
const sizes = {
  /** A feed card's footer. */
  small: { width: 28, height: 42, borderRadius: 3, boxShadow: '0px 1px 3px rgba(0,0,0,0.15)' },
  /** An Idea's Source card. */
  medium: { width: 44, height: 66, borderRadius: 3, boxShadow: '0px 1px 3px rgba(0,0,0,0.15)' },
  /** Explore's row of Books. */
  shelf: { width: 100, height: 150, borderRadius: 5, boxShadow: '0px 2px 6px rgba(0,0,0,0.14)' },
  /** The Book screen's header. */
  large: { width: 86, height: 129, borderRadius: 5, boxShadow: '0px 2px 8px rgba(0,0,0,0.16)' },
};

/** A Book's cover, loaded from Open Library over its coloured placeholder. */
export function BookCover({ book, size }: { book: Pick<Book, 'isbn' | 'coverHue'>; size: keyof typeof sizes }) {
  const { width, height, borderRadius, boxShadow } = sizes[size];

  return (
    <View style={{ width, height, borderRadius, boxShadow, backgroundColor: coverPlaceholder(book.coverHue) }}>
      <Image
        source={{ uri: coverUrl(book.isbn) }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={{ width, height, borderRadius }}
      />
    </View>
  );
}
