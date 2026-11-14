import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSupabaseBackend } from './supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy apps/mobile/.env.example to apps/mobile/.env.',
  );
}

/** The app's one Backend. Tests replace this module with the fake. */
export const backend = createSupabaseBackend({ url, anonKey, storage: AsyncStorage });
