import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  BookingSummary,
  PaymentCard,
  QuoteCard,
  StaffProfile,
  SupportCard,
  Timeline,
  fetchBookingBundle,
} from '@/components/booking';
import { usePopup } from '@/components/popup';
import { Button, Card, ErrorState, Heading, Icon3D, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { formatINR, type BookingStatus } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space, type Tone } from '@/lib/theme';

const CUSTOMER_CANCELLABLE: BookingStatus[] = [
  'enquiry_submitted',
  'under_review',
  'quotation_sent',
  'staff_matching',
  'staff_proposed',
  'confirmed',
];

const WAITING: Partial<Record<BookingStatus, { icon: 'hourglass' | 'document-text' | 'search' | 'checkmark-done' | 'sparkles'; tone: Tone; text: string }>> = {
  enquiry_submitted: { icon: 'hourglass', tone: 'blue', text: 'The agency has your request and will review it shortly.' },
  under_review: { icon: 'document-text', tone: 'blue', text: 'The agency is preparing your quotation.' },
  staff_matching: { icon: 'search', tone: 'primary', text: 'Quotation accepted. The agency is finding the right person for you.' },
  confirmed: { icon: 'checkmark-done', tone: 'green', text: 'All set! Your staff member will arrive as scheduled.' },
  active: { icon: 'sparkles', tone: 'green', text: 'Your service is running.' },
};

