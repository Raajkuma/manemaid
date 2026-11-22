// Booking, support and staff rules — copied from the mobile app (mobile/src/lib/format.ts,
// mobile/src/components/support.tsx, mobile/src/app/(admin)/(tabs)/queue.tsx) so the portal and
// the app show exactly the same groups, labels and counts.
import type { Tone } from '@/components/ui';

import type { Database } from './database.types';
import type { Tables } from './supabase';

export type Booking = Tables<'bookings'>;
export type BookingStatus = Database['public']['Enums']['booking_status'];
export type Address = Tables<'customer_addresses'>;
export type BookingRow = Booking & {
  customer_addresses: Address | null;
  service_categories: { name: string } | null;
  profiles: { full_name: string | null; phone: string | null; avatar_path: string | null } | null;
};

export const STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  enquiry_submitted: { label: 'New enquiry', tone: 'info' },
  under_review: { label: 'Under review', tone: 'info' },
  quotation_sent: { label: 'Quote sent', tone: 'warn' },
  staff_matching: { label: 'Needs staff', tone: 'brand' },
  staff_proposed: { label: 'Staff proposed', tone: 'warn' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  active: { label: 'Active', tone: 'ok' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled_by_customer: { label: 'Cancelled by customer', tone: 'bad' },
  cancelled_by_agency: { label: 'Cancelled', tone: 'bad' },
  unable_to_serve: { label: 'Unable to serve', tone: 'bad' },
};

export const TERMINAL: BookingStatus[] = ['completed', 'cancelled_by_customer', 'cancelled_by_agency', 'unable_to_serve'];

export const ENGAGEMENT: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  part_time: 'Part-time',
  full_time: 'Full-time',
  monthly: 'Monthly',
  live_in: 'Live-in',
};

// Work queue groups — identical to the app's Work queue.
const has = (...s: BookingStatus[]) => (b: Pick<Booking, 'status'>) => s.includes(b.status);
export const QUEUE_GROUPS: { key: string; label: string; tone: Tone; match: (b: Pick<Booking, 'status' | 'payment_status'>) => boolean }[] = [
  { key: 'action', label: 'Needs action', tone: 'warn', match: has('enquiry_submitted', 'under_review', 'staff_matching') },
  {
    key: 'payments',
    label: 'Payments',
    tone: 'ok',
    match: (b) => b.payment_status === 'pending_verification' || (['confirmed', 'active'].includes(b.status) && b.payment_status === 'unpaid'),
  },
  { key: 'waiting', label: 'Waiting', tone: 'info', match: has('quotation_sent', 'staff_proposed') },
  { key: 'live', label: 'Live', tone: 'brand', match: has('confirmed', 'active') },
  { key: 'closed', label: 'Closed', tone: 'neutral', match: has(...TERMINAL) },
];

export const PAYMENT: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'ok' },
  pending_verification: { label: 'Verifying payment', tone: 'warn' },
  unpaid: { label: 'Payment due', tone: 'bad' },
};

