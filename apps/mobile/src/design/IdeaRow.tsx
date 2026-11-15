import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hardShadow, palette, textStyle } from './theme';

/**
 * A row of a Topic, Book or Stack screen: an Idea's title over a muted line. It has no press
 * effect; while touched it shows the prototype's hover look (ink border and shadow) and it acts
 * immediately.
 */
export function IdeaRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 8,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.line,
    borderRadius: 18,
  },
  pressed: { borderColor: palette.ink, boxShadow: hardShadow(2) },
  text: { flex: 1, minWidth: 0, gap: 3 },
  title: { ...textStyle(16, 600, { lineHeight: 1.25, letterSpacing: -0.01 }), color: palette.ink },
  subtitle: { ...textStyle(13, 400), lineHeight: 16, color: palette.mut },
});
