// Booking building blocks shared by the customer and agency screens.
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import type { Database, Tables } from '@/lib/database.types';
import {
  CATEGORY_ICON,
  ENGAGEMENT,
  STATUS,
  formatDate,
  formatINR,
  formatSchedule,
  languagesLabel,
  timeAgo,
  type BookingStatus,
} from '@/lib/format';
import { tapFeedback } from '@/lib/feedback';
import { openLink } from '@/lib/links';
import { photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, gradients, radius, space } from '@/lib/theme';

import { usePopup } from './popup';
import { Avatar, Badge, Body, Button, Card, Divider, Heading, Icon3D, KeyValue, Muted, Row, Strong } from './ui';

export type BookingWithRefs = Tables<'bookings'> & {
  customer_addresses: Tables<'customer_addresses'> | null;
  service_categories: { name: string } | null;
  profiles?: { full_name: string | null; phone: string | null; avatar_path: string | null } | null;
};
export type StaffOnBooking = Database['public']['Functions']['get_booking_staff']['Returns'][number];

export type AgencySupport = {
  agency_name: string;
  support_hours: string | null;
  unlocked: boolean;
  upi_id: string | null;
  upi_payee_name: string | null;
  support_phone: string | null;
  whatsapp_phone: string | null;
  alternate_phone: string | null;
  support_email: string | null;
};

export type BookingBundle = {
  booking: BookingWithRefs;
  quote: Tables<'quotations'> | null;
  staff: StaffOnBooking[];
  events: Tables<'booking_events'>[];
  support: AgencySupport;
};

/** Everything the booking detail screens need, in one round of parallel requests. */
export async function fetchBookingBundle(id: string, withCustomer = false): Promise<BookingBundle> {
  const select = withCustomer
    ? '*, customer_addresses(*), service_categories(name), profiles(full_name, phone, avatar_path)'
    : '*, customer_addresses(*), service_categories(name)';
  const [booking, quotes, staff, events, support] = await Promise.all([
    supabase.from('bookings').select(select).eq('id', id).single(),
    supabase.from('quotations').select('*').eq('booking_id', id).order('created_at', { ascending: false }).limit(1),
    supabase.rpc('get_booking_staff', { p_booking_id: id }),
    supabase.from('booking_events').select('*').eq('booking_id', id).order('created_at', { ascending: true }),
    supabase.rpc('get_agency_support'),
  ]);
  return {
    booking: unwrap(booking) as unknown as BookingWithRefs,
    quote: unwrap(quotes)[0] ?? null,
    staff: unwrap(staff),
    events: unwrap(events),
    support: unwrap(support) as unknown as AgencySupport,
  };
}

export function StatusBadge({ status, audience }: { status: BookingStatus; audience: 'customer' | 'agency' }) {
  const s = STATUS[status];
  return <Badge label={s[audience]} tone={s.tone} />;
}

export function PaymentBadge({ status }: { status: Tables<'bookings'>['payment_status'] }) {
  if (status === 'paid') return <Badge label="Paid" tone="green" icon="checkmark-circle" />;
  if (status === 'pending_verification') return <Badge label="Verifying payment" tone="orange" icon="time" />;
  return <Badge label="Payment due" tone="danger" icon="wallet" />;
}

