import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { palette } from './theme';

/** A tappable list row. It has no press effect: it flashes `hover` while touched and acts immediately. */
export function HighlightRow({
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: ReactNode;
  /** The row's layout (padding, gap, divider). */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center' }, style, pressed && { backgroundColor: palette.hover }]}
    >
      {children}
    </Pressable>
  );
}
