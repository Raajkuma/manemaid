import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { PRIORITY, TicketListItem, type Ticket, type TicketStatus } from '@/components/support';
import { Chip, ChipGroup, EmptyState, ErrorState, Grid, Hero, Icon3D, Loading, Pressable3D, Screen } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { fonts, radius, space } from '@/lib/theme';

type Row = Ticket & { profiles: { full_name: string | null; phone: string | null } | null };

const FILTERS: { key: string; label: string; statuses: TicketStatus[] }[] = [
  { key: 'active', label: 'Active', statuses: ['open', 'in_progress'] },
  { key: 'open', label: 'New / reopened', statuses: ['open'] },
  { key: 'progress', label: 'In progress', statuses: ['in_progress'] },
  { key: 'done', label: 'Resolved / closed', statuses: ['resolved', 'closed'] },
];
const RANK = { urgent: 0, high: 1, normal: 2 } as const;

export default function AgencyTickets() {
  const [filter, setFilter] = useState('active');
  const q = useLiveQuery(
    async () =>
      unwrap(
        await supabase
          .from('support_tickets')
          .select('*, profiles(full_name, phone)')
          .order('last_message_at', { ascending: false })
          .limit(200),
      ) as unknown as Row[],
    { key: 'agency-tickets', tables: ['support_tickets', 'ticket_messages'] },
  );

  const all = q.data ?? [];
  const active = all.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const f = FILTERS.find((x) => x.key === filter)!;
  // Urgent first, then priority customers, then oldest-waiting.
  const list = all
    .filter((t) => f.statuses.includes(t.status))
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.last_message_at.localeCompare(b.last_message_at));

  const tiles = [
    { key: 'urgent', label: 'Urgent', count: active.filter((t) => t.priority === 'urgent').length },
    { key: 'high', label: 'Priority', count: active.filter((t) => t.priority === 'high').length },
    { key: 'normal', label: 'Standard', count: active.filter((t) => t.priority === 'normal').length },
  ] as const;

  return (
    <Screen
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      hero={
        <Hero eyebrow="Customer care" title="Support" subtitle="Urgent and priority customers first.">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {tiles.map((t, i) => {
              const m = PRIORITY[t.key];
              return (
                <Pressable3D
                  key={t.key}
                  onPress={() => setFilter('active')}
                  accessibilityLabel={`${t.count} ${t.label}`}
                  tilt={8}
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.lg, padding: space.md, gap: 6 }}
                >
                  <Icon3D name={m.icon} tone={m.tone} size={34} delay={i * 80} />
                  <Text style={{ fontFamily: fonts.display, fontSize: 24, color: '#fff' }}>{t.count}</Text>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{t.label}</Text>
                </Pressable3D>
              );
            })}
          </View>
        </Hero>
      }
    >
      <ChipGroup>
        {FILTERS.map((x) => (
          <Chip
            key={x.key}
            label={`${x.label} · ${all.filter((t) => x.statuses.includes(t.status)).length}`}
            selected={filter === x.key}
            onPress={() => setFilter(x.key)}
          />
        ))}
      </ChipGroup>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : list.length === 0 ? (
        <EmptyState icon="happy" tone="green" title="No requests here" body="New customer requests appear instantly." />
      ) : (
        <Grid>
          {list.map((t, i) => (
          <TicketListItem
            key={t.id}
            ticket={t}
            index={i}
            subtitle={`${t.profiles?.full_name || 'Customer'}${t.is_priority_customer ? ' ⭐' : ''} · ${timeAgo(t.last_message_at)}`}
            onPress={() => router.push(`/ticket/${t.id}`)}
          />
          ))}
        </Grid>
      )}
    </Screen>
  );
}
