import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ErrorBox, Loading, useFeedback } from '@/components/ui';
import {
  BOOKING_SELECT,
  ENGAGEMENT,
  PAYMENT,
  STATUS,
  TERMINAL,
  addressLine,
  formatDay,
  formatINR,
  formatSchedule,
  languagesLabel,
  type BookingRow,
  type BookingStatus,
} from '@/lib/booking';
import { timeAgo } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type StaffOnBooking = {
  assignment_id: string;
  assignment_status: string;
  agency_note: string | null;
  staff_id: string;
  full_name: string;
  categories: string[];
  languages: string[];
  experience_years: number;
  bio: string | null;
  verification_status: string;
  rating: number | null;
};

function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const [booking, quotes, staff, events] = await Promise.all([
        supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).single(),
        supabase.from('quotations').select('*').eq('booking_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.rpc('get_booking_staff', { p_booking_id: id }),
        supabase.from('booking_events').select('*').eq('booking_id', id).order('created_at', { ascending: true }),
      ]);
      return {
        booking: unwrap(booking) as unknown as BookingRow,
        quote: (unwrap(quotes)[0] ?? null) as Tables<'quotations'> | null,
        staff: unwrap(staff) as unknown as StaffOnBooking[],
        events: unwrap(events) as Tables<'booking_events'>[],
      };
    },
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

type Action = { label: string; variant?: 'primary' | 'secondary' | 'danger'; onClick: () => void };

