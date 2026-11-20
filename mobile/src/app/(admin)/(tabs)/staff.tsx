import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, ChipGroup, EmptyState, ErrorState, Field, Hero, Icon3D, Loading, Muted, Pressable3D, Row, Screen, Strong } from '@/components/ui';
import { STAFF_STATUS } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'unverified', label: 'Needs verification' },
] as const;

export default function StaffList() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const q = useLiveQuery(
    async () => {
      const [staff, categories] = await Promise.all([
        supabase.from('staff').select('*').order('full_name'),
        supabase.from('service_categories').select('code, name'),
      ]);
      return {
        staff: unwrap(staff),
        names: Object.fromEntries(unwrap(categories).map((c) => [c.code, c.name])),
      };
    },
    { key: 'staff' },
  );

  const term = search.trim().toLowerCase();
  const list = (q.data?.staff ?? []).filter((s) => {
    if (filter === 'available' && s.status !== 'available') return false;
    if (filter === 'assigned' && s.status !== 'assigned') return false;
    if (filter === 'unverified' && s.verification_status === 'verified') return false;
    if (term && !`${s.full_name} ${s.code} ${s.phone ?? ''}`.toLowerCase().includes(term)) return false;
    return true;
  });

  return (
    <Screen
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      hero={
        <Hero
          eyebrow="Roster"
          title="Staff"
          subtitle={q.data ? `${q.data.staff.length} people · ${q.data.staff.filter((s) => s.status === 'available').length} available` : undefined}
          right={
            <Pressable3D onPress={() => router.push('/staff-form')} accessibilityLabel="Add staff member" tilt={14}>
              <Icon3D name="person-add" size={54} gradient={['#FFFFFF', '#E4DEFF']} float />
            </Pressable3D>
          }
        />
      }
    >
      <Field label="Search" icon="search" value={search} onChangeText={setSearch} placeholder="Name, code or phone" />
      <ChipGroup>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ChipGroup>
      <Button label="Add staff member" icon="person-add" onPress={() => router.push('/staff-form')} style={{ marginBottom: space.md }} />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !list.length ? (
        <EmptyState icon="people" title={term || filter !== 'all' ? 'No matches' : 'No staff yet'} body="Add your first staff member to start matching." />
      ) : (
        list.map((s, i) => {
          const st = STAFF_STATUS[s.status];
          const verified = s.verification_status === 'verified';
          return (
            <Card key={s.id} index={i} onPress={() => router.push(`/staff-profile/${s.id}`)} accessibilityLabel={`Open ${s.full_name}`}>
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
                <Avatar name={s.full_name} uri={photoUrl('staff-photos', s.photo_url)} size={56} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Strong style={{ flex: 1 }} numberOfLines={1}>
                      {s.full_name}
                    </Strong>
                    <Muted>{s.code}</Muted>
                  </Row>
                  <Muted numberOfLines={1}>
                    {s.categories.map((c) => q.data!.names[c] ?? c).join(', ') || 'No services yet'} · {s.experience_years} yrs
                  </Muted>
                  <Row style={{ marginTop: 4, flexWrap: 'wrap' }}>
                    <Badge label={st.label} tone={st.tone} />
                    <Badge
                      label={verified ? 'Verified' : 'Not verified'}
                      tone={verified ? 'green' : 'orange'}
                      icon={verified ? 'shield-checkmark' : 'shield-outline'}
                    />
                    {s.rating ? <Badge label={`${s.rating}`} tone="neutral" icon="star" /> : null}
                  </Row>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ alignSelf: 'center' }} />
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
