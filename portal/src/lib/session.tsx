import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { supabase, type Role, type Tables } from './supabase';

export type Profile = Tables<'profiles'>;

type SessionState = {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  /** Agency staff (admin, coordinator) and developers may use the portal. */
  isStaff: boolean;
  isDeveloper: boolean;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function useSession() {
  const v = use(Ctx);
  if (!v) throw new Error('useSession must be used inside <SessionProvider>');
  return v;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [booted, setBooted] = useState(false);
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; error: string | null } | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooted(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const load = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (!error && !data) {
      // Same rule as the app: a saved sign-in for an account that no longer exists is stale.
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !u.user) {
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
    }
    setLoaded({ userId: id, profile: data ?? null, error: error ? error.message : data ? null : 'Your account profile is missing.' });
  }, []);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  const current = userId && loaded?.userId === userId ? loaded : null;
  const profile = current?.profile ?? null;
  const role = profile?.role ?? null;

  const value: SessionState = {
    session,
    profile,
    role,
    isStaff: role === 'admin' || role === 'coordinator' || role === 'developer',
    isDeveloper: role === 'developer',
    loading: !booted || (!!userId && !current),
    error: current?.error ?? null,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    reload: async () => {
      if (userId) await load(userId);
    },
  };
  return <Ctx value={value}>{children}</Ctx>;
}
