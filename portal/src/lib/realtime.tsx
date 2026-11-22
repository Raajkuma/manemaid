import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from './supabase';

/** Tables whose changes should refresh what is on screen (same feed the app listens to). */
const TABLES = [
  'bookings',
  'quotations',
  'assignments',
  'notifications',
  'support_tickets',
  'ticket_messages',
  'offers',
  'greetings',
  'greeting_deliveries',
  'staff',
  'scope_templates',
  'agency_settings',
  'app_config',
] as const;

/**
 * Keeps the portal live: any change made in the app (or another browser) refreshes the
 * open pages within a moment, so the portal and the app always show the same data.
 */
export function RealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void qc.invalidateQueries(), 250);
    };
    const channel = supabase.channel(`portal-live:${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [qc]);
  return null;
}
