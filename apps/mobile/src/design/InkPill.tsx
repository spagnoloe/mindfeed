import { StyleSheet, Text, View } from 'react-native';

import { colors, palette, textStyle } from './theme';

/**
 * A small uppercase label on an ink pill: a feed card's Topic (`card`), or the eyebrow over a
 * Topic, Book or Stack screen's title (`eyebrow`).
 */
export function InkPill({ label, variant }: { label: string; variant: 'card' | 'eyebrow' }) {
  return (
    <View style={[styles.pill, variant === 'card' ? styles.card : styles.eyebrow]}>
      <Text style={variant === 'card' ? styles.cardLabel : styles.eyebrowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', backgroundColor: palette.ink, borderRadius: 999 },
  card: { paddingVertical: 6, paddingHorizontal: 12 },
  eyebrow: { paddingVertical: 4, paddingHorizontal: 10 },
  // The prototype leaves these at `line-height: normal`, about 1.23× in the browser.
  cardLabel: { ...textStyle(12, 600, { letterSpacing: 0.05 }), lineHeight: 15, textTransform: 'uppercase', color: colors.white },
  eyebrowLabel: { ...textStyle(11, 600, { letterSpacing: 0.07 }), lineHeight: 14, textTransform: 'uppercase', color: colors.white },
});
