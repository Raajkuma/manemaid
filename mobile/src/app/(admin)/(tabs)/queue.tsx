import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { BookingListItem, type BookingWithRefs } from '@/components/booking';
import { Chip, ChipGroup, EmptyState, ErrorState, Hero, Icon3D, type IconName, Loading, Pressable3D, Screen } from '@/components/ui';
import type { BookingStatus } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { fonts, radius, space, type Tone } from '@/lib/theme';

type Group = { key: string; label: string; icon: IconName; tone: Tone; match: (b: BookingWithRefs) => boolean };

const has = (...s: BookingStatus[]) => (b: BookingWithRefs) => s.includes(b.status);

const GROUPS: Group[] = [
  { key: 'action', label: 'Needs action', icon: 'flash', tone: 'orange', match: has('enquiry_submitted', 'under_review', 'staff_matching') },
  {
    key: 'payments',
    label: 'Payments',
    icon: 'wallet',
    tone: 'green',
    match: (b) => b.payment_status === 'pending_verification' || (['confirmed', 'active'].includes(b.status) && b.payment_status === 'unpaid'),
  },
  { key: 'waiting', label: 'Waiting', icon: 'hourglass', tone: 'blue', match: has('quotation_sent', 'staff_proposed') },
  { key: 'live', label: 'Live', icon: 'sparkles', tone: 'primary', match: has('confirmed', 'active') },
  { key: 'closed', label: 'Closed', icon: 'archive', tone: 'neutral', match: has('completed', 'cancelled_by_customer', 'cancelled_by_agency', 'unable_to_serve') },
];

export default function Queue() {
  const [group, setGroup] = useState('action');
  const q = useLiveQuery(
    async () =>
      unwrap(
        await supabase
          .from('bookings')
          .select('*, customer_addresses(*), service_categories(name), profiles(full_name, phone, avatar_path)')
          .order('updated_at', { ascending: false })
          .limit(200),
      ) as unknown as BookingWithRefs[],
    { key: 'queue', tables: ['bookings'] },
  );

  const all = q.data ?? [];
  const counts = Object.fromEntries(GROUPS.map((g) => [g.key, all.filter(g.match).length]));
  const current = GROUPS.find((g) => g.key === group)!;
  const list = all.filter(current.match);

  return (
    <Screen
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      hero={
        <Hero eyebrow="ManeMaid agency" title="Work queue" subtitle="Everything that needs you, live.">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {GROUPS.slice(0, 3).map((g, i) => (
              <Pressable3D
                key={g.key}
                onPress={() => setGroup(g.key)}
                accessibilityLabel={g.label}
                tilt={12}
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.lg, padding: space.md, gap: 6 }}
              >
                <Icon3D name={g.icon} tone={g.tone} size={34} delay={i * 80} />
                <Text style={{ fontFamily: fonts.display, fontSize: 24, color: '#fff' }}>{counts[g.key] ?? 0}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{g.label}</Text>
              </Pressable3D>
            ))}
          </View>
        </Hero>
      }
    >
      <ChipGroup>
        {GROUPS.map((g) => (
          <Chip key={g.key} label={`${g.label} · ${counts[g.key] ?? 0}`} selected={group === g.key} onPress={() => setGroup(g.key)} />
        ))}
      </ChipGroup>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : list.length === 0 ? (
        <EmptyState icon="checkmark-done" tone="green" title="All clear" body="New enquiries appear here instantly." />
      ) : (
        list.map((b, i) => (
          <BookingListItem key={b.id} index={i} booking={b} audience="agency" onPress={() => router.push(`/manage/${b.id}`)} />
        ))
      )}
    </Screen>
  );
}
