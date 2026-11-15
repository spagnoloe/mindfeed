import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from './Icon';
import { colors, palette } from './theme';

/**
 * A round, bordered icon button (back, the Home feed's up/down, Like and Add to stack on a feed Idea, Stack edit/delete).
 * It has no press effect: it flashes `acc` while touched and acts immediately. A disabled one
 * (the feed's "up" on the first card) greys its icon and does nothing.
 */
export function RoundIconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 44,
  iconSize = 22,
  color = palette.ink,
  filled = false,
  disabled = false,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  /** 44 everywhere except the Home header's feed arrows (38). */
  size?: number;
  iconSize?: number;
  color?: string;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled ? { disabled } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: pressed ? palette.acc : palette.card },
      ]}
    >
      <Icon name={icon} size={iconSize} color={disabled ? colors.disabled : color} filled={filled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1.5, borderColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
});
