import { Text, type TextProps } from 'react-native';

import { palette, textStyle } from './theme';

/** A tab's big lowercase title ("explore.", "library.", "profile."). */
export function ScreenTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={[textStyle(38, 700, { lineHeight: 1, letterSpacing: -0.04 }), { color: palette.ink, paddingTop: 8 }]}>
      {children}
    </Text>
  );
}

/** A heading inside a screen ("Trending topics", "Books", "Change password"). */
export function SectionHeading({ children, style }: { children: string; style?: TextProps['style'] }) {
  return (
    // lineHeight 22: the design's `line-height: normal` for 18px, as the browser renders it.
    <Text accessibilityRole="header" style={[textStyle(18, 700, { letterSpacing: -0.02 }), { lineHeight: 22, color: palette.ink }, style]}>
      {children}
    </Text>
  );
}
