import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { Pressable3D, enter } from '@/components/ui';
import type { Tables } from '@/lib/database.types';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, gradients, radius, shadow, space } from '@/lib/theme';

export type Offer = Tables<'offers'>;

/** Public URL of an offer banner stored in the `offer-images` bucket. */
export function offerImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?|file|data):/.test(path)) return path;
  return supabase.storage.from('offer-images').getPublicUrl(path).data.publicUrl;
}

export function OfferChips({ offer, serviceName }: { offer: Offer; serviceName?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {serviceName ? (
        <Text style={{ backgroundColor: colors.primarySoft, color: colors.primary, fontFamily: fonts.bold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' }}>
          {serviceName}
        </Text>
      ) : null}
      <Text style={{ backgroundColor: colors.orangeSoft, color: colors.orange, fontFamily: fonts.bold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' }}>
        {offer.ends_at ? `Ends ${formatDate(offer.ends_at)}` : 'No end date'}
      </Text>
    </View>
  );
}

/** Same layout as the preview in the web portal (portal/src/components/OfferPreview.tsx). */
export function OfferBanner({ offer, serviceName, width, index = 0 }: { offer: Offer; serviceName?: string | null; width: number; index?: number }) {
  const img = offerImageUrl(offer.image_path);
  return (
    <Animated.View entering={enter(index)} style={{ width }}>
      <Pressable3D
        tilt={6}
        accessibilityLabel={`Offer: ${offer.title}`}
        onPress={() => router.push(`/offer/${offer.id}`)}
        style={[{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' }, shadow(2)]}
      >
        <View style={{ aspectRatio: 16 / 9 }}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          ) : (
            <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={40} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          )}
          <Text style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', color: colors.primary, fontFamily: fonts.bold, fontSize: 11, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }}>
            OFFER
          </Text>
        </View>
        <View style={{ padding: space.md, gap: 6 }}>
          <Text numberOfLines={2} style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink }}>
            {offer.title}
          </Text>
          <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted }}>
            {offer.body}
          </Text>
          <OfferChips offer={offer} serviceName={serviceName} />
        </View>
      </Pressable3D>
    </Animated.View>
  );
}

/** Horizontal, swipeable list of offers for the customer Home screen. */
export function OffersCarousel({ offers, names }: { offers: Offer[]; names: Record<string, string> }) {
  const { width } = useWindowDimensions();
  // Show a hint of the next card so people know they can swipe.
  const cardWidth = Math.min(offers.length > 1 ? width * 0.78 : width - space.lg * 2, 420);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + space.md}
      decelerationRate="fast"
      style={{ marginHorizontal: -space.lg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.sm }}
      accessibilityLabel="Offers"
    >
      {offers.map((o, i) => (
        <OfferBanner key={o.id} offer={o} index={i} width={cardWidth} serviceName={o.category_code ? names[o.category_code] : null} />
      ))}
    </ScrollView>
  );
}

/** Small "Offer claimed: …" pill used on bookings. */
export function OfferClaimPill({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.orangeSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Ionicons name="pricetag" size={13} color={colors.orange} />
      <Text numberOfLines={1} style={{ color: colors.orange, fontFamily: fonts.bold, fontSize: 12, flexShrink: 1 }}>
        Offer: {title}
      </Text>
    </View>
  );
}
