import { router } from 'expo-router';
import { useState } from 'react';

import { BookingListItem, type BookingWithRefs } from '@/components/booking';
import { Button, Chip, ChipGroup, EmptyState, ErrorState, Hero, Loading, Screen } from '@/components/ui';
import { TERMINAL } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';

export default function Bookings() {
  const [tab, setTab] = useState<'current' | 'past'>('current');
  const q = useLiveQuery(
    async () =>
      unwrap(
        await supabase
          .from('bookings')
          .select('*, customer_addresses(*), service_categories(name)')
          .order('created_at', { ascending: false }),
      ) as unknown as BookingWithRefs[],
    { key: 'my-bookings', tables: ['bookings'] },
  );

  const all = q.data ?? [];
  const current = all.filter((b) => !TERMINAL.includes(b.status));
  const past = all.filter((b) => TERMINAL.includes(b.status));
  const list = tab === 'past' ? past : current;

  return (
    <Screen
      overlapHero={false}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      hero={<Hero eyebrow="Your services" title="Bookings" subtitle={`${current.length} current · ${past.length} past`} />}
    >
      <ChipGroup>
        <Chip label={`Current (${current.length})`} icon="time-outline" selected={tab === 'current'} onPress={() => setTab('current')} />
        <Chip label={`Past (${past.length})`} icon="archive-outline" selected={tab === 'past'} onPress={() => setTab('past')} />
      </ChipGroup>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === 'current' ? 'calendar' : 'archive'}
          title={tab === 'current' ? 'No current bookings' : 'No past bookings'}
          body={tab === 'current' ? 'Request a service and the agency will send you a quotation.' : undefined}
          action={tab === 'current' ? <Button label="Request a service" icon="add" onPress={() => router.push('/new-request')} /> : undefined}
        />
      ) : (
        list.map((b, i) => (
          <BookingListItem key={b.id} index={i} booking={b} audience="customer" onPress={() => router.push(`/booking/${b.id}`)} />
        ))
      )}
    </Screen>
  );
}
