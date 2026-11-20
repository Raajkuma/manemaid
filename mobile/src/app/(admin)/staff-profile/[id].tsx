import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { StatusBadge } from '@/components/booking';
import { usePopup } from '@/components/popup';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  Icon3D,
  KeyValue,
  Loading,
  Muted,
  Pressable3D,
  Row,
  Screen,
  SectionTitle,
  Strong,
  type IconName,
} from '@/components/ui';
import { CATEGORY_ICON, STAFF_STATUS, formatDate, type BookingStatus } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { openLink } from '@/lib/links';
import { photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, gradients, radius, space, type Tone } from '@/lib/theme';


const CONTACT_LABEL: Record<string, string> = { call: 'Phone call', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };

type AssignmentRow = {
  status: string;
  bookings: { id: string; reference: string; status: BookingStatus; category_code: string; service_categories: { name: string } | null } | null;
};

function QuickAction({ icon, label, tone, onPress, disabled }: { icon: IconName; label: string; tone: Tone; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable3D onPress={onPress} disabled={disabled} accessibilityLabel={label} tilt={14} style={{ flex: 1, alignItems: 'center', gap: 6, opacity: disabled ? 0.4 : 1 }}>
      <Icon3D name={icon} tone={tone} size={46} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>{label}</Text>
    </Pressable3D>
  );
}

