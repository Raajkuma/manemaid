import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { usePopup } from '@/components/popup';
import { PRIORITY, TICKET_STATUS, TicketComposer, TicketThread, categoryMeta, type Ticket } from '@/components/support';
import { Badge, Button, Card, ErrorState, Heading, Icon3D, Loading, Muted, Row, Screen } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function CustomerTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [ticket, messages] = await Promise.all([
        supabase.from('support_tickets').select('*, bookings(reference)').eq('id', id).single(),
        supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at'),
      ]);
      return { ticket: unwrap(ticket) as unknown as Ticket & { bookings: { reference: string } | null }, messages: unwrap(messages) };
    },
    { key: `ticket:${id}`, tables: ['support_tickets', 'ticket_messages'] },
  );

  if (q.loading) return <Screen width="form" edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen width="form" edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;

  const { ticket: t, messages } = q.data;
  const c = categoryMeta(t.category);
  const p = PRIORITY[t.priority];
  const s = TICKET_STATUS[t.status];
  const closed = t.status === 'closed';
  const done = t.status === 'resolved' || closed;

  function setStatus(status: 'closed' | 'open') {
    void popup.confirm({
      title: status === 'closed' ? 'Close this request?' : 'Reopen this request?',
      message: status === 'closed' ? 'Glad we could help! You can always raise a new one.' : 'Tell us what still needs attention.',
      icon: status === 'closed' ? 'checkmark-done' : 'refresh',
      tone: status === 'closed' ? 'green' : 'orange',
      reason: status === 'open' ? 'required' : undefined,
      reasonLabel: 'What still needs attention?',
      confirmLabel: status === 'closed' ? 'Close request' : 'Reopen',
      onConfirm: async (note) => {
        unwrap(await supabase.rpc('set_ticket_status', { p_ticket_id: t.id, p_status: status, p_note: note || undefined }));
        await q.reload();
      },
      success: { title: status === 'closed' ? 'Request closed' : 'Request reopened' },
    });
  }

  return (
    <Screen width="form"
      edges={[]}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<TicketComposer ticketId={t.id} onSent={q.reload} disabled={closed} placeholder={done ? 'Reply to reopen this request…' : undefined} />}
    >
      <Card index={0}>
        <Row style={{ gap: space.md, alignItems: 'flex-start' }}>
          <Icon3D name={c.icon} tone={c.tone} size={50} />
          <View style={{ flex: 1, gap: 4 }}>
            <Muted>
              {t.reference} · {c.label}
            </Muted>
            <Heading style={{ fontSize: 18 }}>{t.subject}</Heading>
            <Row style={{ flexWrap: 'wrap' }}>
              <Badge label={s.label} tone={s.tone} />
              <Badge label={`${p.label} · ${p.target}`} tone={p.tone} icon={p.icon} />
            </Row>
            <Muted>
              Opened {formatDate(t.created_at)}
              {t.bookings ? ` · booking ${t.bookings.reference}` : ''}
            </Muted>
          </View>
        </Row>
        {t.booking_id ? (
          <Button small variant="ghost" icon="calendar-outline" label="Open booking" style={{ alignSelf: 'flex-start', marginTop: space.sm }} onPress={() => router.push(`/booking/${t.booking_id}`)} />
        ) : null}
      </Card>

      <TicketThread messages={messages} viewer="customer" />

      <View style={{ marginTop: space.lg, gap: space.sm }}>
        {t.status === 'resolved' ? (
          <Button label="Issue solved — close request" icon="checkmark-done" variant="success" onPress={() => setStatus('closed')} />
        ) : null}
        {done ? (
          <Button label="Reopen request" icon="refresh" variant="secondary" onPress={() => setStatus('open')} />
        ) : (
          <Button label="Close request" icon="close-circle-outline" variant="secondary" onPress={() => setStatus('closed')} />
        )}
      </View>
    </Screen>
  );
}
