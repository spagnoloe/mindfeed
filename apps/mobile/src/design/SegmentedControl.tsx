import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, palette, type } from './theme';

/** Two or more segments on a track ("Sign up / Log in", "Liked ideas / Stacks"). The selected one is ink. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text style={[styles.label, { color: selected ? colors.white : palette.ink }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 22, backgroundColor: palette.track },
  segment: { flex: 1, height: 40, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: palette.ink },
  label: type(15, 600),
});