export default function StaffProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [staff, categories, assignments, zones] = await Promise.all([
        supabase.from('staff').select('*').eq('id', id).single(),
        supabase.from('service_categories').select('code, name'),
        supabase
          .from('assignments')
          .select('status, bookings(id, reference, status, category_code, service_categories(name))')
          .eq('staff_id', id)
          .order('proposed_at', { ascending: false }),
        supabase.from('service_zones').select('pincode, area_name'),
      ]);
      return {
        staff: unwrap(staff),
        names: Object.fromEntries(unwrap(categories).map((c) => [c.code, c.name])),
        assignments: unwrap(assignments) as unknown as AssignmentRow[],
        zones: Object.fromEntries(unwrap(zones).map((z) => [z.pincode, z.area_name])),
      };
    },
    { key: `staff:${id}` },
  );

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;

  const { staff: s, names, assignments, zones } = q.data;
  const st = STAFF_STATUS[s.status];
  const verified = s.verification_status === 'verified';
  const wa = s.whatsapp_phone ?? s.phone;
  const open = (url: string) => openLink(url, popup);
  const live = assignments.filter((a) => a.status === 'approved' && a.bookings && ['confirmed', 'active'].includes(a.bookings.status));

  return (
    <Screen
      edges={[]}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="Edit staff details" icon="create" onPress={() => router.push({ pathname: '/staff-form', params: { id: s.id } })} />}
    >
      <Card style={{ padding: 0, overflow: 'hidden' }} index={0}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Avatar name={s.full_name} uri={photoUrl('staff-photos', s.photo_url)} size={104} ring />
          <Text style={{ fontFamily: fonts.display, fontSize: 24, color: '#fff', marginTop: space.md }}>{s.full_name}</Text>
          <Text style={{ fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)' }}>
            {s.code} · {s.experience_years} yrs experience{s.rating ? ` · ★ ${s.rating}` : ''}
          </Text>
          <Row style={{ marginTop: space.md }}>
            <View style={{ backgroundColor: '#fff', borderRadius: radius.pill }}>
              <Badge label={st.label} tone={st.tone} />
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: radius.pill }}>
              <Badge label={verified ? 'Verified' : `Verification ${s.verification_status.replace('_', ' ')}`} tone={verified ? 'green' : 'orange'} icon={verified ? 'shield-checkmark' : 'shield-outline'} />
            </View>
          </Row>
        </LinearGradient>
        <Row style={{ padding: space.lg, justifyContent: 'space-around' }}>
          <QuickAction icon="call" label="Call" tone="primary" disabled={!s.phone} onPress={() => open(`tel:+${s.phone}`)} />
          <QuickAction icon="logo-whatsapp" label="WhatsApp" tone="green" disabled={!wa} onPress={() => open(`https://wa.me/${wa}`)} />
          <QuickAction icon="chatbubble" label="SMS" tone="blue" disabled={!s.phone} onPress={() => open(`sms:+${s.phone}`)} />
          <QuickAction icon="mail" label="Email" tone="orange" disabled={!s.email} onPress={() => open(`mailto:${s.email}`)} />
        </Row>
      </Card>

      {s.bio ? (
        <Card index={1}>
          <Muted>About</Muted>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, lineHeight: 22 }}>{s.bio}</Text>
        </Card>
      ) : null}

      <SectionTitle>Contact</SectionTitle>
      <Card index={2}>
        <KeyValue label="Mobile" value={s.phone ? `+${s.phone}` : '—'} />
        <KeyValue label="Alternate" value={s.alternate_phone ? `+${s.alternate_phone}` : '—'} />
        <KeyValue label="WhatsApp" value={s.whatsapp_phone ? `+${s.whatsapp_phone}` : s.phone ? 'Same as mobile' : '—'} />
        <KeyValue label="Email" value={s.email || '—'} />
        <KeyValue label="Prefers" value={CONTACT_LABEL[s.preferred_contact] ?? s.preferred_contact} />
        <KeyValue label="Address" value={s.address || '—'} />
      </Card>

      <SectionTitle>Work</SectionTitle>
      <Card index={3}>
        <Row style={{ flexWrap: 'wrap', marginBottom: space.sm }}>
          {s.categories.map((c) => (
            <Badge key={c} label={names[c] ?? c} tone="primary" icon={CATEGORY_ICON[c]} />
          ))}
        </Row>
        <KeyValue label="Area" value={s.zone_pincode ? `${zones[s.zone_pincode] ?? ''} ${s.zone_pincode}` : '—'} />
        <KeyValue label="Languages" value={s.languages.join(', ') || '—'} />
        <KeyValue label="Skills" value={s.skills.map((x) => x.replace(/_/g, ' ')).join(', ') || '—'} />
        <KeyValue label="Verified on" value={s.verified_at ? formatDate(s.verified_at) : 'Not yet'} />
      </Card>

      <SectionTitle>Emergency contact</SectionTitle>
      <Card index={4}>
        <Row style={{ gap: space.md }}>
          <Icon3D name="medkit" tone="danger" size={40} />
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>{s.emergency_contact_name || 'Not added'}</Strong>
            <Muted>{s.emergency_contact_phone ? `+${s.emergency_contact_phone}` : 'Add one from Edit'}</Muted>
          </View>
          {s.emergency_contact_phone ? (
            <Button small variant="secondary" icon="call" label="Call" onPress={() => open(`tel:+${s.emergency_contact_phone}`)} />
          ) : null}
        </Row>
      </Card>

      <SectionTitle>Assignments · {live.length} live</SectionTitle>
      {assignments.length === 0 ? (
        <Card>
          <Muted>No assignments yet.</Muted>
        </Card>
      ) : (
        assignments.slice(0, 10).map((a, i) =>
          a.bookings ? (
            <Card key={`${a.bookings.id}-${i}`} index={i} onPress={() => router.push(`/manage/${a.bookings!.id}`)}>
              <Row style={{ gap: space.md }}>
                <Icon3D name={CATEGORY_ICON[a.bookings.category_code] ?? 'briefcase'} size={38} />
                <View style={{ flex: 1 }}>
                  <Strong style={{ fontSize: 15 }}>
                    {a.bookings.service_categories?.name} · {a.bookings.reference}
                  </Strong>
                  <Muted>Assignment {a.status}</Muted>
                </View>
                <StatusBadge status={a.bookings.status} audience="agency" />
              </Row>
            </Card>
          ) : null,
        )
      )}
    </Screen>
  );
}
