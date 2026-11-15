import Svg, { Path } from 'react-native-svg';

import { iconPaths } from './icons.generated';
import { palette } from './theme';

export type IconName = keyof typeof iconPaths;

/** A Material Symbols Rounded icon. `filled` is the design's `'FILL' 1`. */
export function Icon({
  name,
  size = 22,
  color = palette.ink,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960" accessible={false} pointerEvents="none">
      <Path d={iconPaths[name][filled ? 'filled' : 'outlined']} fill={color} />
    </Svg>
  );
}
