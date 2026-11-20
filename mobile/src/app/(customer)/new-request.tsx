import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { usePopup } from '@/components/popup';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  ErrorState,
  Field,
  Heading,
  Icon3D,
  Loading,
  Muted,
  Pressable3D,
  Row,
  Screen,
  Strong,
  type IconName,
} from '@/components/ui';
import {
  CATEGORY_ICON,
  DAY_SHORT,
  ENGAGEMENT,
  formatDate,
  formatDays,
  formatTime,
  LANGUAGES,
  toISODate,
  type EngagementType,
} from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, radius, shadow, space, type Tone } from '@/lib/theme';

const START_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'];
const DURATIONS = [1, 2, 3, 4, 6, 8, 10];
const NO_TIME_WINDOW: EngagementType[] = ['live_in'];
const TONES: Tone[] = ['primary', 'orange', 'green', 'blue', 'danger', 'primary'];

function addHours(time: string, hours: number): string | null {
  const [h, m] = time.split(':').map(Number);
  const end = h + hours;
  if (end > 23) return null;
  return `${String(end).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Step({ n, icon, title, children, tone = 'primary' }: { n: number; icon: IconName; title: string; children: ReactNode; tone?: Tone }) {
  return (
    <Card index={n}>
      <Row style={{ gap: space.md, marginBottom: space.md }}>
        <Icon3D name={icon} tone={tone} size={40} />
        <View>
          <Muted style={{ fontSize: 12 }}>STEP {n}</Muted>
          <Heading style={{ fontSize: 17 }}>{title}</Heading>
        </View>
      </Row>
      {children}
    </Card>
  );
}

export default function NewRequest() {
  const popup = usePopup();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState(params.category ?? 'home_care');
  const [engagement, setEngagement] = useState<EngagementType>('part_time');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toISODate(d);
  });
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(2);
  const [household, setHousehold] = useState('');
  const [rooms, setRooms] = useState('');
  // Empty = no preference ("Any"). Several languages can be picked.
  const [languages, setLanguages] = useState<string[]>([]);
  const toggleLanguage = (l: string) => setLanguages((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  const [trial, setTrial] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [addressId, setAddressId] = useState<string | null>(null);

  const q = useLiveQuery(
    async () => {
      const [cats, addresses, zones] = await Promise.all([
        supabase.from('service_categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('customer_addresses').select('*').order('is_default', { ascending: false }),
        supabase.from('service_zones').select('pincode').eq('active', true),
      ]);
      return {
        categories: unwrap(cats),
        addresses: unwrap(addresses),
        zones: new Set(unwrap(zones).map((z) => z.pincode)),
      };
    },
    { key: 'new-request' },
  );

  const nextDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d;
      }),
    [],
  );

  const addresses = q.data?.addresses ?? [];
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? addresses.find((a) => q.data?.zones.has(a.pincode));
  const needsTime = !NO_TIME_WINDOW.includes(engagement);
  const endTime = needsTime ? addHours(startTime, duration) : null;
  const categoryName = q.data?.categories.find((c) => c.code === category)?.name ?? category;

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  function submit() {
    if (!selectedAddress || !q.data?.zones.has(selectedAddress.pincode)) {
      popup.info({ title: 'Add a serviceable address', message: 'Please add or choose an address in an area we serve.', icon: 'location', tone: 'orange' });
      return;
    }
    if (!days.length) {
      popup.info({ title: 'Pick at least one day', icon: 'calendar', tone: 'orange' });
      return;
    }
    if (needsTime && !endTime) {
      popup.info({ title: 'Check the timing', message: 'That runs past midnight — pick an earlier start.', icon: 'time', tone: 'orange' });
      return;
    }
    let bookingId = '';
    void popup
      .confirm({
        title: `Request ${categoryName}?`,
        message: `${ENGAGEMENT[engagement]} · ${formatDays(days)}${needsTime ? ` · ${formatTime(startTime)}–${formatTime(endTime)}` : ''} from ${formatDate(startDate)}.\nNo payment now — the agency will send a quotation.`,
        icon: CATEGORY_ICON[category] ?? 'sparkles',
        confirmLabel: 'Submit request',
        onConfirm: async () => {
          const booking = unwrap(
            await supabase.rpc('submit_enquiry', {
              p_address_id: selectedAddress.id,
              p_category_code: category,
              p_engagement_type: engagement,
              p_start_date: startDate,
              p_days_of_week: days,
              p_time_start: needsTime ? startTime : undefined,
              p_time_end: needsTime && endTime ? endTime : undefined,
              p_hours_per_day: needsTime ? duration : undefined,
              p_household_size: household ? Number(household) : undefined,
              p_rooms: rooms ? Number(rooms) : undefined,
              p_language_prefs: languages,
              p_special_instructions: instructions.trim() || undefined,
              p_trial_requested: trial,
            }),
          );
          bookingId = booking.id;
        },
        success: { title: 'Request sent! 🎉', message: 'The agency will review it and send you a quotation.' },
      })
      .then((ok) => {
        if (ok && bookingId) router.replace(`/booking/${bookingId}`);
      });
  }

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error) return <Screen edges={[]}><ErrorState message={q.error} onRetry={q.reload} /></Screen>;

  return (
    <Screen
      edges={[]}
      footer={
        <>
          <Muted style={{ textAlign: 'center' }}>No payment now — you only pay after you approve your staff.</Muted>
          <Button label="Review & submit" icon="paper-plane" onPress={submit} />
        </>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingBottom: space.lg, paddingTop: 4 }}>
        {q.data?.categories.map((c, i) => {
          const active = category === c.code;
          return (
            <Pressable3D
              key={c.code}
              onPress={() => setCategory(c.code)}
              accessibilityLabel={c.name}
              accessibilityState={{ selected: active }}
              tilt={12}
              style={[
                { width: 110, alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2, borderColor: active ? colors.primary : 'transparent' },
                shadow(active ? 2 : 1, active ? colors.primary : undefined),
              ]}
            >
              <Icon3D name={CATEGORY_ICON[c.code] ?? 'briefcase'} tone={active ? TONES[i % TONES.length] : 'neutral'} size={50} delay={i * 60} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: active ? colors.primary : colors.ink, textAlign: 'center' }}>{c.name}</Text>
            </Pressable3D>
          );
        })}
      </ScrollView>

      <Step n={1} icon="briefcase" title="Engagement">
        <ChipGroup>
          {(Object.keys(ENGAGEMENT) as EngagementType[]).map((e) => (
            <Chip key={e} label={ENGAGEMENT[e]} selected={engagement === e} onPress={() => setEngagement(e)} />
          ))}
        </ChipGroup>
      </Step>

      <Step n={2} icon="calendar" title="When should we start?" tone="blue">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}>
          {nextDays.map((d) => {
            const iso = toISODate(d);
            const active = startDate === iso;
            return (
              <Pressable3D
                key={iso}
                onPress={() => setStartDate(iso)}
                accessibilityState={{ selected: active }}
                accessibilityLabel={formatDate(iso)}
                style={{ width: 58, paddingVertical: space.md, borderRadius: radius.md, alignItems: 'center', backgroundColor: active ? colors.primary : colors.canvas }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: active ? 'rgba(255,255,255,0.8)' : colors.muted }}>{DAY_SHORT[d.getDay()]}</Text>
                <Text style={{ fontFamily: fonts.display, fontSize: 20, color: active ? '#fff' : colors.ink }}>{d.getDate()}</Text>
              </Pressable3D>
            );
          })}
        </ScrollView>
        <Strong style={{ fontSize: 14, marginBottom: space.sm }}>Days of the week</Strong>
        <ChipGroup>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Chip key={d} label={DAY_SHORT[d]} selected={days.includes(d)} onPress={() => toggleDay(d)} />
          ))}
        </ChipGroup>
      </Step>

      {needsTime ? (
        <Step n={3} icon="time" title="Timing" tone="orange">
          <Strong style={{ fontSize: 14, marginBottom: space.sm }}>Start time</Strong>
          <ChipGroup>
            {START_TIMES.map((t) => (
              <Chip key={t} label={formatTime(t).replace(':00', '')} selected={startTime === t} onPress={() => setStartTime(t)} />
            ))}
          </ChipGroup>
          <Strong style={{ fontSize: 14, marginBottom: space.sm }}>Hours per visit</Strong>
          <ChipGroup>
            {DURATIONS.map((h) => (
              <Chip key={h} label={`${h} hr`} selected={duration === h} onPress={() => setDuration(h)} />
            ))}
          </ChipGroup>
          {endTime ? (
            <Muted>
              {formatTime(startTime)} – {formatTime(endTime)}
            </Muted>
          ) : (
            <Muted style={{ color: colors.danger }}>That runs past midnight — pick an earlier start.</Muted>
          )}
        </Step>
      ) : null}

      <Step n={needsTime ? 4 : 3} icon="home" title="Your home" tone="green">
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field label="People" icon="people-outline" value={household} onChangeText={(t) => setHousehold(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Rooms" icon="grid-outline" value={rooms} onChangeText={(t) => setRooms(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />
          </View>
        </Row>
        <Strong style={{ fontSize: 14 }}>Preferred languages</Strong>
        <Muted style={{ marginBottom: space.sm }}>Pick one or more. We will match staff who speak at least one of them.</Muted>
        <ChipGroup>
          <Chip label="Any" selected={languages.length === 0} onPress={() => setLanguages([])} />
          {LANGUAGES.map((l) => (
            <Chip key={l} label={l} selected={languages.includes(l)} onPress={() => toggleLanguage(l)} />
          ))}
        </ChipGroup>
        <Field
          label="Special instructions"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Duties, diet, pets, anything the agency should know"
          multiline
        />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Request a trial</Strong>
            <Muted>Try the staff member before committing.</Muted>
          </View>
          <Switch value={trial} onValueChange={setTrial} trackColor={{ true: colors.primary }} />
        </Row>
      </Step>

      <Step n={needsTime ? 5 : 4} icon="location" title="Address" tone="orange">
        {addresses.map((a) => {
          const ok = q.data?.zones.has(a.pincode);
          const selected = selectedAddress?.id === a.id;
          return (
            <Pressable3D
              key={a.id}
              disabled={!ok}
              onPress={() => setAddressId(a.id)}
              accessibilityState={{ selected, disabled: !ok }}
              accessibilityLabel={a.label}
              style={{
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.line,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                borderRadius: radius.md,
                padding: space.md,
                marginBottom: space.sm,
                opacity: ok ? 1 : 0.55,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Strong style={{ fontSize: 15 }}>{a.label}</Strong>
                {selected ? <Icon3D name="checkmark" size={26} /> : null}
              </Row>
              <Muted>{[a.flat_no, a.building, a.line1, `${a.city} ${a.pincode}`].filter(Boolean).join(', ')}</Muted>
              {!ok ? <Muted style={{ color: colors.orange, marginTop: 4 }}>Not serviceable yet</Muted> : null}
            </Pressable3D>
          );
        })}
        <Button label="Add new address" icon="add" variant="secondary" onPress={() => router.push('/address-form')} />
      </Step>
    </Screen>
  );
}
