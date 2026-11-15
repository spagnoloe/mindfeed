import { StyleSheet, Text } from 'react-native';

import { PressableSurface } from './PressableSurface';
import { colors, palette, topicTint, type } from './theme';

/**
 * A Topic chip for picking Interests (onboarding, Topics of interest). It stays pressed in and
 * tinted with its Topic's colour while selected.
 */
export function TopicChip({ name, hue, selected, onToggle }: { name: string; hue: number; selected: boolean; onToggle: () => void }) {
  return (
    <PressableSurface
      selected={selected}
      onPress={onToggle}
      style={[styles.chip, { backgroundColor: selected ? topicTint(hue, -0.02) : colors.white }]}
    >
      <Text style={styles.label}>{name}</Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  chip: { height: 46, paddingHorizontal: 20, borderRadius: 23, justifyContent: 'center' },
  label: { ...type(16, 600), color: palette.ink },
});