export function BookingListItem({
  booking,
  audience,
  onPress,
  index,
}: {
  booking: BookingWithRefs;
  audience: 'customer' | 'agency';
  onPress: () => void;
  index?: number;
}) {
  const title = booking.service_categories?.name ?? booking.category_code;
  const subtitle =
    audience === 'agency'
      ? `${booking.profiles?.full_name || 'Customer'} · ${booking.customer_addresses?.pincode ?? ''}`
      : formatSchedule(booking);
  const showPay = ['confirmed', 'active'].includes(booking.status);
  return (
    <Card onPress={onPress} index={index} accessibilityLabel={`${title} booking ${booking.reference}`}>
      <Row style={{ alignItems: 'flex-start', gap: space.md }}>
        <Icon3D name={CATEGORY_ICON[booking.category_code] ?? 'briefcase'} tone={STATUS[booking.status].tone} size={48} />
        <View style={{ flex: 1, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Strong>{title}</Strong>
            <Muted>{booking.reference}</Muted>
          </Row>
          <Muted numberOfLines={2}>{subtitle}</Muted>
          <Row style={{ marginTop: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={booking.status} audience={audience} />
            {showPay ? <PaymentBadge status={booking.payment_status} /> : null}
          </Row>
        </View>
      </Row>
    </Card>
  );
}

export function BookingSummary({ booking, audience }: { booking: BookingWithRefs; audience: 'customer' | 'agency' }) {
  const a = booking.customer_addresses;
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.lg }}>
        <Row style={{ gap: space.md }}>
          <Icon3D name={CATEGORY_ICON[booking.category_code] ?? 'briefcase'} size={54} gradient={['#FFFFFF', '#E7E3FF']} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 13 }}>{booking.reference}</Text>
            <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 22 }}>
              {booking.service_categories?.name ?? booking.category_code}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: fonts.body, fontSize: 13 }}>
              {ENGAGEMENT[booking.engagement_type]}
            </Text>
          </View>
        </Row>
        <View style={{ marginTop: space.md }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: radius.pill }}>
            <StatusBadge status={booking.status} audience={audience} />
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: space.lg }}>
        {audience === 'agency' && booking.profiles ? (
          <>
            <KeyValue label="Customer" value={booking.profiles.full_name || 'Not provided'} />
            <KeyValue label="Phone" value={booking.profiles.phone ? `+${booking.profiles.phone}` : '—'} />
          </>
        ) : null}
        <KeyValue label="Schedule" value={formatSchedule(booking)} />
        {booking.hours_per_day ? <KeyValue label="Hours / day" value={String(booking.hours_per_day)} /> : null}
        {booking.household_size ? <KeyValue label="Household" value={`${booking.household_size} people`} /> : null}
        {booking.rooms ? <KeyValue label="Rooms" value={String(booking.rooms)} /> : null}
        <KeyValue label="Languages" value={languagesLabel(booking.language_prefs)} />
        <KeyValue label="Trial" value={booking.trial_requested ? 'Requested' : 'No'} />
        {booking.agreed_price != null ? <KeyValue label="Agreed price" value={`${formatINR(booking.agreed_price)} / month`} /> : null}
        {a ? (
          <KeyValue
            label="Address"
            value={[a.flat_no, a.building, a.line1, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(', ')}
          />
        ) : null}
        {a?.access_notes ? <KeyValue label="Access" value={a.access_notes} /> : null}
        {booking.special_instructions ? (
          <View style={{ marginTop: space.sm, backgroundColor: colors.canvas, borderRadius: radius.md, padding: space.md }}>
            <Muted>Instructions</Muted>
            <Body>{booking.special_instructions}</Body>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export function QuoteCard({ quote }: { quote: Tables<'quotations'> }) {
  const total = Number(quote.monthly_price) + Number(quote.agency_fee) + Number(quote.tax);
  return (
    <>
      <View style={{ backgroundColor: colors.canvas, borderRadius: radius.md, padding: space.md }}>
        <Muted>Scope of work</Muted>
        <Body>{quote.scope}</Body>
      </View>
      <View style={{ marginTop: space.md }}>
        <KeyValue label="Service price" value={formatINR(Number(quote.monthly_price) + Number(quote.agency_fee))} />
        {Number(quote.tax) > 0 ? <KeyValue label="Tax" value={formatINR(quote.tax)} /> : null}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Strong>Total per month</Strong>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>{formatINR(total)}</Text>
        </Row>
        <Muted style={{ marginTop: 4 }}>Valid until {formatDate(quote.valid_until)}</Muted>
      </View>
      {quote.terms ? (
        <View style={{ marginTop: space.md }}>
          <Muted>Terms</Muted>
          <Body style={{ fontSize: 14 }}>{quote.terms}</Body>
        </View>
      ) : null}
    </>
  );
}

export function StaffProfile({ staff }: { staff: StaffOnBooking }) {
  const verified = staff.verification_status === 'verified';
  return (
    <View style={{ gap: space.md }}>
      <Row style={{ gap: space.md }}>
        <Avatar name={staff.full_name} uri={photoUrl('staff-photos', staff.photo_url)} size={64} ring />
        <View style={{ flex: 1 }}>
          <Heading style={{ fontSize: 18 }}>{staff.full_name}</Heading>
          <Row style={{ marginTop: 2 }}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Muted>
              {staff.rating ? `${staff.rating} · ` : ''}
              {staff.experience_years} yrs experience
            </Muted>
          </Row>
        </View>
      </Row>
      <Badge
        label={verified ? `Agency verified · ${formatDate(staff.verified_at)}` : 'Verification in progress'}
        tone={verified ? 'green' : 'orange'}
        icon={verified ? 'shield-checkmark' : 'shield-outline'}
      />
      {staff.bio ? <Body>{staff.bio}</Body> : null}
      {staff.languages?.length ? <KeyValue label="Languages" value={staff.languages.join(', ')} /> : null}
      {staff.skills?.length ? <KeyValue label="Skills" value={staff.skills.map((s) => s.replace(/_/g, ' ')).join(', ')} /> : null}
      {staff.agency_note ? (
        <View style={{ backgroundColor: colors.primarySoft, padding: space.md, borderRadius: radius.md }}>
          <Muted style={{ color: colors.primaryDark }}>Note from the agency: {staff.agency_note}</Muted>
        </View>
      ) : null}
    </View>
  );
}

export function Timeline({ events, audience }: { events: Tables<'booking_events'>[]; audience: 'customer' | 'agency' }) {
  return (
    <Card>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        const payment = e.kind === 'payment';
        return (
          <Row key={e.id} style={{ alignItems: 'flex-start', gap: space.md }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: last ? colors.primary : payment ? colors.greenSoft : colors.primarySoft,
                }}
              >
                <Ionicons
                  name={payment ? 'wallet' : last ? 'radio-button-on' : 'checkmark'}
                  size={13}
                  color={last ? '#fff' : payment ? colors.green : colors.primary}
                />
              </View>
              {!last ? <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: colors.line }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : space.md }}>
              <Strong style={{ fontSize: 14 }}>{payment ? 'Payment' : STATUS[e.to_status][audience]}</Strong>
              <Muted>
                {timeAgo(e.created_at)}
                {e.actor_role
                  ? ` · ${e.actor_role === 'customer' ? (audience === 'customer' ? 'you' : 'customer') : 'agency'}`
                  : ''}
              </Muted>
              {e.reason ? <Body style={{ fontSize: 14, marginTop: 2 }}>{e.reason}</Body> : null}
            </View>
          </Row>
        );
      })}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Payments + support (customer side)
