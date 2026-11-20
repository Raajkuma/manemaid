// Priority support building blocks shared by customer and agency screens.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Database, Tables } from '@/lib/database.types';
import { timeAgo } from '@/lib/format';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, radius, space, type Tone } from '@/lib/theme';

import { usePopup } from './popup';
import { Badge, Card, Icon3D, Muted, Pressable3D, Row, Strong, enter, type IconName } from './ui';

export type Ticket = Tables<'support_tickets'>;
export type TicketMessage = Tables<'ticket_messages'>;
export type TicketStatus = Database['public']['Enums']['ticket_status'];
export type TicketPriority = Database['public']['Enums']['ticket_priority'];

export const TICKET_CATEGORIES: { key: string; label: string; icon: IconName; tone: Tone; hint: string }[] = [
  { key: 'punctuality', label: 'Late arrival', icon: 'time', tone: 'orange', hint: 'Staff arrived late or left early' },
  { key: 'absence', label: 'No-show', icon: 'person-remove', tone: 'danger', hint: 'Staff did not come' },
  { key: 'quality', label: 'Work quality', icon: 'sparkles', tone: 'primary', hint: 'Work not done as agreed' },
  { key: 'behaviour', label: 'Behaviour', icon: 'chatbubbles', tone: 'blue', hint: 'Conduct or communication' },
  { key: 'replacement', label: 'Replacement', icon: 'swap-horizontal', tone: 'primary', hint: 'Request a different staff member' },
  { key: 'payment', label: 'Payment', icon: 'wallet', tone: 'green', hint: 'Billing or payment question' },
  { key: 'safety', label: 'Safety', icon: 'shield', tone: 'danger', hint: 'Anything that made you feel unsafe' },
  { key: 'privacy', label: 'Privacy', icon: 'lock-closed', tone: 'blue', hint: 'Your data or personal information' },
  { key: 'other', label: 'Something else', icon: 'help-circle', tone: 'neutral', hint: 'Any other question' },
];
export const categoryMeta = (key: string) => TICKET_CATEGORIES.find((c) => c.key === key) ?? TICKET_CATEGORIES[TICKET_CATEGORIES.length - 1];

export const PRIORITY: Record<TicketPriority, { label: string; tone: Tone; icon: IconName; target: string }> = {
  urgent: { label: 'Urgent', tone: 'danger', icon: 'flash', target: 'within 1 hour' },
  high: { label: 'Priority', tone: 'orange', icon: 'star', target: 'within 4 hours' },
  normal: { label: 'Standard', tone: 'neutral', icon: 'time', target: 'within 24 hours' },
};

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'blue' },
  in_progress: { label: 'In progress', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'green' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export function TicketListItem({
  ticket,
  index,
  onPress,
  subtitle,
}: {
  ticket: Ticket;
  index?: number;
  onPress: () => void;
  subtitle?: string;
}) {
  const c = categoryMeta(ticket.category);
  const p = PRIORITY[ticket.priority];
  const s = TICKET_STATUS[ticket.status];
  return (
    <Card index={index} onPress={onPress} accessibilityLabel={`${ticket.reference} ${ticket.subject}`} tone={ticket.priority === 'urgent' && ticket.status !== 'closed' && ticket.status !== 'resolved' ? 'danger' : undefined}>
      <Row style={{ alignItems: 'flex-start', gap: space.md }}>
        <Icon3D name={c.icon} tone={c.tone} size={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Strong style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
              {ticket.subject}
            </Strong>
            <Muted>{ticket.reference}</Muted>
          </Row>
          <Muted numberOfLines={1}>{subtitle ?? `${c.label} · updated ${timeAgo(ticket.last_message_at)}`}</Muted>
          <Row style={{ flexWrap: 'wrap', marginTop: 4 }}>
            <Badge label={s.label} tone={s.tone} />
            <Badge label={p.label} tone={p.tone} icon={p.icon} />
          </Row>
        </View>
      </Row>
    </Card>
  );
}

/** Conversation bubbles. `mine` is decided by the viewer's side (customer vs agency). */
export function TicketThread({ messages, viewer }: { messages: TicketMessage[]; viewer: 'customer' | 'agency' }) {
  return (
    <View style={{ gap: space.sm }}>
      {messages.map((m, i) => {
        const fromAgency = m.author_role !== 'customer';
        const mine = viewer === 'agency' ? fromAgency : !fromAgency;
        const system = m.body.startsWith('Marked ');
        if (system) {
          return (
            <Animated.View key={m.id} entering={enter(i)} style={{ alignItems: 'center', marginVertical: 4 }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, backgroundColor: colors.line, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' }}>
                {m.body} · {timeAgo(m.created_at)}
              </Text>
            </Animated.View>
          );
        }
        return (
          <Animated.View key={m.id} entering={enter(i)} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
            <View
              style={{
                maxWidth: '86%',
                backgroundColor: mine ? colors.primary : colors.surface,
                borderRadius: radius.lg,
                borderBottomRightRadius: mine ? 6 : radius.lg,
                borderBottomLeftRadius: mine ? radius.lg : 6,
                padding: space.md,
                borderWidth: mine ? 0 : 1,
                borderColor: colors.line,
              }}
            >
              {!mine ? (
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: fromAgency ? colors.primary : colors.orange, marginBottom: 2 }}>
                  {fromAgency ? 'ManeMaid support' : 'Customer'}
                </Text>
              ) : null}
              <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: mine ? '#fff' : colors.ink }}>{m.body}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, marginTop: 4, color: mine ? 'rgba(255,255,255,0.75)' : colors.muted, textAlign: 'right' }}>
                {timeAgo(m.created_at)}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Reply box with a send button. */
export function TicketComposer({ ticketId, onSent, disabled, placeholder }: { ticketId: string; onSent: () => void; disabled?: boolean; placeholder?: string }) {
  const popup = usePopup();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      unwrap(await supabase.rpc('reply_to_ticket', { p_ticket_id: ticketId, p_message: text.trim() }));
      setText('');
      onSent();
    } catch (e) {
      popup.error('Message not sent', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row style={{ alignItems: 'flex-end' }}>
      <TextInput
        value={text}
        onChangeText={setText}
        editable={!disabled}
        placeholder={disabled ? 'This request is closed' : (placeholder ?? 'Write a message…')}
        placeholderTextColor="#A6AABD"
        multiline
        accessibilityLabel="Message"
        style={{
          flex: 1,
          minHeight: 48,
          maxHeight: 120,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: colors.line,
          backgroundColor: colors.canvas,
          paddingHorizontal: space.md,
          paddingTop: 13,
          paddingBottom: 12,
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.ink,
        }}
      />
      <Pressable3D
        onPress={send}
        disabled={disabled || busy || !text.trim()}
        accessibilityLabel="Send message"
        tilt={14}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: text.trim() && !disabled ? colors.primary : colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={busy ? 'hourglass' : 'send'} size={20} color="#fff" />
      </Pressable3D>
    </Row>
  );
}
