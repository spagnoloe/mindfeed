import { oklch } from './color';

// Reference values from the CSS Color 4 spec and its sample conversions.
test.each([
  [1, 0, 0, '#ffffff'],
  [0, 0, 0, '#000000'],
  [0.5, 0, 0, '#636363'],
  [0.62796, 0.25768, 29.2339, '#ff0000'],
  [0.86644, 0.29483, 142.4953, '#00ff00'],
  [0.45201, 0.31321, 264.052, '#0000ff'],
])('oklch(%p %p %p) is %s', (l, c, h, hex) => {
  expect(oklch(l, c, h)).toBe(hex);
});

test('colours outside sRGB are clipped into range', () => {
  expect(oklch(0.7, 0.4, 145)).toMatch(/^#[0-9a-f]{6}$/);
});
