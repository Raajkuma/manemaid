// Shared rules for agency-managed offers and greetings (same as the web portal's).
import type { Tables } from './database.types';
import type { Tone } from './theme';

export type Offer = Tables<'offers'>;
export type Greeting = Tables<'greetings'>;
export type PromoStatus = 'live' | 'scheduled' | 'ended' | 'hidden';

export const STATUS_META: Record<PromoStatus, { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'green' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  ended: { label: 'Ended', tone: 'neutral' },
  hidden: { label: 'Hidden', tone: 'orange' },
};

export function offerStatus(o: Pick<Offer, 'active' | 'starts_at' | 'ends_at'>, now = Date.now()): PromoStatus {
  if (!o.active) return 'hidden';
  if (new Date(o.starts_at).getTime() > now) return 'scheduled';
  if (o.ends_at && new Date(o.ends_at).getTime() <= now) return 'ended';
  return 'live';
}

/** Today's date in India (greetings run on India calendar days, like the server). */
export function indiaToday(): string {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export function greetingStatus(g: Pick<Greeting, 'active' | 'starts_on' | 'ends_on'>, today = indiaToday()): PromoStatus {
  if (!g.active) return 'hidden';
  if (g.starts_on > today) return 'scheduled';
  if (g.ends_on < today) return 'ended';
  return 'live';
}

export const OFFER_AUDIENCE: Record<string, string> = { all: 'All customers', new_customers: 'New customers only' };
export const GREETING_AUDIENCE: Record<string, string> = {
  all: 'All customers',
  active_customers: 'Customers with a confirmed or active booking',
};

/** Add whole days to a YYYY-MM-DD date. */
export function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Start of a local day / end of a local day as ISO timestamps (offer start / end). */
export const startOfDayIso = (date: string) => new Date(`${date}T00:00:00`).toISOString();
export const endOfDayIso = (date: string) => new Date(`${date}T23:59:59`).toISOString();