export function formatINR(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = Math.round(Number(value));
  const s = Math.abs(n).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}₹${rest ? `${rest},${last3}` : last3}`;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-23" -> "23 Nov 2026" (date only, no time-zone shift). */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatDays(days: number[] | null | undefined): string {
  if (!days?.length) return '';
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Every day';
  if (sorted.join() === '1,2,3,4,5,6') return 'Mon–Sat';
  if (sorted.join() === '1,2,3,4,5') return 'Mon–Fri';
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

export function formatSchedule(b: Pick<Booking, 'start_date' | 'days_of_week' | 'time_start' | 'time_end'>): string {
  const time = b.time_start && b.time_end ? ` · ${formatTime(b.time_start)}–${formatTime(b.time_end)}` : '';
  return `${formatDays(b.days_of_week)}${time} · from ${formatDay(b.start_date)}`;
}

export const languagesLabel = (l: string[] | null | undefined) => (l?.length ? l.join(', ') : 'Any language');

export const addressLine = (a: Address | null | undefined) =>
  a ? [a.flat_no, a.building, a.line1, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(', ') : '—';

export const BOOKING_SELECT = '*, customer_addresses(*), service_categories(name), profiles(full_name, phone, avatar_path)';

// ---------------------------------------------------------------- support
export type TicketStatus = Database['public']['Enums']['ticket_status'];
export type TicketPriority = Database['public']['Enums']['ticket_priority'];

export const TICKET_CATEGORY: Record<string, string> = {
  punctuality: 'Late arrival',
  absence: 'No-show',
  quality: 'Work quality',
  behaviour: 'Behaviour',
  replacement: 'Replacement',
  payment: 'Payment',
  safety: 'Safety',
  privacy: 'Privacy',
  other: 'Something else',
};
export const PRIORITY: Record<TicketPriority, { label: string; tone: Tone; target: string }> = {
  urgent: { label: 'Urgent', tone: 'bad', target: 'within 1 hour' },
  high: { label: 'Priority', tone: 'warn', target: 'within 4 hours' },
  normal: { label: 'Standard', tone: 'neutral', target: 'within 24 hours' },
};
export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'brand' },
  resolved: { label: 'Resolved', tone: 'ok' },
  closed: { label: 'Closed', tone: 'neutral' },
};
export const TICKET_FILTERS: { key: string; label: string; statuses: TicketStatus[] }[] = [
  { key: 'active', label: 'Active', statuses: ['open', 'in_progress'] },
  { key: 'open', label: 'New / reopened', statuses: ['open'] },
  { key: 'progress', label: 'In progress', statuses: ['in_progress'] },
  { key: 'done', label: 'Resolved / closed', statuses: ['resolved', 'closed'] },
];
export const PRIORITY_RANK: Record<TicketPriority, number> = { urgent: 0, high: 1, normal: 2 };
export const TICKET_ACTIONS: Record<TicketStatus, { to: TicketStatus; label: string; variant: 'primary' | 'secondary' }[]> = {
  open: [
    { to: 'in_progress', label: 'Start working on it', variant: 'primary' },
    { to: 'resolved', label: 'Mark resolved', variant: 'primary' },
  ],
  in_progress: [{ to: 'resolved', label: 'Mark resolved', variant: 'primary' }],
  resolved: [
    { to: 'closed', label: 'Close request', variant: 'secondary' },
    { to: 'open', label: 'Reopen', variant: 'secondary' },
  ],
  closed: [{ to: 'open', label: 'Reopen', variant: 'secondary' }],
};

// ---------------------------------------------------------------- staff
export type Staff = Tables<'staff'>;
export type StaffStatus = Database['public']['Enums']['staff_status'];
export type Verification = Database['public']['Enums']['verification_status'];

export const STAFF_STATUS: Record<StaffStatus, { label: string; tone: Tone }> = {
  available: { label: 'Available', tone: 'ok' },
  assigned: { label: 'Assigned', tone: 'brand' },
  on_leave: { label: 'On leave', tone: 'warn' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};
export const VERIFICATION: Record<Verification, { label: string; tone: Tone; body: string }> = {
  pending: { label: 'Pending', tone: 'neutral', body: 'Documents not checked yet' },
  in_progress: { label: 'In progress', tone: 'info', body: 'Checks under way' },
  verified: { label: 'Verified', tone: 'ok', body: 'Can be proposed to customers' },
  rejected: { label: 'Rejected', tone: 'bad', body: 'Did not pass verification' },
};
export const LANGUAGES = ['Hindi', 'Kannada', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Urdu', 'Marathi', 'Bengali'];
export const CONTACTS = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

/** Staff phones are stored as 91XXXXXXXXXX (same as the app's staff form). */
export function staffPhone(s: string): string | null {
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith('91')) return d;
  return null;
}
export const localPhone = (s: string | null | undefined) => (s ? s.replace(/^91/, '') : '');
