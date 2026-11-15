import { Stack } from 'expo-router';

import { palette } from '@/design/theme';

/** The stack inside one tab, which gives each tab its own history. */
export function TabStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />;
}
