import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { photoUrl } from '@/lib/storage';
import type { Greeting } from '@/lib/promotions';
import { supabase } from '@/lib/supabase';
import { colors, fonts, gradients, radius, shadow, space } from '@/lib/theme';

/** The festive card customers see. Also used as the live preview in the agency form. */
export function GreetingCard({ title, message, imagePath, onClose }: { title: string; message: string; imagePath: string | null; onClose?: () => void }) {
  const img = photoUrl('offer-images', imagePath);
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', width: '100%', maxWidth: 400 }, shadow(3)]}>
      <View style={{ aspectRatio: 16 / 9 }}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
          </LinearGradient>
        )}
      </View>
      <View style={{ padding: space.lg, gap: space.sm, alignItems: 'center' }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: 'center' }}>
          {title || 'Your greeting title'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft, textAlign: 'center' }}>
          {message || 'Your message to customers.'}
        </Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 }}>— Team ManeMaid</Text>
        {onClose ? <Button label="Thank you!" icon="heart" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: space.sm }} /> : null}
      </View>
    </View>
  );
}

/**
 * Customer Home: shows a live greeting once. Read (get_my_greetings) and mark-seen are
 * separate calls, so a double fetch can never use the greeting up before it is shown.
 * Failures are ignored — greetings are a bonus, never a blocker.
 */
export function GreetingPopup() {
  const [queue, setQueue] = useState<Greeting[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void supabase.rpc('get_my_greetings').then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        setQueue((cur) => (cur.length ? cur : (data as Greeting[])));
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const current = queue[0];
  const currentId = current?.id;
  // Mark it seen once it is actually on screen (also adds the Inbox item, once).
  useEffect(() => {
    if (!currentId) return;
    void supabase.rpc('mark_greeting_seen', { p_greeting_id: currentId }).then(() => undefined, () => undefined);
  }, [currentId]);

  if (!current) return null;
  const close = () => setQueue((q) => q.slice(1));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View entering={FadeIn.duration(200)} style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close greeting" />
        <Animated.View entering={ZoomIn.springify().damping(14)} style={{ width: '100%', alignItems: 'center' }}>
          <GreetingCard title={current.title} message={current.message} imagePath={current.image_path} onClose={close} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(27,31,59,0.6)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
});
