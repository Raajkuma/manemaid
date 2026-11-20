import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from './format';
import { supabase } from './supabase';

type LiveTable = 'bookings' | 'notifications' | 'support_tickets' | 'ticket_messages';

/**
 * Load data when the screen gains focus, and reload whenever one of the
 * given tables changes (Supabase Realtime, filtered by RLS).
 */
export function useLiveQuery<T>(
  fetcher: () => Promise<T>,
  options: { key: string; tables?: LiveTable[] },
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async (mode: 'silent' | 'pull' = 'silent') => {
    if (mode === 'pull') setRefreshing(true);
    try {
      setData(await fetcherRef.current());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const { key } = options;
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tablesKey = (options.tables ?? []).join(',');
  useEffect(() => {
    if (!tablesKey) return;
    const channel = supabase.channel(`live:${key}:${Math.random().toString(36).slice(2)}`);
    for (const table of tablesKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void load());
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [key, tablesKey, load]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => load('silent'),
    refresh: () => load('pull'),
  };
}

/** Unread inbox count for the tab badge. */
export function useUnreadCount(userId: string | undefined) {
  const { data } = useLiveQuery(
    async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    { key: `unread:${userId}`, tables: ['notifications'] },
  );
  return data ?? 0;
}
