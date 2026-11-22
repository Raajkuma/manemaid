/**
 * Live app configuration (public.app_config), edited by developers in the web portal.
 * Loaded at start, kept current with realtime, and cached on the phone so the app keeps
 * working offline. Signed-out users get the public subset (maintenance / force update).
 * Every value has a built-in default, so a missing key never breaks the app.
 */
import Constants from 'expo-constants';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import type { Json } from './database.types';
import { supabase } from './supabase';

export type WhyCard = { title: string; body: string };

export type AppConfig = {
  offersEnabled: boolean;
  upiPayments: boolean;
  supportTickets: boolean;
  homeTagline: string;
  whyManeMaid: WhyCard[];
  minVersion: string;
  updateMessage: string;
  maintenance: { enabled: boolean; message: string };
};

export const DEFAULT_CONFIG: AppConfig = {
  offersEnabled: true,
  upiPayments: true,
  supportTickets: true,
  homeTagline: 'What help do you need at home today?',
  whyManeMaid: [
    { title: 'Verified by the agency', body: 'Background-checked staff with verified records.' },
    { title: 'You approve every worker', body: 'Nothing is final until you say yes.' },
    { title: 'Priority support', body: 'Raise a request any time. Paying customers get replies within 4 hours.' },
  ],
  minVersion: '0.0.0',
  updateMessage: 'A new version of ManeMaid is available. Please update to continue.',
  maintenance: { enabled: false, message: 'ManeMaid is being upgraded. Please try again in a little while.' },
};

const CACHE_KEY = 'manemaid.config.v1';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const bool = (v: Json | undefined, d: boolean) => (typeof v === 'boolean' ? v : d);
const str = (v: Json | undefined, d: string) => (typeof v === 'string' && v.trim() ? v : d);

export function parseConfig(rows: { key: string; value: Json }[]): AppConfig {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const why = m.get('content.why_manemaid');
  const maint = m.get('app.maintenance') as { enabled?: unknown; message?: unknown } | undefined;
  return {
    offersEnabled: bool(m.get('features.offers_enabled'), DEFAULT_CONFIG.offersEnabled),
    upiPayments: bool(m.get('features.upi_payments'), DEFAULT_CONFIG.upiPayments),
    supportTickets: bool(m.get('features.support_tickets'), DEFAULT_CONFIG.supportTickets),
    homeTagline: str(m.get('content.home_tagline'), DEFAULT_CONFIG.homeTagline),
    whyManeMaid:
      Array.isArray(why) && why.every((c) => c && typeof c === 'object' && 'title' in c && 'body' in c)
        ? (why as WhyCard[])
        : DEFAULT_CONFIG.whyManeMaid,
    minVersion: str(m.get('app.min_version'), DEFAULT_CONFIG.minVersion),
    updateMessage: str(m.get('app.update_message'), DEFAULT_CONFIG.updateMessage),
    maintenance:
      maint && typeof maint === 'object'
        ? { enabled: maint.enabled === true, message: typeof maint.message === 'string' && maint.message ? maint.message : DEFAULT_CONFIG.maintenance.message }
        : DEFAULT_CONFIG.maintenance,
  };
}

/** "1.2.10" < "1.10.0" — numeric, part by part. */
export function isOlder(version: string, than: string): boolean {
  const a = version.split('.').map((n) => parseInt(n, 10) || 0);
  const b = than.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

function readCache(): AppConfig | null {
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AppConfig>) } : null;
  } catch {
    return null;
  }
}

const ConfigCtx = createContext<AppConfig>(DEFAULT_CONFIG);
export const useAppConfig = () => use(ConfigCtx);

/** Fetch config rows (all when signed in, the public subset otherwise). Null on failure. */
async function fetchConfig(signedIn: boolean): Promise<AppConfig | null> {
  const res = signedIn ? await supabase.from('app_config').select('key, value') : await supabase.rpc('get_public_config');
  if (res.error || !res.data) return null; // keep the cached / default values
  return parseConfig(res.data as { key: string; value: Json }[]);
}

export function ConfigProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => readCache() ?? DEFAULT_CONFIG);

  const apply = useCallback(
    (next: AppConfig | null) => {
      if (!next) return;
      setConfig((prev) => {
        // Signed out we only see the public keys: keep the rest from before.
        const merged = signedIn ? next : { ...prev, minVersion: next.minVersion, updateMessage: next.updateMessage, maintenance: next.maintenance };
        try {
          globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(merged));
        } catch {
          // Cache is a convenience only.
        }
        return merged;
      });
    },
    [signedIn],
  );

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void fetchConfig(signedIn).then((next) => {
        if (!cancelled) apply(next);
      });
    };
    refresh();
    if (!signedIn) {
      return () => {
        cancelled = true;
      };
    }
    const channel = supabase.channel(`app-config:${Math.random().toString(36).slice(2)}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, refresh).subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [apply, signedIn]);

  return <ConfigCtx value={config}>{children}</ConfigCtx>;
}
