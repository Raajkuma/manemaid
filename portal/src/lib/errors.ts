import { supabase } from './supabase';

const VERSION = '1.0.0';
let installed = false;
let lastKey = '';

/** Send an error to the developer console (app_errors). Never throws. */
export function reportError(error: unknown, extra?: { route?: string }) {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
  const key = `${e.message}|${extra?.route ?? location.pathname}`;
  if (key === lastKey) return; // de-duplicate bursts of the same error
  lastKey = key;
  void supabase
    .rpc('report_error', {
      p_source: 'portal',
      p_message: e.message || 'Unknown error',
      p_stack: e.stack ?? undefined,
      p_route: extra?.route ?? location.pathname,
      p_app_version: VERSION,
      p_platform: navigator.userAgent.slice(0, 40),
    })
    .then(() => undefined, () => undefined);
}

/** Catch errors that escape React (async handlers, promise rejections). */
export function installGlobalErrorReporting() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason));
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}