// ---------------------------------------------------------------------------
export function PaymentCard({
  booking,
  support,
  onPaid,
}: {
  booking: BookingWithRefs;
  support: AgencySupport;
  onPaid: () => Promise<void> | void;
}) {
  const popup = usePopup();
  const amount = Number(booking.agreed_price ?? 0);

  if (booking.payment_status === 'paid') return null;

  if (booking.payment_status === 'pending_verification') {
    return (
      <Card tone="orange">
        <Row style={{ gap: space.md }}>
          <Icon3D name="hourglass" tone="orange" float />
          <View style={{ flex: 1 }}>
            <Strong>Verifying your payment</Strong>
            <Muted>Reference {booking.payment_reference}. The agency will confirm shortly.</Muted>
          </View>
        </Row>
      </Card>
    );
  }

  if (!support.upi_id) {
    return (
      <Card tone="primary">
        <Row style={{ gap: space.md }}>
          <Icon3D name="wallet" tone="primary" float />
          <View style={{ flex: 1 }}>
            <Strong>Payment due · {formatINR(amount)}</Strong>
            <Muted>{"Online payment isn't set up yet. The agency will collect payment and record it here."}</Muted>
          </View>
        </Row>
      </Card>
    );
  }

  async function openUpi() {
    if (!support.upi_id) return;
    const params = new URLSearchParams({
      pa: support.upi_id,
      pn: support.upi_payee_name ?? support.agency_name,
      am: amount.toFixed(2),
      cu: 'INR',
      tn: `${booking.reference} ManeMaid`,
    });
    await openLink(`upi://pay?${params.toString()}`, {
      info: popup.info,
      error: () =>
        popup.info({
          title: 'No UPI app found',
          message: `Copy the UPI ID ${support.upi_id} and pay from any UPI app.`,
          icon: 'phone-portrait',
        }),
    });
  }

  return (
    <Card tone="primary">
      <Row style={{ gap: space.md, marginBottom: space.md }}>
        <Icon3D name="wallet" tone="primary" float />
        <View style={{ flex: 1 }}>
          <Strong>Complete your payment</Strong>
          <Muted>Pay to unlock your dedicated agency support line.</Muted>
        </View>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Muted>Amount due</Muted>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink }}>{formatINR(amount)}</Text>
      </Row>
      {support.upi_id ? (
        <Row style={{ justifyContent: 'space-between', backgroundColor: colors.canvas, borderRadius: radius.md, padding: space.md, marginTop: space.md }}>
          <View>
            <Muted>UPI ID</Muted>
            <Strong>{support.upi_id}</Strong>
          </View>
          <Button
            small
            variant="secondary"
            icon="copy-outline"
            label="Copy"
            onPress={async () => {
              await Clipboard.setStringAsync(support.upi_id ?? '');
              tapFeedback();
              popup.success({ title: 'UPI ID copied', message: 'Paste it in GPay, PhonePe, Paytm or any UPI app.' });
            }}
          />
        </Row>
      ) : null}
      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Button label="Pay with a UPI app" icon="flash" onPress={openUpi} />
        <Button
          label="I've paid — submit reference"
          variant="secondary"
          icon="receipt-outline"
          onPress={() =>
            popup.confirm({
              title: 'Submit payment reference',
              message: 'Enter the UPI transaction ID (UTR) or bank reference so the agency can verify it.',
              icon: 'receipt',
              reason: 'required',
              reasonLabel: 'Transaction reference',
              reasonPlaceholder: 'e.g. 4321 8765 1234',
              confirmLabel: 'Submit',
              onConfirm: async (ref) => {
                unwrap(await supabase.rpc('submit_payment', { p_booking_id: booking.id, p_method: 'upi', p_reference: ref }));
                await onPaid();
              },
              success: { title: 'Payment submitted', message: 'We will verify it and unlock your support line.' },
            })
          }
        />
      </View>
    </Card>
  );
}

