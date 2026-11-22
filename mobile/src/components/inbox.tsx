import { router } from 'expo-router';
import { View } from 'react-native';

import { timeAgo } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space, type Tone } from '@/lib/theme';

import { usePopup } from './popup';
import { Body, Button, Card, EmptyState, ErrorState, Hero, HeroAction, Icon3D, Loading, Muted, Row, Screen, Strong, type IconName } from './ui';

function iconFor(title: string): { icon: IconName; tone: Tone } {
  const t = title.toLowerCase();
  if (t.includes('urgent')) return { icon: 'flash', tone: 'danger' };
  if (t.includes('support') || t.startsWith('sr-')) return { icon: 'chatbubbles', tone: 'blue' };
  if (t.includes('payment')) return { icon: 'wallet', tone: 'green' };
  if (t.includes('quotation') || t.includes('quote')) return { icon: 'document-text', tone: 'orange' };
  if (t.includes('staff') || t.includes('proposed')) return { icon: 'person', tone: 'blue' };
  if (t.includes('cancel') || t.includes('unable')) return { icon: 'close-circle', tone: 'danger' };
  if (t.includes('confirmed') || t.includes('active') || t.includes('completed')) return { icon: 'checkmark-circle', tone: 'green' };
  return { icon: 'notifications', tone: 'primary' };
}

export function InboxScreen() {
  const { isAgency } = useSession();
  const popup = usePopup();
  const q = useLiveQuery(
    async () =>
      unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)),
    { key: 'inbox', tables: ['notifications'] },
  );

  const unread = q.data?.filter((n) => !n.read_at).length ?? 0;

  async function open(id: string, bookingId: string | null, ticketId: string | null) {
    await supabase.rpc('mark_notifications_read', { p_ids: [id] });
    if (ticketId) router.push(isAgency ? `/ticket/${ticketId}` : `/support/${ticketId}`);
    else if (bookingId) router.push(isAgency ? `/manage/${bookingId}` : `/booking/${bookingId}`);
  }

  return (
    <Screen
      // "Mark all as read" would sit on the gradient; cards alone can float over it.
      overlapHero={unread === 0}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      hero={
        <Hero
          eyebrow="Updates"
          title="Inbox"
          subtitle={unread ? `${unread} unread` : 'You are all caught up'}
          right={<HeroAction icon="notifications" size={52} count={unread} accessibilityLabel="Inbox" float />}
        />
      }
    >
      {unread > 0 ? (
        <Button
          small
          label="Mark all as read"
          variant="secondary"
          icon="checkmark-done"
          style={{ alignSelf: 'flex-start', marginBottom: space.md }}
          onPress={async () => {
            const { error } = await supabase.rpc('mark_notifications_read', {});
            if (error) popup.error('Could not update', error);
            void q.reload();
          }}
        />
      ) : null}
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !q.data?.length ? (
        <EmptyState icon="notifications" title="No notifications yet" body="Booking updates will appear here." />
      ) : (
        q.data.map((n, i) => {
          const { icon, tone } = iconFor(n.title);
          return (
            <Card key={n.id} index={i} onPress={() => open(n.id, n.booking_id, n.ticket_id)} accessibilityLabel={n.title} style={!n.read_at ? { backgroundColor: '#FBFAFF' } : undefined}>
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
                <Icon3D name={icon} tone={tone} size={42} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Strong style={{ fontSize: 15, flex: 1 }} numberOfLines={1}>
                      {n.title}
                    </Strong>
                    {!n.read_at ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                  </Row>
                  <Body style={{ fontSize: 14 }}>{n.body}</Body>
                  <Muted>{timeAgo(n.created_at)}</Muted>
                </View>
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
