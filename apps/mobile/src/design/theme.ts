import type { TextStyle } from 'react-native';

import { oklch } from './color';

/**
 * The prototype's "butter" palette (`Component.PALETTES.butter` in MindfeedPressedApp.dc.html).
 * Only one palette ships, but every screen reads these names, so another could be swapped in.
 */
const butter = {
  paper: '#f6f2ea',
  card: '#fffdf9',
  ink: '#1f1d1a',
  ink2: '#3a3631',
  mut: '#6b665d',
  line: '#e8e1d4',
  line2: '#d9d0bf',
  track: '#ece5d8',
  hover: '#faf6ee',
  acc: oklch(0.91, 0.035, 80),
  /** Lightness and chroma of the Topic tints. */
  tintLightness: 0.9,
  tintChroma: 0.065,
};

export const palette = butter;

/** Fixed colours the prototype writes inline rather than through the palette. */
export const colors = {
  white: '#ffffff',
  /** Disabled CTAs ("Pick N more") and the dimmed feed "up" arrow. */
  disabled: '#c4bdb0',
  /** Inactive tab bar labels and icons. */
  tabInactive: '#7a756c',
  /** Destructive dialog CTA and validation errors. */
  danger: oklch(0.54, 0.17, 28),
  /** A liked Idea's heart on a feed card and in Liked Ideas. */
  liked: oklch(0.58, 0.18, 25),
  /** An empty Stack's icon. */
  emptyStack: '#efe9dd',
  /** Behind the bottom sheet and dialogs. */
  backdrop: 'rgba(31,29,26,0.32)',
};

/** A Topic's tint: the prototype's `pc(h, d)`. `offset` shifts the lightness (e.g. -0.02 for selected chips). */
export function topicTint(hue: number, offset = 0): string {
  // The prototype rounds the lightness to 3 decimals before building the colour.
  const lightness = Number((palette.tintLightness + offset).toFixed(3));
  return oklch(lightness, palette.tintChroma, hue);
}

/** Bricolage Grotesque, one family per weight (React Native can't pick weights of a custom font). */
const fontFamilies = {
  400: 'BricolageGrotesque_400Regular',
  500: 'BricolageGrotesque_500Medium',
  600: 'BricolageGrotesque_600SemiBold',
  700: 'BricolageGrotesque_700Bold',
  800: 'BricolageGrotesque_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fontFamilies;

/**
 * A text style from the design's CSS values: size in px, weight, and the line height and
 * letter spacing as the multiples of the font size that the CSS uses (`line-height:1.45`,
 * `letter-spacing:-0.04em`).
 */
export function textStyle(size: number, weight: FontWeight, opts: { lineHeight?: number; letterSpacing?: number } = {}): TextStyle {
  return {
    fontFamily: fontFamilies[weight],
    fontSize: size,
    ...(opts.lineHeight !== undefined && { lineHeight: Math.round(size * opts.lineHeight * 100) / 100 }),
    ...(opts.letterSpacing !== undefined && { letterSpacing: size * opts.letterSpacing }),
  };
}

/** The hard ink shadow under raised surfaces, in React Native's CSS-style `boxShadow`. */
export function hardShadow(offset: number, color = palette.ink): string {
  return `${offset}px ${offset}px 0px ${color}`;
}
