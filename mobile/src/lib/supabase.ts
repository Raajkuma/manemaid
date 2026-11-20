// Session storage: expo-sqlite's localStorage polyfill (works in Expo Go on iOS and Android).
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';
import { createDemoClient, type DemoClient } from './demo/client';
import { DEMO_AGENCY_PHONE, DEMO_CUSTOMER_PHONE } from './demo/store';

/**
 * Offline demo build: EXPO_PUBLIC_DEMO_MODE=1 swaps the Supabase backend for a small
 * database stored on the phone (src/lib/demo). No server, no SMS, no real payments.
 * The value is baked in when the app is bundled.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

function createRealClient(): SupabaseClient<Database> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
        'Copy mobile/.env.example to mobile/.env.local and fill it in, then restart Expo.',
    );
  }
  return createClient<Database>(url, publishableKey, {
    auth: {
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

const demoClient: DemoClient | null = DEMO_MODE ? createDemoClient(globalThis.localStorage) : null;

export const supabase: SupabaseClient<Database> = demoClient
  ? (demoClient as unknown as SupabaseClient<Database>)
  : createRealClient();

// Only refresh tokens while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Demo only: sign straight in as the sample customer or the agency. */
export async function demoSignIn(as: 'customer' | 'agency') {
  const phone = `+${as === 'agency' ? DEMO_AGENCY_PHONE : DEMO_CUSTOMER_PHONE}`;
  return supabase.auth.verifyOtp({ phone, token: '123456', type: 'sms' });
}

/** Demo only: wipe all demo data back to the samples and sign out. */
export function resetDemoData() {
  demoClient?.resetDemo();
}

/** Throw a readable Error for a failed Supabase call, otherwise return data. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data == null) throw new Error('Not found');
  return result.data as NonNullable<T>;
}
