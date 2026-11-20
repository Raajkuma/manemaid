import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { SupportCard, type AgencySupport } from '@/components/booking';
import { PRIORITY, TicketListItem, type Ticket } from '@/components/support';
import { Badge, Button, Card, EmptyState, ErrorState, Hero, Icon3D, Loading, Muted, Row, Screen, SectionTitle, Strong } from '@/components/ui';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

export default function SupportCentre() {
  const q = useLiveQuery(
    async () => {
      const [tickets, support] = await Promise.all([
        supabase.from('support_tickets').select('*').order('last_message_at', { ascending: false }),
        supabase.rpc('get_agency_support'),
      ]);
      return { tickets: unwrap(tickets) as Ticket[], support: unwrap(support) as unknown as AgencySupport };
    },
    { key: 'support-centre', tables: ['support_tickets'] },
  );

  const priority = !!q.data?.support.unlocked;
  const open = (q.data?.tickets ?? []).filter((t) => t.status === 'open' || t.status === 'in_progress');
  const past = (q.data?.tickets ?? []).filter((t) => t.status === 'resolved' || t.status === 'closed');

  return (
    <Screen
      edges={[]}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="Raise a support request" icon="add-circle" onPress={() => router.push('/support/new')} />}
      hero={
        <Hero
          underHeader
          eyebrow="Help & support"
          title={priority ? 'Priority support' : 'Support centre'}
          subtitle={priority ? 'You are a priority customer — we respond within 4 hours.' : 'We are here to help, every day.'}
          right={<Icon3D name={priority ? 'star' : 'headset'} size={56} gradient={priority ? ['#FFE7A3', '#F5B83D'] : ['#FFFFFF', '#E4DEFF']} float />}
        />
      }
    >
      {q.loading ? (
        <Loading />
      ) : q.error || !q.data ? (
        <ErrorState message={q.error ?? 'Something went wrong'} onRetry={q.reload} />
      ) : (
        <>
          <Card index={0}>
            <Strong style={{ marginBottom: space.md }}>Response times</Strong>
            {(['urgent', 'high', 'normal'] as const).map((p) => {
              const m = PRIORITY[p];
              const yours = p === 'high' ? priority : p === 'normal' ? !priority : false;
              return (
                <Row key={p} style={{ gap: space.md, paddingVertical: 6 }}>
                  <Icon3D name={m.icon} tone={m.tone} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                      {p === 'urgent' ? 'Safety issues' : p === 'high' ? 'Priority customers' : 'Standard'}
                    </Text>
                    <Muted>Response {m.target}</Muted>
                  </View>
                  {yours ? <Badge label="You" tone="primary" /> : null}
                </Row>
              );
            })}
            {!priority ? (
              <Muted style={{ marginTop: space.sm, color: colors.primaryDark }}>
                Priority support with a direct phone and WhatsApp line unlocks after your first payment.
              </Muted>
            ) : null}
          </Card>

          <SupportCard support={q.data.support} showCentreLink={false} />

          <Card index={1} style={{ backgroundColor: colors.dangerSoft }}>
            <Row style={{ gap: space.md }}>
              <Icon3D name="warning" tone="danger" size={36} />
              <Muted style={{ flex: 1, color: colors.danger, fontSize: 13 }}>
                In an emergency, call 112 first. Then raise a Safety request so we can act immediately.
              </Muted>
            </Row>
          </Card>

          <SectionTitle>Open requests · {open.length}</SectionTitle>
          {open.length === 0 ? (
            <EmptyState icon="chatbubbles" title="No open requests" body="Raise a request any time — about a booking, staff, payment or anything else." />
          ) : (
            open.map((t, i) => <TicketListItem key={t.id} ticket={t} index={i} onPress={() => router.push(`/support/${t.id}`)} />)
          )}

          {past.length ? (
            <>
              <SectionTitle>Past requests</SectionTitle>
              {past.map((t, i) => (
                <TicketListItem key={t.id} ticket={t} index={i} onPress={() => router.push(`/support/${t.id}`)} />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
