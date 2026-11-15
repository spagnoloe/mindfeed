import { renderRouter } from 'expo-router/testing-library';
import type { ComponentType } from 'react';

/** Renders the real app with its real routes, plus any test-only routes in `overrides`. */
export function renderApp(overrides: Record<string, ComponentType> = {}) {
  return renderRouter({ appDir: './src/app', overrides });
}
