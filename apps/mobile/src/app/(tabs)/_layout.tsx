import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/design/Icon';
import { TabBar } from '@/design/TabBar';
import { palette } from '@/design/theme';

const TAB_ICONS: Record<string, IconName> = {
  '(home)': 'home',
  explore: 'explore',
  library: 'collections_bookmark',
  profile: 'person',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} icons={TAB_ICONS} />}
      // Android back from a tab's first screen returns to the previously visited tab.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        // The real status bar replaces the prototype's drawn one, so screens start below it.
        sceneStyle: { backgroundColor: palette.paper, paddingTop: insets.top },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
