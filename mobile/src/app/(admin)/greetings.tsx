import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { usePopup } from '@/components/popup';
import { Badge, Button, Card, EmptyState, ErrorState, Icon3D, Loading, Muted, Pressable3D, Row, Screen, Strong } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { GREETING_AUDIENCE, STATUS_META, greetingStatus, type Greeting } from '@/lib/promotions';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

export default function AgencyGreetings() {
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [greetings, seen] = await Promise.all([
        supabase.from('greetings').select('*').order('starts_on', { ascending: false }),
        supabase.from('greeting_deliveries').select('greeting_id'),
      ]);
      const counts: Record<string, number> = {};
      for (const d of unwrap(seen)) counts[d.greeting_id] = (counts[d.greeting_id] ?? 0) + 1;
      return { greetings: unwrap(greetings) as Greeting[], counts };
    },
    { key: 'agency-greetings', tables: ['greetings', 'greeting_deliveries'] },
  );

  async function toggle(g: Greeting) {
    const { error } = await supabase.from('greetings').update({ active: !g.active }).eq('id', g.id);
    if (error) popup.error('Could not update', error);
    void q.reload();
  }

  return (
    <Screen
      edges={[]}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="New greeting" icon="add" onPress={() => router.push('/greeting-form')} />}
    >
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name="gift" tone="primary" float />
        <Muted style={{ flex: 1, fontSize: 14 }}>
          Send festival and celebration wishes. Customers see a greeting pop-up once, the first time they open the app on those days.
        </Muted>
      </Row>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !q.data?.greetings.length ? (
        <EmptyState icon="gift" title="No greetings yet" body="Wish your customers for Diwali, Pongal, New Year and more." />
      ) : (
        q.data.greetings.map((g, i) => {
          const st = STATUS_META[greetingStatus(g)];
          const seen = q.data!.counts[g.id] ?? 0;
          return (
            <Card key={g.id} index={i} style={{ opacity: g.active ? 1 : 0.75 }}>
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
                <Pressable3D style={{ flex: 1 }} tilt={4} onPress={() => router.push({ pathname: '/greeting-form', params: { id: g.id } })} accessibilityLabel={`Edit ${g.title}`}>
                  <View style={{ gap: 4 }}>
                    <Row style={{ flexWrap: 'wrap' }}>
                      <Badge label={st.label} tone={st.tone} />
                      {g.push_to_inbox ? <Badge label="Inbox" tone="neutral" icon="mail-outline" /> : null}
                    </Row>
                    <Strong>🎉 {g.title}</Strong>
                    <Muted numberOfLines={2}>{g.message}</Muted>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>
                      {formatDate(g.starts_on)}{g.ends_on !== g.starts_on ? ` → ${formatDate(g.ends_on)}` : ''} · {GREETING_AUDIENCE[g.audience]}
                    </Text>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>
                      Seen by <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{seen}</Text> {seen === 1 ? 'customer' : 'customers'}
                    </Text>
                  </View>
                </Pressable3D>
                <Pressable3D onPress={() => void toggle(g)} accessibilityLabel={g.active ? `Hide ${g.title}` : `Show ${g.title}`} tilt={6} style={{ padding: 6 }}>
                  <Ionicons name={g.active ? 'eye-outline' : 'eye-off-outline'} size={20} color={g.active ? colors.primary : colors.muted} />
                </Pressable3D>
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
