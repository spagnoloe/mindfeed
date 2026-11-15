/**
 * Converts an OKLCH colour to an sRGB hex string, because React Native can't parse `oklch()`.
 * The design writes its accent, Topic tints and reds in OKLCH. Colours outside sRGB are
 * clipped per channel (browsers map them by reducing chroma instead, which only differs
 * for highly saturated colours the design doesn't use).
 */
export function oklch(l: number, c: number, h: number): string {
  const hue = (h * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);

  // OKLab → linear sRGB (Björn Ottosson's reference matrices).
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];

  return '#' + linear.map((x) => toHexByte(gammaEncode(x))).join('');
}

function gammaEncode(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

function toHexByte(x: number): string {
  const byte = Math.round(Math.min(1, Math.max(0, x)) * 255);
  return byte.toString(16).padStart(2, '0');
}
