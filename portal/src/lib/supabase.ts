import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.');
}

/** Same backend and API as the mobile app. Only the public (publishable) key is ever used here. */
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'manemaid-portal-auth' },
});

export const DASHBOARD_URL = (import.meta.env.VITE_SUPABASE_DASHBOARD_URL as string | undefined) ?? null;

/**
 * Throw Supabase errors so React Query shows them; return the data otherwise.
 * (List queries never return null data without an error; single-row lookups that may be
 * empty use maybeSingle() and the caller types the result as `X | null`.)
 */
export function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Role = Database['public']['Enums']['user_role'];
