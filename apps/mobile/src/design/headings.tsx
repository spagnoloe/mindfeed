import { Text, type TextProps } from 'react-native';

import { palette, type } from './theme';

/** A tab's big lowercase title ("explore.", "library.", "profile."). */
export function ScreenTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={[type(38, 700, { lineHeight: 1, letterSpacing: -0.04 }), { color: palette.ink, paddingTop: 8 }]}>
      {children}
    </Text>
  );
}

/** A heading inside a screen ("Trending topics", "Books", "Change password"). */
export function SectionHeading({ children, style }: { children: string; style?: TextProps['style'] }) {
  return (
    <Text accessibilityRole="header" style={[type(18, 700, { letterSpacing: -0.02 }), { color: palette.ink }, style]}>
      {children}
    </Text>
  );
}
