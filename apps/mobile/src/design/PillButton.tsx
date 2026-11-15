import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { PressableSurface } from './PressableSurface';
import { colors, palette, type, type FontWeight } from './theme';

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
  /** The prototype's inactive look ("Pick 2 more"): still presses, never acts. */
  disabled?: boolean;
  /** Layout only, e.g. `flex: 1` in a row. */
  style?: StyleProp<ViewStyle>;
};

/** A raised pill button. */
export function PillButton({ label, onPress, tone = 'card', size = 'large', weight, icon, disabled = false, style }: PillButtonProps) {
  const { height, fontSize, weight: sizeWeight } = sizes[size];
  const { backgroundColor, color } = disabledTone(tones[tone], tone, disabled);

  return (
    <PressableSurface
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pill,
        { height, borderRadius: height / 2, backgroundColor },
        size === 'small' && styles.small,
        tone === 'card' && disabled && { borderColor: colors.disabled },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <Icon name={icon} size={size === 'small' ? 20 : 22} color={color} />}
        <Text style={[type(fontSize, weight ?? sizeWeight), { color }]}>{label}</Text>
      </View>
    </PressableSurface>
  );
}

/**
 * The prototype greys out an inactive filled pill (`#c4bdb0` background, white label) and an
 * inactive card pill's border and label. The ink shadow stays either way.
 */
function disabledTone(t: { backgroundColor: string; color: string }, tone: keyof typeof tones, disabled: boolean) {
  if (!disabled) return t;
  if (tone === 'card') return { backgroundColor: t.backgroundColor, color: colors.disabled };
  return { backgroundColor: colors.disabled, color: colors.white };
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', justifyContent: 'center' },
  small: { paddingHorizontal: 16, alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
