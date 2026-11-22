/**
 * Send app crashes and unhandled errors to the developer console (public.app_errors).
 * Keeps React Native's default handler (red screen in development, crash in release).
 */
import { Platform } from 'react-native';

import { APP_VERSION } from './config';
import { DEMO_MODE, supabase } from './supabase';

let lastKey = '';
let currentRoute: string | undefined;

export function setErrorRoute(route: string) {
  currentRoute = route;
}

export function reportError(error: unknown) {
  if (DEMO_MODE) return;
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
  const key = `${e.message}|${currentRoute ?? ''}`;
  if (key === lastKey) return;
  lastKey = key;
  void supabase
    .rpc('report_error', {
      p_source: 'mobile',
      p_message: e.message || 'Unknown error',
      p_stack: e.stack ?? undefined,
      p_route: currentRoute,
      p_app_version: APP_VERSION,
      p_platform: `${Platform.OS} ${String(Platform.Version)}`,
    })
    .then(() => undefined, () => undefined);
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler: () => GlobalHandler; setGlobalHandler: (h: GlobalHandler) => void };

let installed = false;
export function installErrorReporting() {
  if (installed) return;
  installed = true;
  const eu = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (eu) {
    const previous = eu.getGlobalHandler();
    eu.setGlobalHandler((error, isFatal) => {
      reportError(error);
      previous(error, isFatal);
    });
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message));
    window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason));
  }
}
