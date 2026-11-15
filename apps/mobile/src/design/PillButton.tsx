import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { PressableSurface } from './PressableSurface';
import { colors, palette, textStyle, type FontWeight } from './theme';

/** Background and label colour of each pill in the prototype. */
const tones = {
  /** Auth CTA, Log out. */
  accent: { backgroundColor: palette.acc, color: palette.ink },
  /** Onboarding and Interests CTAs. */
  ink: { backgroundColor: palette.ink, color: colors.white },
  /** Cancel, Done, Save, New stack, Add to stack. */
  card: { backgroundColor: palette.card, color: palette.ink },
  /** The confirming button of a dialog. */
  danger: { backgroundColor: colors.danger, color: colors.white },
};

/** Height, label size and default weight of each pill size in the prototype. */
const sizes = {
  /** Full-width CTAs at the bottom of a screen ("Create account", "Continue"). */
  large: { height: 56, fontSize: 17, weight: 700 },
  /** "Log out". */
  medium: { height: 52, fontSize: 16, weight: 700 },
  /** Dialog buttons. */
  dialog: { height: 48, fontSize: 15, weight: 600 },
  /** Header buttons ("Cancel", "Save", "Done"), sized to their label. */
  small: { height: 40, fontSize: 15, weight: 600 },
} satisfies Record<string, { height: number; fontSize: number; weight: FontWeight }>;

export type PillButtonProps = {
  label: string;
  onPress: () => void;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  /** Overrides the size's label weight, where the prototype differs (e.g. a dialog's confirm is 700). */
  weight?: FontWeight;
  icon?: IconName;
  /**
   * The prototype's greyed-out look ("Pick 2 more", an empty stack form's Create). Only a look:
   * the pill still presses and calls `onPress`, and the caller decides what that does, as the
   * prototype does (nothing for "Pick 2 more", a validation error for Create).
   */
  dimmed?: boolean;
  /** Layout only, e.g. `flex: 1` in a row. */
  style?: StyleProp<ViewStyle>;
};

/** A raised pill button. */
export function PillButton({ label, onPress, tone = 'card', size = 'large', weight, icon, dimmed = false, style }: PillButtonProps) {
  const { height, fontSize, weight: sizeWeight } = sizes[size];
  const { backgroundColor, color, borderColor } = dimmed ? dimmedLook(tone) : { ...tones[tone], borderColor: palette.ink };

  return (
    <PressableSurface
      onPress={onPress}
      style={[
        styles.pill,
        { height, borderRadius: height / 2, backgroundColor, borderColor },
        size === 'small' && styles.small,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <Icon name={icon} size={size === 'small' ? 20 : 22} color={color} />}
        <Text style={[textStyle(fontSize, weight ?? sizeWeight), { color }]}>{label}</Text>
      </View>
    </PressableSurface>
  );
}

/**
 * The prototype greys out an inactive filled pill (`#c4bdb0` background, white label) and an
 * inactive card pill's border and label. The ink shadow stays either way.
 */
function dimmedLook(tone: keyof typeof tones) {
  if (tone === 'card') return { backgroundColor: palette.card, color: colors.disabled, borderColor: colors.disabled };
  return { backgroundColor: colors.disabled, color: colors.white, borderColor: palette.ink };
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', justifyContent: 'center' },
  small: { paddingHorizontal: 16, alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
