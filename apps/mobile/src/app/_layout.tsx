import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { BackendProvider } from '@/backend/BackendProvider';
import { backend } from '@/backend/instance';
import { useInterests, useSession } from '@/backend/session';
import { MIN_INTERESTS } from '@/backend/types';
import { palette } from '@/design/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  // The splash screen stays up until the fonts are in, so text never renders in a fallback font.
  if (!fontsReady) return null;

  return (
    <BackendProvider backend={backend}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AppRoutes />
      </QueryClientProvider>
    </BackendProvider>
  );
}

/**
 * Where the user may be: signed out → Sign up / Log in; signed in with fewer than 3
 * Interests → onboarding; otherwise the tabs. A screen whose guard turns false redirects
 * to the first one still allowed.
 */
function AppRoutes() {
  const session = useSession();
  const userId = session.data?.userId;
  const interests = useInterests(userId);

  // A user's Interests load only on launch and right after logging in or signing up, so
  // until they arrive the user stays where they are: under the splash screen, or on
  // Sign up / Log in. The navigator stays mounted throughout, as expo-router needs.
  const loading = session.isPending || (userId !== undefined && interests.isPending);
  const signedIn = !loading && userId !== undefined;
  const onboarded = signedIn && (interests.data?.length ?? 0) >= MIN_INTERESTS;

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