export function BookingDetail() {
  const { id = '' } = useParams();
  const q = useBooking(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? new Error('Booking not found')} onRetry={() => void q.refetch()} />;
  const { booking: b, quote, staff, events } = q.data;
  const s = b.status;
  const current = staff.find((x) => x.assignment_status === 'proposed' || x.assignment_status === 'approved');
  const refresh = () => qc.invalidateQueries();

  // Same status moves as the app's booking screen.
  function move(to: BookingStatus, o: { title: string; message: string; confirm: string; reason?: boolean; danger?: boolean; done: string }) {
    confirm({
      title: o.title,
      message: o.message,
      confirmLabel: o.confirm,
      danger: o.danger,
      reason: o.reason ? 'required' : undefined,
      reasonLabel: 'Reason (the customer will see this)',
      onConfirm: async (reason) => {
        unwrap(await supabase.rpc('update_booking_status', { p_booking_id: id, p_to: to, p_reason: reason || undefined }));
        await refresh();
        toast(o.done);
      },
    });
  }

  const actions: Action[] = [];
  if (s === 'enquiry_submitted' || s === 'under_review') actions.push({ label: 'Send quotation', onClick: () => navigate(`/agency/bookings/${id}/quote`) });
  if (s === 'enquiry_submitted')
    actions.push({ label: 'Start review', variant: 'secondary', onClick: () => move('under_review', { title: 'Start reviewing?', message: 'The customer will see their request is under review.', confirm: 'Start review', done: 'Marked under review' }) });
  if (s === 'quotation_sent')
    actions.push({ label: 'Withdraw quotation', variant: 'secondary', onClick: () => move('under_review', { title: 'Withdraw quotation', message: 'Use this to revise the quote.', confirm: 'Withdraw', reason: true, done: 'Quotation withdrawn' }) });
  if (s === 'staff_matching') actions.push({ label: 'Propose staff', onClick: () => navigate(`/agency/bookings/${id}/propose`) });
  if (s === 'staff_proposed')
    actions.push({ label: 'Withdraw proposal', variant: 'secondary', onClick: () => move('staff_matching', { title: 'Withdraw proposal', message: 'You can propose someone else after this.', confirm: 'Withdraw', reason: true, done: 'Proposal withdrawn' }) });
  if (s === 'confirmed')
    actions.push({ label: 'Mark service started', onClick: () => move('active', { title: 'Service started?', message: 'The booking becomes active.', confirm: 'Mark active', done: 'Service is active' }) });
  if (s === 'active')
    actions.push({ label: 'Mark completed', onClick: () => move('completed', { title: 'Complete this booking?', message: 'The staff member will be freed up for new work.', confirm: 'Complete', done: 'Booking completed' }) });
  if (s === 'enquiry_submitted' || s === 'under_review')
    actions.push({ label: 'Unable to serve', variant: 'danger', onClick: () => move('unable_to_serve', { title: 'Unable to serve?', message: 'Let the customer know why.', confirm: 'Confirm', reason: true, danger: true, done: 'Customer informed' }) });
  if (!TERMINAL.includes(s))
    actions.push({ label: 'Cancel booking', variant: 'danger', onClick: () => move('cancelled_by_agency', { title: 'Cancel this booking?', message: 'This cannot be undone.', confirm: 'Cancel booking', reason: true, danger: true, done: 'Booking cancelled' }) });

  const showPayment = ['confirmed', 'active', 'completed'].includes(s);
  const pay = PAYMENT[b.payment_status];
  const quoteTotal = quote ? Number(quote.monthly_price) + Number(quote.agency_fee) + Number(quote.tax) : 0;

  return (
    <>
      <Link to="/agency/queue" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> Work queue
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 p-5 text-white">
              <p className="text-sm text-white/80">{b.reference}</p>
              <h1 className="text-2xl font-extrabold">{b.service_categories?.name ?? b.category_code}</h1>
              <p className="text-sm text-white/85">{ENGAGEMENT[b.engagement_type]}</p>
              <div className="mt-3"><span className="rounded-full bg-white px-2 py-0.5"><Badge tone={STATUS[s].tone}>{STATUS[s].label}</Badge></span></div>
            </div>
            <div className="p-5">
              <Row label="Customer" value={b.profiles?.full_name || 'Not provided'} />
              <Row label="Phone" value={formatPhone(b.profiles?.phone)} />
              <Row label="Schedule" value={formatSchedule(b)} />
              {b.hours_per_day ? <Row label="Hours / day" value={String(b.hours_per_day)} /> : null}
              {b.household_size ? <Row label="Household" value={`${b.household_size} people`} /> : null}
              {b.rooms ? <Row label="Rooms" value={String(b.rooms)} /> : null}
              <Row label="Languages" value={languagesLabel(b.language_prefs)} />
              {b.offer_title ? <Row label="Offer claimed" value={<span className="text-warn">{b.offer_title}</span>} /> : null}
              <Row label="Trial" value={b.trial_requested ? 'Requested' : 'No'} />
              {b.agreed_price != null ? <Row label="Agreed price" value={`${formatINR(b.agreed_price)} / month`} /> : null}
              <Row label="Address" value={addressLine(b.customer_addresses)} />
              {b.customer_addresses?.access_notes ? <Row label="Access" value={b.customer_addresses.access_notes} /> : null}
              {b.special_instructions ? (
                <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="text-muted">Instructions</p>
                  <p>{b.special_instructions}</p>
                </div>
              ) : null}
            </div>
          </Card>

          {quote ? (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">Latest quotation · {quote.status}</h2>
              <div className="rounded-xl bg-surface-2 p-3 text-sm">
                <p className="text-muted">Scope of work</p>
                <p className="whitespace-pre-wrap">{quote.scope}</p>
              </div>
              <div className="mt-3">
                <Row label="Service price" value={formatINR(Number(quote.monthly_price) + Number(quote.agency_fee))} />
                {Number(quote.tax) > 0 ? <Row label="Tax" value={formatINR(quote.tax)} /> : null}
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <span className="font-semibold">Total per month</span>
                  <span className="font-display text-2xl font-extrabold text-brand-500">{formatINR(quoteTotal)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">Valid until {formatDay(quote.valid_until)}</p>
              </div>
              {quote.terms ? <p className="mt-3 text-sm"><span className="text-muted">Terms: </span>{quote.terms}</p> : null}
              {quote.customer_note ? <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">Customer: {quote.customer_note}</p> : null}
            </Card>
          ) : null}

          {current ? (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">{current.assignment_status === 'proposed' ? 'Proposed staff' : 'Assigned staff'}</h2>
              <Link to={`/agency/staff/${current.staff_id}`} className="flex items-center gap-3 hover:text-brand-500">
                <div className="grid size-11 place-items-center rounded-full bg-accent-soft font-bold text-brand-500">{current.full_name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <p className="font-semibold">{current.full_name}</p>
                  <p className="text-xs text-muted">{current.experience_years} yrs · {current.languages.join(', ')}{current.rating ? ` · ★ ${current.rating}` : ''}</p>
                </div>
              </Link>
              {current.agency_note ? <p className="mt-3 text-sm text-muted">Note: {current.agency_note}</p> : null}
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="mb-4 font-bold">Timeline</h2>
            <ol className="space-y-4">
              {events.map((e, i) => {
                const last = i === events.length - 1;
                const payment = e.kind === 'payment';
                return (
                  <li key={e.id} className="flex gap-3">
                    <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${last ? 'bg-brand-500 text-white' : payment ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-brand-500'}`}>
                      <Icon name={payment ? 'tag' : 'check'} size={13} />
                    </span>
                    <div className="text-sm">
                      <p className="font-semibold">{payment ? 'Payment' : STATUS[e.to_status].label}</p>
                      <p className="text-xs text-muted">{timeAgo(e.created_at)}{e.actor_role ? ` · ${e.actor_role === 'customer' ? 'customer' : 'agency'}` : ''}</p>
                      {e.reason ? <p className="mt-0.5">{e.reason}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {showPayment ? (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Payment</h2>
                  <Badge tone={pay.tone}>{pay.label}</Badge>
                </div>
                <span className="font-display text-2xl font-extrabold">{formatINR(b.paid_amount ?? b.agreed_price)}</span>
              </div>
              {b.payment_reference ? <Row label="Reference" value={b.payment_reference} /> : null}
              {b.payment_method ? <Row label="Method" value={b.payment_method.replace('_', ' ').toUpperCase()} /> : null}
              {b.paid_at ? <Row label="Received" value={formatDay(b.paid_at)} /> : null}
              {b.payment_status === 'pending_verification' ? (
                <div className="mt-3 space-y-2">
                  <Button className="w-full" icon="check" onClick={() => confirm({
                    title: 'Confirm payment?',
                    message: `Check that ${formatINR(b.agreed_price)} with reference ${b.payment_reference} reached your account.`,
                    confirmLabel: 'Confirm',
                    onConfirm: async () => {
                      unwrap(await supabase.rpc('confirm_payment', { p_booking_id: id }));
                      await refresh();
                      toast("Payment confirmed — the customer's support line is unlocked");
                    },
                  })}>Confirm payment received</Button>
                  <Button className="w-full" variant="danger" onClick={() => confirm({
                    title: 'Reject this payment?',
                    message: 'The customer will be asked to pay again.',
                    confirmLabel: 'Reject',
                    danger: true,
                    reason: 'required',
                    reasonLabel: 'What went wrong?',
                    onConfirm: async (reason) => {
                      unwrap(await supabase.rpc('reject_payment', { p_booking_id: id, p_reason: reason }));
                      await refresh();
                      toast('Customer notified');
                    },
                  })}>Reference not found</Button>
                </div>
              ) : b.payment_status === 'unpaid' ? (
                <Button className="mt-3 w-full" variant="secondary" onClick={() => confirm({
                  title: 'Record a cash payment?',
                  message: `Mark ${formatINR(b.agreed_price)} as received in cash or by bank transfer.`,
                  confirmLabel: 'Record payment',
                  reason: 'optional',
                  reasonLabel: 'Receipt / reference (optional)',
                  onConfirm: async (ref) => {
                    unwrap(await supabase.rpc('confirm_payment', { p_booking_id: id, p_method: 'cash', p_reference: ref || undefined }));
                    await refresh();
                    toast('Payment recorded');
                  },
                })}>Record cash / offline payment</Button>
              ) : null}
            </Card>
          ) : null}

          {actions.length ? (
            <Card className="space-y-2 p-5">
              <h2 className="mb-1 font-bold">Actions</h2>
              {actions.map((a) => (
                <Button key={a.label} className="w-full" variant={a.variant ?? 'primary'} onClick={a.onClick}>{a.label}</Button>
              ))}
            </Card>
          ) : (
            <Card className="p-5 text-sm text-muted">This booking is closed. No further actions.</Card>
          )}
        </aside>
      </div>
    </>
  );
}
