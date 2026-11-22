import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import type { Tables } from './database.types';
import { supabase } from './supabase';

export type Profile = Tables<'profiles'>;

type SessionState = {
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  /** True only while the app is starting up (session + initial profile). */
  loading: boolean;
  isAgency: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // The user id found when the app launched (undefined until the first check finishes).
  const [bootUserId, setBootUserId] = useState<string | null | undefined>(undefined);
  // The profile, and the user id it was loaded for (so a stale profile is never used).
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; error: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBootUserId(data.session?.user.id ?? null);
    });
    // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    setLoaded({ userId: id, profile: data ?? null, error: error ? error.message : null });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (cancelled) return;
      if (!error && !data) {
        // No profile for this sign-in. If the server no longer knows the account (deleted, or
        // a local database reset), the saved sign-in is stale: clear it and show sign-in.
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (userError || !user.user) {
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
      }
      setLoaded({
        userId,
        profile: data ?? null,
        error: error ? error.message : data ? null : 'Your account profile is missing. Please sign out and sign in again.',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = userId && loaded?.userId === userId ? loaded : null;
  const profile = current?.profile ?? null;
  const profileError = current?.error ?? null;
  const profileLoading = !!userId && !current;

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [loadProfile, userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: SessionState = {
    session,
    profile,
    profileError,
    // Only true during app launch. Later profile loads (e.g. right after sign-in) keep the
    // navigator mounted; the route guards simply wait for the profile.
    loading: bootUserId === undefined || (bootUserId !== null && profileLoading && loaded?.userId !== bootUserId),
    // Developers have full agency access (and the web portal's developer console).
    isAgency: profile?.role === 'admin' || profile?.role === 'coordinator' || profile?.role === 'developer',
    refreshProfile,
    signOut,
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}
