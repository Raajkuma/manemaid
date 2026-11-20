import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { BookingSummary, PaymentBadge, QuoteCard, StaffProfile, Timeline, fetchBookingBundle } from '@/components/booking';
import { usePopup } from '@/components/popup';
import { Button, Card, ErrorState, Heading, Icon3D, KeyValue, Loading, Muted, Row, Screen, SectionTitle, type IconName } from '@/components/ui';
import { TERMINAL, formatDate, formatINR, type BookingStatus } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, space, type Tone } from '@/lib/theme';

type Action = { label: string; icon: IconName; variant?: 'primary' | 'secondary' | 'danger' | 'success'; onPress: () => void };

export default function ManageBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(() => fetchBookingBundle(id, true), { key: `manage:${id}`, tables: ['bookings'] });

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;

  const { booking, quote, staff, events } = q.data;
  const s = booking.status;
  const current = staff.find((x) => x.assignment_status === 'proposed' || x.assignment_status === 'approved');

  /** Status change through a pop-up. */
  function move(
    to: BookingStatus,
    o: { title: string; message: string; icon: IconName; tone?: Tone; confirm: string; reason?: boolean; destructive?: boolean; done: string },
  ) {
    void popup.confirm({
      title: o.title,
      message: o.message,
      icon: o.icon,
      tone: o.tone,
      destructive: o.destructive,
      reason: o.reason ? 'required' : undefined,
      reasonLabel: 'Reason (the customer will see this)',
      confirmLabel: o.confirm,
      onConfirm: async (reason) => {
        unwrap(await supabase.rpc('update_booking_status', { p_booking_id: id, p_to: to, p_reason: reason || undefined }));
        await q.reload();
      },
      success: { title: o.done },
    });
  }

  const actions: Action[] = [];
  if (s === 'enquiry_submitted' || s === 'under_review')
    actions.push({ label: 'Send quotation', icon: 'paper-plane', onPress: () => router.push({ pathname: '/send-quote', params: { id } }) });
  if (s === 'enquiry_submitted')
    actions.push({
      label: 'Start review',
      icon: 'eye',
      variant: 'secondary',
      onPress: () => move('under_review', { title: 'Start reviewing?', message: 'The customer will see their request is under review.', icon: 'eye', confirm: 'Start review', done: 'Marked under review' }),
    });
  if (s === 'quotation_sent')
    actions.push({
      label: 'Withdraw quotation',
      icon: 'arrow-undo',
      variant: 'secondary',
      onPress: () => move('under_review', { title: 'Withdraw quotation', message: 'Use this to revise the quote.', icon: 'arrow-undo', tone: 'orange', confirm: 'Withdraw', reason: true, done: 'Quotation withdrawn' }),
    });
  if (s === 'staff_matching')
    actions.push({ label: 'Propose staff', icon: 'people', onPress: () => router.push({ pathname: '/propose-staff', params: { id } }) });
  if (s === 'staff_proposed')
    actions.push({
      label: 'Withdraw proposal',
      icon: 'arrow-undo',
      variant: 'secondary',
      onPress: () => move('staff_matching', { title: 'Withdraw proposal', message: 'You can propose someone else after this.', icon: 'arrow-undo', tone: 'orange', confirm: 'Withdraw', reason: true, done: 'Proposal withdrawn' }),
    });
  if (s === 'confirmed')
    actions.push({
      label: 'Mark service started',
      icon: 'play',
      variant: 'success',
      onPress: () => move('active', { title: 'Service started?', message: 'The booking becomes active.', icon: 'play', tone: 'green', confirm: 'Mark active', done: 'Service is active' }),
    });
  if (s === 'active')
    actions.push({
      label: 'Mark completed',
      icon: 'checkmark-done',
      variant: 'success',
      onPress: () => move('completed', { title: 'Complete this booking?', message: 'The staff member will be freed up for new work.', icon: 'checkmark-done', tone: 'green', confirm: 'Complete', done: 'Booking completed' }),
    });
  if (s === 'enquiry_submitted' || s === 'under_review')
    actions.push({
      label: 'Unable to serve',
      icon: 'remove-circle-outline',
      variant: 'danger',
      onPress: () => move('unable_to_serve', { title: 'Unable to serve?', message: 'Let the customer know why.', icon: 'remove-circle', destructive: true, confirm: 'Confirm', reason: true, done: 'Customer informed' }),
    });
  if (!TERMINAL.includes(s))
    actions.push({
      label: 'Cancel booking',
      icon: 'close-circle-outline',
      variant: 'danger',
      onPress: () => move('cancelled_by_agency', { title: 'Cancel this booking?', message: 'This cannot be undone.', icon: 'close', destructive: true, confirm: 'Cancel booking', reason: true, done: 'Booking cancelled' }),
    });

  const showPayment = ['confirmed', 'active', 'completed'].includes(s);

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <BookingSummary booking={booking} audience="agency" />

      {showPayment ? (
        <Card tone={booking.payment_status === 'pending_verification' ? 'orange' : booking.payment_status === 'paid' ? 'green' : undefined} index={0}>
          <Row style={{ gap: space.md, marginBottom: space.md }}>
            <Icon3D name="wallet" tone={booking.payment_status === 'paid' ? 'green' : 'orange'} float={booking.payment_status === 'pending_verification'} />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 17 }}>Payment</Heading>
              <PaymentBadge status={booking.payment_status} />
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>
              {formatINR(booking.paid_amount ?? booking.agreed_price)}
            </Text>
          </Row>
          {booking.payment_reference ? <KeyValue label="Reference" value={booking.payment_reference} /> : null}
          {booking.payment_method ? <KeyValue label="Method" value={booking.payment_method.replace('_', ' ').toUpperCase()} /> : null}
          {booking.paid_at ? <KeyValue label="Received" value={formatDate(booking.paid_at)} /> : null}
          {booking.payment_status === 'pending_verification' ? (
            <View style={{ gap: space.sm, marginTop: space.md }}>
              <Button
                label="Confirm payment received"
                icon="checkmark-circle"
                variant="success"
                onPress={() =>
                  popup.confirm({
                    title: 'Confirm payment?',
                    message: `Check that ${formatINR(booking.agreed_price)} with reference ${booking.payment_reference} reached your account.`,
                    icon: 'wallet',
                    tone: 'green',
                    confirmLabel: 'Confirm',
                    onConfirm: async () => {
                      unwrap(await supabase.rpc('confirm_payment', { p_booking_id: id }));
                      await q.reload();
                    },
                    success: { title: 'Payment confirmed', message: "The customer's support line is now unlocked." },
                  })
                }
              />
              <Button
                label="Reference not found"
                icon="close-circle-outline"
                variant="danger"
                onPress={() =>
                  popup.confirm({
                    title: 'Reject this payment?',
                    message: 'The customer will be asked to pay again.',
                    icon: 'alert',
                    destructive: true,
                    reason: 'required',
                    reasonLabel: 'What went wrong?',
                    confirmLabel: 'Reject',
                    onConfirm: async (reason) => {
                      unwrap(await supabase.rpc('reject_payment', { p_booking_id: id, p_reason: reason }));
                      await q.reload();
                    },
                    success: { title: 'Customer notified' },
                  })
                }
              />
            </View>
          ) : booking.payment_status === 'unpaid' ? (
            <Button
              label="Record cash / offline payment"
              icon="cash-outline"
              variant="secondary"
              style={{ marginTop: space.md }}
              onPress={() =>
                popup.confirm({
                  title: 'Record a cash payment?',
                  message: `Mark ${formatINR(booking.agreed_price)} as received in cash or by bank transfer.`,
                  icon: 'cash',
                  tone: 'green',
                  reason: 'optional',
                  reasonLabel: 'Receipt / reference (optional)',
                  confirmLabel: 'Record payment',
                  onConfirm: async (ref) => {
                    unwrap(await supabase.rpc('confirm_payment', { p_booking_id: id, p_method: 'cash', p_reference: ref || undefined }));
                    await q.reload();
                  },
                  success: { title: 'Payment recorded', message: "The customer's support line is now unlocked." },
                })
              }
            />
          ) : null}
        </Card>
      ) : null}

      {actions.length ? (
        <View style={{ gap: space.sm, marginBottom: space.md }}>
          {actions.map((a) => (
            <Button key={a.label} label={a.label} icon={a.icon} variant={a.variant} onPress={a.onPress} />
          ))}
        </View>
      ) : null}

      {quote ? (
        <>
          <SectionTitle>Latest quotation · {quote.status}</SectionTitle>
          <Card>
            <QuoteCard quote={quote} />
            {quote.customer_note ? (
              <View style={{ marginTop: space.md, backgroundColor: colors.orangeSoft, borderRadius: 12, padding: space.md }}>
                <Muted style={{ color: colors.orange }}>Customer: {quote.customer_note}</Muted>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      {current ? (
        <>
          <SectionTitle>{current.assignment_status === 'proposed' ? 'Proposed staff' : 'Assigned staff'}</SectionTitle>
          <Card onPress={() => router.push(`/staff-profile/${current.staff_id}`)}>
            <StaffProfile staff={current} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Timeline</SectionTitle>
      <Timeline events={events} audience="agency" />
    </Screen>
  );
}
