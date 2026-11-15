import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { hardShadow, palette, textStyle } from './theme';

/** A borderless icon button at the end of a row (the filled heart that unlikes a Liked Idea). */
export type IdeaRowAction = {
  icon: IconName;
  accessibilityLabel: string;
  color: string;
  filled?: boolean;
  onPress: () => void;
};

/**
 * A row of a Topic, Book or Stack screen or of Liked Ideas: an Idea's title over a muted line, and
 * optionally an icon button at the end. It has no press effect; while touched it shows the
 * prototype's hover look (ink border and shadow) and it acts immediately. So does its button,
 * which shows the `track` colour behind its icon while touched.
 */
export function IdeaRow({
  title,
  subtitle,
  onPress,
  action,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  action?: IdeaRowAction;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Icon name={action.icon} size={22} color={action.color} filled={action.filled} />
        </Pressable>
      )}
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
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionPressed: { backgroundColor: palette.track },
});
