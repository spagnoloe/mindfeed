import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { hardShadow, palette } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** How long the pressed look shows before the action fires (the prototype's `setTimeout(…, 150)`). */
export const PRESS_DELAY_MS = 150;
/** The prototype's `transition: box-shadow .12s ease, transform .12s ease`. */
const TRANSITION_MS = 120;
/** The usual depth of a raised surface: its shadow's offset, and how far a press moves it. */
const DEFAULT_DEPTH = 2;

export type PressableSurfaceProps = {
  onPress: () => void;
  children: ReactNode;
  /** Toggle mode (topic chips): stays pressed in while `true`. The caller tints the background. */
  selected?: boolean;
  /** Layout, size, radius and background. The border and the shadow come from here. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** The shadow's offset, which a press moves the surface across: 2, or 4 for a feed card (the prototype's `data-press="4"`). */
  depth?: number;
};

/**
 * The design's raised surface: a 1.5px ink border on a hard ink shadow, 2px unless `depth` says otherwise. A press moves it
 * flat onto its shadow, holds that for {@link PRESS_DELAY_MS}, and only then acts, however quick
 * the tap. Taps while a press is showing are ignored.
 */
export function PressableSurface({ onPress, children, selected, style, accessibilityLabel, depth = DEFAULT_DEPTH }: PressableSurfaceProps) {
  const isToggle = selected !== undefined;
  const [touching, setTouching] = useState(false);
  const [acting, setActing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handlePress() {
    if (timer.current) return;
    setActing(true);
    if (isToggle) void Haptics.selectionAsync();
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    timer.current = setTimeout(() => {
      timer.current = null;
      setActing(false);
      onPress();
    }, PRESS_DELAY_MS);
  }

  const pressed = touching || acting || selected === true;
  const offset = pressed ? depth : 0;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={isToggle ? { selected } : undefined}
      onPressIn={() => setTouching(true)}
      onPressOut={() => setTouching(false)}
      onPress={handlePress}
      style={[
        { borderWidth: 1.5, borderColor: palette.ink },
        style,
        {
          // A shadow at offset 0 instead of `none`, so the transition can move it like CSS does.
          boxShadow: hardShadow(depth - offset),
          transform: [{ translateX: offset }, { translateY: offset }],
          transitionProperty: ['boxShadow', 'transform', 'backgroundColor'],
          transitionDuration: TRANSITION_MS,
          transitionTimingFunction: 'ease',
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