export default function CustomerBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(() => fetchBookingBundle(id), { key: `booking:${id}`, tables: ['bookings'] });

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;

  const { booking, quote, staff, events, support } = q.data;
  const proposed = staff.find((s) => s.assignment_status === 'proposed');
  const assigned = staff.find((s) => s.assignment_status === 'approved' || s.assignment_status === 'ended');
  const waiting = WAITING[booking.status];
  const canPay = ['confirmed', 'active'].includes(booking.status);
  const total = quote ? Number(quote.monthly_price) + Number(quote.agency_fee) + Number(quote.tax) : 0;

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      {booking.status === 'quotation_sent' && quote?.status === 'sent' ? (
        <Card tone="orange" index={0}>
          <Row style={{ gap: space.md, marginBottom: space.md }}>
            <Icon3D name="document-text" tone="orange" float />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 18 }}>Your quotation is ready</Heading>
              <Muted>Review the scope and price below.</Muted>
            </View>
          </Row>
          <QuoteCard quote={quote} />
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            <Button
              label="Accept quotation"
              icon="checkmark-circle"
              onPress={() =>
                popup.confirm({
                  title: 'Accept this quotation?',
                  message: `${formatINR(total)} per month. The agency will then find and propose staff for you.`,
                  icon: 'checkmark-circle',
                  tone: 'green',
                  confirmLabel: 'Accept',
                  onConfirm: async () => {
                    unwrap(await supabase.rpc('respond_quotation', { p_quotation_id: quote.id, p_accept: true }));
                    await q.reload();
                  },
                  success: { title: 'Quotation accepted', message: "We're matching the best staff for you." },
                })
              }
            />
            <Button
              label="Ask for changes"
              icon="create-outline"
              variant="secondary"
              onPress={() =>
                popup.confirm({
                  title: 'Ask for changes',
                  message: "Tell the agency what you'd like changed. They'll send a revised quotation.",
                  icon: 'chatbubbles',
                  tone: 'orange',
                  reason: 'required',
                  reasonLabel: 'What should change?',
                  confirmLabel: 'Send',
                  onConfirm: async (note) => {
                    unwrap(await supabase.rpc('respond_quotation', { p_quotation_id: quote.id, p_accept: false, p_note: note }));
                    await q.reload();
                  },
                  success: { title: 'Sent to the agency', message: "You'll get a revised quotation soon." },
                })
              }
            />
          </View>
        </Card>
      ) : null}

      {booking.status === 'staff_proposed' && proposed ? (
        <Card tone="orange" index={0}>
          <Row style={{ gap: space.md, marginBottom: space.lg }}>
            <Icon3D name="person" tone="orange" float />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 18 }}>Meet your staff member</Heading>
              <Muted>Approve to confirm your booking.</Muted>
            </View>
          </Row>
          <StaffProfile staff={proposed} />
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            <Button
              label={`Approve ${proposed.full_name.split(' ')[0]}`}
              icon="thumbs-up"
              onPress={() =>
                popup.confirm({
                  title: `Approve ${proposed.full_name}?`,
                  message: 'Your booking will be confirmed and payment will open.',
                  icon: 'thumbs-up',
                  tone: 'green',
                  confirmLabel: 'Approve',
                  onConfirm: async () => {
                    unwrap(await supabase.rpc('respond_staff_proposal', { p_assignment_id: proposed.assignment_id, p_approve: true }));
                    await q.reload();
                  },
                  success: { title: 'Booking confirmed! 🎉', message: `${proposed.full_name.split(' ')[0]} will arrive as scheduled.` },
                })
              }
            />
            <Button
              label="Request someone else"
              icon="swap-horizontal"
              variant="secondary"
              onPress={() =>
                popup.confirm({
                  title: 'Request someone else',
                  message: "Let the agency know what you're looking for.",
                  icon: 'swap-horizontal',
                  tone: 'orange',
                  reason: 'required',
                  reasonLabel: 'What would you prefer?',
                  confirmLabel: 'Send',
                  onConfirm: async (note) => {
                    unwrap(
                      await supabase.rpc('respond_staff_proposal', { p_assignment_id: proposed.assignment_id, p_approve: false, p_note: note }),
                    );
                    await q.reload();
                  },
                  success: { title: 'Request sent', message: 'The agency will propose another option.' },
                })
              }
            />
          </View>
        </Card>
      ) : null}

      {canPay ? <PaymentCard booking={booking} support={support} onPaid={q.reload} /> : null}

      {waiting && !(canPay && booking.payment_status !== 'paid') ? (
        <Card index={1} style={{ backgroundColor: colors.primarySoft }}>
          <Row style={{ gap: space.md }}>
            <Icon3D name={waiting.icon} tone={waiting.tone} size={40} float />
            <Muted style={{ flex: 1, color: colors.primaryDark, fontSize: 14 }}>{waiting.text}</Muted>
          </Row>
        </Card>
      ) : null}

      <BookingSummary booking={booking} audience="customer" />

      {assigned && booking.status !== 'staff_proposed' ? (
        <>
          <SectionTitle>Your staff</SectionTitle>
          <Card>
            <StaffProfile staff={assigned} />
          </Card>
        </>
      ) : null}

      {quote && quote.status === 'accepted' ? (
        <>
          <SectionTitle>Accepted quotation</SectionTitle>
          <Card>
            <QuoteCard quote={quote} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Support</SectionTitle>
      <SupportCard support={support} />

      <Button
        label="Report an issue with this booking"
        icon="flag-outline"
        variant="secondary"
        style={{ marginBottom: space.md }}
        onPress={() => router.push({ pathname: '/support/new', params: { booking: booking.id } })}
      />

      <SectionTitle>Timeline</SectionTitle>
      <Timeline events={events} audience="customer" />

      {CUSTOMER_CANCELLABLE.includes(booking.status) ? (
        <Button
          label="Cancel booking"
          icon="close-circle-outline"
          variant="danger"
          onPress={() =>
            popup.confirm({
              title: 'Cancel this booking?',
              message: 'Please tell us why. Cancellation terms in your quotation may apply.',
              icon: 'close',
              destructive: true,
              reason: 'required',
              confirmLabel: 'Cancel booking',
              cancelLabel: 'Keep it',
              onConfirm: async (reason) => {
                unwrap(await supabase.rpc('update_booking_status', { p_booking_id: booking.id, p_to: 'cancelled_by_customer', p_reason: reason }));
                await q.reload();
              },
              success: { title: 'Booking cancelled' },
            })
          }
        />
      ) : null}
    </Screen>
  );
}
