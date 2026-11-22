import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { OfferChips, offerImageUrl, type Offer } from '@/components/offers';
import { Body, Button, Card, EmptyState, ErrorState, Heading, Loading, Muted, Screen, Strong } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, gradients, radius, space } from '@/lib/theme';

export default function OfferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useLiveQuery(
    async () => {
      const [offers, categories] = await Promise.all([
        supabase.rpc('get_my_offers'),
        supabase.from('service_categories').select('code, name').eq('active', true),
      ]);
      const list = (offers.error ? [] : (offers.data ?? [])) as Offer[];
      return { offer: list.find((o) => o.id === id) ?? null, categories: unwrap(categories) };
    },
    { key: `offer:${id}`, tables: ['bookings'] },
  );

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error) return <Screen edges={[]}><ErrorState message={q.error} onRetry={q.reload} /></Screen>;
  const o = q.data?.offer;
  if (!o) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="pricetag" title="This offer has ended" body="It's no longer available. Check the Home screen for current offers." />
        <Button label="Back to Home" icon="home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const service = o.category_code ? q.data!.categories.find((c) => c.code === o.category_code) : null;
  const img = offerImageUrl(o.image_path);

  return (
    <Screen
      edges={[]}
      footer={
        <Button
          label={service ? `Book ${service.name} with this offer` : 'Choose a service'}
          icon={service ? 'calendar' : 'grid'}
          onPress={() =>
            service
              ? router.push({ pathname: '/new-request', params: { category: service.code, offer: o.id } })
              : router.replace('/')
          }
        />
      }
    >
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 16 / 9, marginBottom: space.lg }}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={gradients.hero} style={{ flex: 1 }} />
        )}
      </View>
      <Heading style={{ fontSize: 24, marginBottom: space.sm }}>{o.title}</Heading>
      <OfferChips offer={o} serviceName={service?.name} />
      <Body style={{ marginTop: space.md, fontSize: 16, lineHeight: 24 }}>{o.body}</Body>

      <Card style={{ marginTop: space.lg }}>
        <Strong style={{ marginBottom: space.sm }}>How it works</Strong>
        <Muted>
          {service
            ? `Request ${service.name} with this offer. The agency sees it on your request and applies it in your quotation.`
            : 'Pick any service and mention this offer is applied: the agency sees it on your request and applies it in your quotation.'}
        </Muted>
        <Text style={{ marginTop: space.sm, fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>
          Valid {o.ends_at ? `until ${formatDate(o.ends_at)}` : 'until further notice'}
          {o.audience === 'new_customers' ? ' · for your first booking' : ''}
        </Text>
      </Card>

      {o.terms ? (
        <Card>
          <Strong style={{ marginBottom: space.sm }}>Terms</Strong>
          <Muted>{o.terms}</Muted>
        </Card>
      ) : null}
    </Screen>
  );
}
