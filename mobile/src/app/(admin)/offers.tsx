import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { offerImageUrl } from '@/components/offers';
import { usePopup } from '@/components/popup';
import { Badge, Button, Card, Chip, ChipGroup, EmptyState, ErrorState, Icon3D, Loading, Muted, Pressable3D, Row, Screen, Strong } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { OFFER_AUDIENCE, STATUS_META, offerStatus, type Offer, type PromoStatus } from '@/lib/promotions';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, gradients, space } from '@/lib/theme';

type Filter = 'all' | PromoStatus;

export default function AgencyOffers() {
  const popup = usePopup();
  const [filter, setFilter] = useState<Filter>('all');
  const q = useLiveQuery(
    async () => {
      const [offers, claims, cats] = await Promise.all([
        supabase.from('offers').select('*').order('sort_order').order('created_at', { ascending: false }),
        supabase.from('bookings').select('offer_id').not('offer_id', 'is', null),
        supabase.from('service_categories').select('code, name'),
      ]);
      const counts: Record<string, number> = {};
      for (const b of unwrap(claims)) if (b.offer_id) counts[b.offer_id] = (counts[b.offer_id] ?? 0) + 1;
      return {
        offers: unwrap(offers) as Offer[],
        counts,
        names: Object.fromEntries(unwrap(cats).map((c) => [c.code, c.name])) as Record<string, string>,
      };
    },
    { key: 'agency-offers', tables: ['offers', 'bookings'] },
  );

  const all = q.data?.offers ?? [];
  const count = (s: PromoStatus) => all.filter((o) => offerStatus(o) === s).length;
  const list = filter === 'all' ? all : all.filter((o) => offerStatus(o) === filter);

  async function toggle(o: Offer) {
    const { error } = await supabase.from('offers').update({ active: !o.active }).eq('id', o.id);
    if (error) popup.error('Could not update', error);
    void q.reload();
  }

  return (
    <Screen
      edges={[]}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="New offer" icon="add" onPress={() => router.push('/offer-form')} />}
    >
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name="pricetag" tone="orange" float />
        <Muted style={{ flex: 1, fontSize: 14 }}>
          Offers appear in “Offers for you” on the customer Home screen. Customers see changes the next time they open or refresh Home.
        </Muted>
      </Row>

      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !all.length ? (
        <EmptyState icon="pricetag" tone="orange" title="No offers yet" body="Create your first offer — for example a welcome discount for new customers." />
      ) : (
        <>
          <ChipGroup>
            <Chip label={`All · ${all.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
            {(['live', 'scheduled', 'hidden', 'ended'] as PromoStatus[]).map((s) => (
              <Chip key={s} label={`${STATUS_META[s].label} · ${count(s)}`} selected={filter === s} onPress={() => setFilter(s)} />
            ))}
          </ChipGroup>
          {list.length === 0 ? <EmptyState icon="pricetag" title="Nothing here" body="No offers match this filter." /> : null}
          {list.map((o, i) => {
            const st = STATUS_META[offerStatus(o)];
            const img = offerImageUrl(o.image_path);
            const claims = q.data!.counts[o.id] ?? 0;
            return (
              <Card key={o.id} index={i} style={{ padding: 0, overflow: 'hidden', opacity: o.active ? 1 : 0.75 }}>
                <Pressable3D tilt={3} onPress={() => router.push({ pathname: '/offer-form', params: { id: o.id } })} accessibilityLabel={`Edit ${o.title}`}>
                  <View style={{ aspectRatio: 16 / 9 }}>
                    {img ? (
                      <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <LinearGradient colors={gradients.hero} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={34} color="rgba(255,255,255,0.75)" />
                      </LinearGradient>
                    )}
                    <View style={{ position: 'absolute', top: 10, left: 10 }}>
                      <Badge label={st.label} tone={st.tone} />
                    </View>
                  </View>
                  <View style={{ padding: space.md, gap: 4 }}>
                    <Strong>{o.title}</Strong>
                    <Muted numberOfLines={2}>{o.body}</Muted>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 }}>
                      {o.category_code ? (q.data!.names[o.category_code] ?? o.category_code) : 'Any service'} · {OFFER_AUDIENCE[o.audience]} ·{' '}
                      {formatDate(o.starts_at)} → {o.ends_at ? formatDate(o.ends_at) : 'no end'}
                    </Text>
                  </View>
                </Pressable3D>
                <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: space.md, paddingVertical: space.sm }}>
                  <Muted>
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{claims}</Text> {claims === 1 ? 'booking claimed this' : 'bookings claimed this'}
                  </Muted>
                  <Pressable3D onPress={() => void toggle(o)} accessibilityLabel={o.active ? `Hide ${o.title}` : `Show ${o.title}`} tilt={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 }}>
                    <Ionicons name={o.active ? 'eye-outline' : 'eye-off-outline'} size={18} color={o.active ? colors.primary : colors.muted} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: o.active ? colors.primary : colors.muted }}>{o.active ? 'Visible' : 'Hidden'}</Text>
                  </Pressable3D>
                </Row>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
