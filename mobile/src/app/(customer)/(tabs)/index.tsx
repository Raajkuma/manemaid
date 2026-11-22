import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BookingListItem, type BookingWithRefs } from '@/components/booking';
import { GreetingPopup } from '@/components/greeting';
import { OffersCarousel, type Offer } from '@/components/offers';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  Hero,
  Icon3D,
  Loading,
  Muted,
  Pressable3D,
  Row,
  Screen,
  SectionTitle,
  Strong,
  enter,
} from '@/components/ui';
import { useAppConfig } from '@/lib/config';
import { CATEGORY_ICON, TERMINAL } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, radius, shadow, space, type Tone } from '@/lib/theme';

const NEEDS_YOU = ['quotation_sent', 'staff_proposed'];
const TILE_TONES: Tone[] = ['primary', 'orange', 'green', 'blue', 'danger', 'primary'];
const WHY_STYLE: { icon: 'shield-checkmark' | 'thumbs-up' | 'headset' | 'sparkles'; tone: Tone }[] = [
  { icon: 'shield-checkmark', tone: 'green' },
  { icon: 'thumbs-up', tone: 'orange' },
  { icon: 'headset', tone: 'blue' },
  { icon: 'sparkles', tone: 'primary' },
];

export default function Home() {
  const { profile } = useSession();
  const config = useAppConfig();
  const q = useLiveQuery(
    async () => {
      const [categories, bookings, addresses, offers] = await Promise.all([
        supabase.from('service_categories').select('*').eq('active', true).order('sort_order'),
        supabase
          .from('bookings')
          .select('*, customer_addresses(*), service_categories(name)')
          .not('status', 'in', `(${TERMINAL.join(',')})`)
          .order('created_at', { ascending: false }),
        supabase.from('customer_addresses').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_my_offers'),
      ]);
      const cats = unwrap(categories);
      return {
        categories: cats,
        names: Object.fromEntries(cats.map((c) => [c.code, c.name])) as Record<string, string>,
        bookings: unwrap(bookings) as unknown as BookingWithRefs[],
        hasAddress: (addresses.count ?? 0) > 0,
        // Offers are a bonus: if they fail to load, the rest of Home still works.
        offers: (offers.error ? [] : (offers.data ?? [])) as Offer[],
      };
    },
    { key: 'home', tables: ['bookings', 'offers'] },
  );

  const firstName = profile?.full_name?.split(' ')[0];
  const needsYou =
    q.data?.bookings.filter(
      (b) => NEEDS_YOU.includes(b.status) || (['confirmed', 'active'].includes(b.status) && b.payment_status === 'unpaid'),
    ) ?? [];
  const ongoing = q.data?.bookings.filter((b) => !needsYou.includes(b)) ?? [];

  return (
    <Screen
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      hero={
        <Hero
          eyebrow="ManeMaid"
          title={firstName ? `Hi, ${firstName} 👋` : 'Welcome 👋'}
          subtitle={config.homeTagline}
          right={
            <Pressable3D onPress={() => router.push('/profile')} accessibilityLabel="Profile">
              <Avatar name={profile?.full_name || 'You'} uri={photoUrl('avatars', profile?.avatar_path)} size={52} ring />
            </Pressable3D>
          }
        />
      }
    >
      <GreetingPopup />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : (
        <>
          {!q.data?.hasAddress ? (
            <Card tone="primary" index={0}>
              <Row style={{ gap: space.md, marginBottom: space.md }}>
                <Icon3D name="location" float />
                <View style={{ flex: 1 }}>
                  <Strong>Add your home address</Strong>
                  <Muted>{"We'll check that we serve your area."}</Muted>
                </View>
              </Row>
              <Button label="Add address" icon="add" onPress={() => router.push('/address-form')} />
            </Card>
          ) : null}

          {needsYou.length ? (
            <>
              <SectionTitle>Needs your attention</SectionTitle>
              {needsYou.map((b, i) => (
                <BookingListItem key={b.id} index={i} booking={b} audience="customer" onPress={() => router.push(`/booking/${b.id}`)} />
              ))}
            </>
          ) : null}

          {config.offersEnabled && q.data?.offers.length ? (
            <>
              <SectionTitle>Offers for you</SectionTitle>
              <OffersCarousel offers={q.data.offers} names={q.data.names} />
            </>
          ) : null}

          <SectionTitle>Book a service</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md }}>
            {q.data?.categories.map((c, i) => (
              <Animated.View key={c.code} entering={enter(i)} style={{ width: '48%' }}>
                <Pressable3D
                  accessibilityLabel={`Book ${c.name}`}
                  tilt={10}
                  onPress={() => router.push({ pathname: '/new-request', params: { category: c.code } })}
                  style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, minHeight: 170 }, shadow(1)]}
                >
                  <Icon3D name={CATEGORY_ICON[c.code] ?? 'briefcase'} tone={TILE_TONES[i % TILE_TONES.length]} size={54} delay={i * 70} />
                  <Text style={{ color: colors.ink, fontFamily: fonts.heading, fontSize: 16 }}>{c.name}</Text>
                  <Muted numberOfLines={2}>{c.description}</Muted>
                </Pressable3D>
              </Animated.View>
            ))}
          </View>

          {ongoing.length ? (
            <>
              <SectionTitle>In progress</SectionTitle>
              {ongoing.map((b, i) => (
                <BookingListItem key={b.id} index={i} booking={b} audience="customer" onPress={() => router.push(`/booking/${b.id}`)} />
              ))}
            </>
          ) : null}

          <SectionTitle>Why ManeMaid</SectionTitle>
          {config.whyManeMaid.map((f, i) => {
            const style = WHY_STYLE[i % WHY_STYLE.length];
            const opensSupport = style.icon === 'headset' && config.supportTickets;
            return (
            <Card key={`${i}-${f.title}`} index={i} onPress={opensSupport ? () => router.push('/support') : undefined}>
              <Row style={{ gap: space.md }}>
                <Icon3D name={style.icon} tone={style.tone} size={44} />
                <View style={{ flex: 1 }}>
                  <Strong style={{ fontSize: 15 }}>{f.title}</Strong>
                  <Muted>{f.body}</Muted>
                </View>
              </Row>
            </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
