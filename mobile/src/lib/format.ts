import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { Database } from './database.types';
import type { Tone } from './theme';

export type BookingStatus = Database['public']['Enums']['booking_status'];
export type EngagementType = Database['public']['Enums']['engagement_type'];
type IconName = ComponentProps<typeof Ionicons>['name'];

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const TERMINAL: BookingStatus[] = [
  'completed',
  'cancelled_by_customer',
  'cancelled_by_agency',
  'unable_to_serve',
];

export const STATUS: Record<BookingStatus, { customer: string; agency: string; tone: Tone }> = {
  enquiry_submitted: { customer: 'Enquiry submitted', agency: 'New enquiry', tone: 'blue' },
  under_review: { customer: 'Under review', agency: 'Under review', tone: 'blue' },
  quotation_sent: { customer: 'Quotation ready', agency: 'Quote sent', tone: 'orange' },
  staff_matching: { customer: 'Finding your staff', agency: 'Needs staff', tone: 'primary' },
  staff_proposed: { customer: 'Approve your staff', agency: 'Staff proposed', tone: 'orange' },
  confirmed: { customer: 'Confirmed', agency: 'Confirmed', tone: 'green' },
  active: { customer: 'Active', agency: 'Active', tone: 'green' },
  completed: { customer: 'Completed', agency: 'Completed', tone: 'neutral' },
  cancelled_by_customer: { customer: 'Cancelled', agency: 'Cancelled by customer', tone: 'danger' },
  cancelled_by_agency: { customer: 'Cancelled by agency', agency: 'Cancelled', tone: 'danger' },
  unable_to_serve: { customer: 'Unable to serve', agency: 'Unable to serve', tone: 'danger' },
};

export const ENGAGEMENT: Record<EngagementType, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  part_time: 'Part-time',
  full_time: 'Full-time',
  monthly: 'Monthly',
  live_in: 'Live-in',
};

export const CATEGORY_ICON: Record<string, IconName> = {
  home_care: 'sparkles',
  cooking: 'restaurant',
  child_care: 'happy',
  elder_care: 'heart',
  housekeeping: 'home',
  live_in: 'bed',
};

/** ₹ with Indian digit grouping, e.g. 125000 -> ₹1,25,000 */
export function formatINR(value: number | null | undefined): string {
  if (value == null) return '—';
  const n = Math.round(Number(value));
  const s = Math.abs(n).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}₹${rest ? `${rest},${last3}` : last3}`;
}

/** Local YYYY-MM-DD (avoids UTC shifting from toISOString). */
export function toISODate(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDays(days: number[] | null | undefined): string {
  if (!days?.length) return '';
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Every day';
  if (sorted.join() === '1,2,3,4,5,6') return 'Mon–Sat';
  if (sorted.join() === '1,2,3,4,5') return 'Mon–Fri';
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

export function formatSchedule(b: {
  start_date: string;
  days_of_week: number[];
  time_start: string | null;
  time_end: string | null;
}): string {
  const time =
    b.time_start && b.time_end ? ` · ${formatTime(b.time_start)}–${formatTime(b.time_end)}` : '';
  return `${formatDays(b.days_of_week)}${time} · from ${formatDate(b.start_date)}`;
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(iso);
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}

export const STAFF_STATUS: Record<string, { label: string; tone: Tone }> = {
  available: { label: 'Available', tone: 'green' },
  assigned: { label: 'Assigned', tone: 'primary' },
  on_leave: { label: 'On leave', tone: 'orange' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};

/** Languages customers can ask for and staff can speak (one list so they always match). */
export const LANGUAGES = ['Hindi', 'Kannada', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Urdu', 'Marathi', 'Bengali'];

/** "Hindi, Kannada", or "Any language" when no preference was given. */
export function languagesLabel(langs: string[] | null | undefined): string {
  return langs?.length ? langs.join(', ') : 'Any language';
}
