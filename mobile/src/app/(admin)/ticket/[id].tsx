import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { usePopup } from '@/components/popup';
import {
  PRIORITY,
  TICKET_STATUS,
  TicketComposer,
  TicketThread,
  categoryMeta,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from '@/components/support';
import { Avatar, Badge, Button, Card, ErrorState, Heading, Icon3D, Loading, Muted, Row, Screen, Select, Strong } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { openLink } from '@/lib/links';
import { photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { space, type Tone } from '@/lib/theme';

type Full = Ticket & {
  profiles: { full_name: string | null; phone: string | null; avatar_path: string | null } | null;
  bookings: { reference: string } | null;
};

const STATUS_ACTIONS: Record<TicketStatus, { to: TicketStatus; label: string; icon: 'play' | 'checkmark-done' | 'archive' | 'refresh'; variant: 'primary' | 'success' | 'secondary'; tone: Tone }[]> = {
  open: [
    { to: 'in_progress', label: 'Start working on it', icon: 'play', variant: 'primary', tone: 'primary' },
    { to: 'resolved', label: 'Mark resolved', icon: 'checkmark-done', variant: 'success', tone: 'green' },
  ],
  in_progress: [{ to: 'resolved', label: 'Mark resolved', icon: 'checkmark-done', variant: 'success', tone: 'green' }],
  resolved: [
    { to: 'closed', label: 'Close request', icon: 'archive', variant: 'secondary', tone: 'neutral' },
    { to: 'open', label: 'Reopen', icon: 'refresh', variant: 'secondary', tone: 'orange' },
  ],
  closed: [{ to: 'open', label: 'Reopen', icon: 'refresh', variant: 'secondary', tone: 'orange' }],
};

export default function AgencyTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [ticket, messages] = await Promise.all([
        supabase.from('support_tickets').select('*, profiles(full_name, phone, avatar_path), bookings(reference)').eq('id', id).single(),
        supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at'),
      ]);
      return { ticket: unwrap(ticket) as unknown as Full, messages: unwrap(messages) };
    },
    { key: `agency-ticket:${id}`, tables: ['support_tickets', 'ticket_messages'] },
  );

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;

  const { ticket: t, messages } = q.data;
  const c = categoryMeta(t.category);
  const p = PRIORITY[t.priority];
  const s = TICKET_STATUS[t.status];
  const phone = t.profiles?.phone;

  function changeStatus(a: (typeof STATUS_ACTIONS)[TicketStatus][number]) {
    void popup.confirm({
      title: `${a.label}?`,
      message: a.to === 'resolved' ? 'Add a short note on how it was resolved. The customer will see it.' : 'The customer will be notified.',
      icon: a.icon,
      tone: a.tone,
      reason: a.to === 'resolved' ? 'required' : 'optional',
      reasonLabel: a.to === 'resolved' ? 'Resolution' : 'Note (optional)',
      confirmLabel: a.label,
      onConfirm: async (note) => {
        unwrap(await supabase.rpc('set_ticket_status', { p_ticket_id: t.id, p_status: a.to, p_note: note || undefined }));
        await q.reload();
      },
      success: { title: 'Request updated' },
    });
  }

  async function changePriority(v: string) {
    const { error } = await supabase.rpc('set_ticket_priority', { p_ticket_id: t.id, p_priority: v as TicketPriority });
    if (error) popup.error('Could not change priority', error);
    void q.reload();
  }

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh} footer={<TicketComposer ticketId={t.id} onSent={q.reload} placeholder="Reply to the customer…" />}>
      <Card index={0} tone={t.priority === 'urgent' && t.status !== 'closed' ? 'danger' : undefined}>
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
              {t.is_priority_customer ? <Badge label="Paying customer" tone="green" icon="star" /> : null}
            </Row>
            <Muted>Opened {formatDate(t.created_at)}</Muted>
          </View>
        </Row>
      </Card>

      <Card index={1}>
        <Row style={{ gap: space.md }}>
          <Avatar name={t.profiles?.full_name || 'Customer'} uri={photoUrl('avatars', t.profiles?.avatar_path)} size={46} />
          <View style={{ flex: 1 }}>
            <Strong>{t.profiles?.full_name || 'Customer'}</Strong>
            <Muted>{phone ? `+${phone}` : ''}</Muted>
          </View>
          {phone ? <Button small icon="call" label="Call" variant="secondary" onPress={() => openLink(`tel:+${phone}`, popup)} /> : null}
        </Row>
        {t.booking_id ? (
          <Button
            small
            variant="ghost"
            icon="calendar-outline"
            label={`Open booking ${t.bookings?.reference ?? ''}`}
            style={{ alignSelf: 'flex-start', marginTop: space.sm }}
            onPress={() => router.push(`/manage/${t.booking_id}`)}
          />
        ) : null}
      </Card>

      <Card index={2}>
        <Select
          label="Priority"
          value={t.priority}
          onChange={changePriority}
          options={(['urgent', 'high', 'normal'] as const).map((k) => ({
            value: k,
            label: PRIORITY[k].label,
            description: `Respond ${PRIORITY[k].target}`,
            icon: PRIORITY[k].icon,
          }))}
        />
        <View style={{ gap: space.sm }}>
          {STATUS_ACTIONS[t.status].map((a) => (
            <Button key={a.to} label={a.label} icon={a.icon} variant={a.variant} onPress={() => changeStatus(a)} />
          ))}
        </View>
      </Card>

      <TicketThread messages={messages} viewer="agency" />
    </Screen>
  );
}