function SupportCentreLink() {
  return (
    <Button
      small
      variant="ghost"
      icon="chatbubbles-outline"
      label="Open support centre"
      style={{ alignSelf: 'flex-start', marginTop: space.sm }}
      onPress={() => router.push('/support')}
    />
  );
}

export function SupportCard({ support, showCentreLink = true }: { support: AgencySupport; showCentreLink?: boolean }) {
  const popup = usePopup();
  if (!support.unlocked) {
    return (
      <Card>
        <Row style={{ gap: space.md }}>
          <Icon3D name="lock-closed" tone="neutral" />
          <View style={{ flex: 1 }}>
            <Strong>Priority support</Strong>
            <Muted>Direct agency phone and WhatsApp unlock after your first payment is confirmed. You can raise a request any time.</Muted>
          </View>
        </Row>
        {showCentreLink ? <SupportCentreLink /> : null}
      </Card>
    );
  }
  const wa = support.whatsapp_phone ?? support.support_phone;
  if (!support.support_phone && !wa && !support.alternate_phone && !support.support_email) {
    return (
      <Card>
        <Row style={{ gap: space.md }}>
          <Icon3D name="headset" tone="green" />
          <View style={{ flex: 1 }}>
            <Strong>Priority support unlocked</Strong>
            <Muted>The agency is adding its support numbers. They will appear here shortly.</Muted>
          </View>
        </Row>
        {showCentreLink ? <SupportCentreLink /> : null}
      </Card>
    );
  }
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <LinearGradient colors={gradients.green} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.lg }}>
        <Row style={{ gap: space.md }}>
          <Icon3D name="headset" size={52} gradient={['#FFFFFF', '#DDF7EA']} float />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontFamily: fonts.heading, fontSize: 18 }}>{support.agency_name} support</Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body, fontSize: 13 }}>
              Quick response · {support.support_hours ?? 'Active support'}
            </Text>
          </View>
        </Row>
      </LinearGradient>
      <View style={{ padding: space.lg, gap: space.sm }}>
        {support.support_phone ? (
          <Button label={`Call +${support.support_phone}`} icon="call" onPress={() => openLink(`tel:+${support.support_phone}`, popup)} />
        ) : null}
        {wa ? (
          <Button label="Chat on WhatsApp" icon="logo-whatsapp" variant="success" onPress={() => openLink(`https://wa.me/${wa}`, popup)} />
        ) : null}
        <Row>
          {support.alternate_phone ? (
            <Button
              small
              style={{ flex: 1 }}
              variant="secondary"
              icon="call-outline"
              label="Alternate"
              onPress={() => openLink(`tel:+${support.alternate_phone}`, popup)}
            />
          ) : null}
          {support.support_email ? (
            <Button
              small
              style={{ flex: 1 }}
              variant="secondary"
              icon="mail-outline"
              label="Email"
              onPress={() => openLink(`mailto:${support.support_email}`, popup)}
            />
          ) : null}
        </Row>
        {showCentreLink ? (
          <Button variant="secondary" icon="chatbubbles-outline" label="Raise a priority request" onPress={() => router.push('/support/new')} />
        ) : null}
      </View>
    </Card>
  );
}
