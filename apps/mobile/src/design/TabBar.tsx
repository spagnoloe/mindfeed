import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { colors, hardShadow, palette, textStyle } from './theme';

/** Space below the pill when the system leaves none. The prototype's bar is 4px + a 58px pill + 22px. */
const MIN_BOTTOM_SPACE = 22;

/**
 * The floating pill tab bar. A tab's label is its screen `title`; its icon comes from `icons`,
 * keyed by route name. The active tab is filled and on `acc`.
 *
 * Pressing a tab emits `tabPress` like the stock tab bar does, so a tab's stack returns to its
 * first screen when its already-active tab is pressed again.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets, icons }: BottomTabBarProps & { icons: Record<string, IconName> }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(MIN_BOTTOM_SPACE, insets.bottom) }]}>
      <View style={styles.pill} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const label = descriptors[route.key].options.title ?? route.name;
          const color = focused ? palette.ink : colors.tabInactive;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={[styles.tab, focused && styles.focused]}
            >
              <Icon name={icons[route.name]} size={22} color={color} filled={focused} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: palette.paper, paddingTop: 4, paddingHorizontal: 16 },
  pill: {
    height: 58,
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.ink,
    borderRadius: 29,
    boxShadow: hardShadow(3),
  },
  tab: { flex: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center', gap: 1 },
  focused: { backgroundColor: palette.acc },
  label: textStyle(11, 600),
});
