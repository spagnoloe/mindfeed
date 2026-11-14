import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { BackendProvider } from '@/backend/BackendProvider';
import { backend } from '@/backend/instance';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <BackendProvider backend={backend}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </BackendProvider>
  );
}
