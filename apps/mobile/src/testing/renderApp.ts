import { act } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ComponentType } from 'react';

import { PRESS_DELAY_MS } from '@/design/PressableSurface';

/**
 * Renders the real app with its real routes, plus any test-only routes in `overrides`.
 *
 * Two things to know in tests that use it:
 * - `renderRouter` turns on Jest's fake timers, so a real `setTimeout` never fires. Advance them
 *   instead (`jest.advanceTimersByTimeAsync`).
 * - A raised surface acts only after its press has shown for {@link PRESS_DELAY_MS}. Wait for the
 *   result with a `findBy…` query, or call {@link settlePress} before checking that a press did
 *   nothing.
 */
export function renderApp(overrides: Record<string, ComponentType> = {}) {
  return renderRouter({ appDir: './src/app', overrides });
}

/** Lets any press in progress finish showing, so its action would have run. */
export function settlePress() {
  return act(() => jest.advanceTimersByTimeAsync(PRESS_DELAY_MS * 2));
}
