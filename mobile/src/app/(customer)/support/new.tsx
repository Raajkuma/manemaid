import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { BookingWithRefs } from '@/components/booking';
import { usePopup } from '@/components/popup';
import { PRIORITY, TICKET_CATEGORIES, categoryMeta } from '@/components/support';
import { Card, ErrorState, Field, FieldLabel, Icon3D, Loading, Muted, Pressable3D, Row, Screen, Select, Strong, Button } from '@/components/ui';
import { errorFeedback } from '@/lib/feedback';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, radius, shadow, space } from '@/lib/theme';

const NONE = '__none__';

export default function NewSupportRequest() {
  const popup = usePopup();
  const params = useLocalSearchParams<{ booking?: string; category?: string }>();
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [bookingId, setBookingId] = useState<string>(params.booking ?? NONE);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ category?: string; subject?: string; message?: string }>({});

  const q = useLiveQuery(
    async () => {
      const [bookings, support] = await Promise.all([
        supabase.from('bookings').select('*, service_categories(name)').order('created_at', { ascending: false }).limit(20),
        supabase.rpc('get_agency_support'),
      ]);
      return { bookings: unwrap(bookings) as unknown as BookingWithRefs[], paid: !!(unwrap(support) as { unlocked?: boolean }).unlocked };
    },
    { key: 'support-new' },
  );

  const priority = category === 'safety' ? 'urgent' : q.data?.paid ? 'high' : 'normal';
  const p = PRIORITY[priority];

  function submit() {
    const e: typeof errors = {};
    if (!category) e.category = 'Choose what this is about';
    if (subject.trim().length < 3) e.subject = 'Add a short title';
    if (message.trim().length < 5) e.message = 'Tell us a little more';
    setErrors(e);
    if (Object.keys(e).length) {
      errorFeedback();
      return;
    }
    let ticketId = '';
    void popup
      .confirm({
        title: 'Send this request?',
        message: `${categoryMeta(category!).label} · ${p.label} support. We'll respond ${p.target}.`,
        icon: categoryMeta(category!).icon,
        tone: categoryMeta(category!).tone,
        confirmLabel: 'Send request',
        onConfirm: async () => {
          const t = unwrap(
            await supabase.rpc('create_support_ticket', {
              p_category: category!,
              p_subject: subject.trim(),
              p_message: message.trim(),
              p_booking_id: bookingId === NONE ? undefined : bookingId,
            }),
          );
          ticketId = t.id;
        },
        success: { title: 'Request sent', message: `Our team will respond ${p.target}.` },
      })
      .then((ok) => {
        if (ok && ticketId) router.replace(`/support/${ticketId}`);
      });
  }

  if (q.loading) return <Screen width="form" edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen width="form" edges={[]}><ErrorState message={q.error ?? 'Something went wrong'} onRetry={q.reload} /></Screen>;

  return (
    <Screen width="form" edges={[]} footer={<Button label="Review & send" icon="paper-plane" onPress={submit} />}>
      <FieldLabel label="What is this about?" required />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm, marginBottom: space.md }}>
        {TICKET_CATEGORIES.map((c, i) => {
          const active = category === c.key;
          return (
            <Pressable3D
              key={c.key}
              onPress={() => {
                setCategory(c.key);
                setErrors((x) => ({ ...x, category: undefined }));
              }}
              accessibilityLabel={c.label}
              accessibilityState={{ selected: active }}
              tilt={12}
              style={[
                {
                  width: '31.5%',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: space.md,
                  paddingHorizontal: 4,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : 'transparent',
                },
                shadow(active ? 2 : 1, active ? colors.primary : undefined),
              ]}
            >
              <Icon3D name={c.icon} tone={active ? c.tone : 'neutral'} size={40} delay={i * 40} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: active ? colors.primary : colors.ink, textAlign: 'center' }}>{c.label}</Text>
            </Pressable3D>
          );
        })}
      </View>
      {errors.category ? <Muted style={{ color: colors.danger, marginTop: -space.sm, marginBottom: space.md }}>{errors.category}</Muted> : null}

      {category ? (
        <Animated.View entering={FadeIn}>
          <Card tone={p.tone === 'neutral' ? undefined : p.tone} style={{ paddingVertical: space.md }}>
            <Row style={{ gap: space.md }}>
              <Icon3D name={p.icon} tone={p.tone} size={36} />
              <View style={{ flex: 1 }}>
                <Strong style={{ fontSize: 14 }}>
                  {p.label} support · response {p.target}
                </Strong>
                <Muted>{categoryMeta(category).hint}</Muted>
              </View>
            </Row>
          </Card>
          {category === 'safety' ? (
            <Card style={{ backgroundColor: colors.dangerSoft }}>
              <Muted style={{ color: colors.danger, fontSize: 14 }}>If you are in danger, call 112 now. We will also call you back immediately.</Muted>
            </Card>
          ) : null}
        </Animated.View>
      ) : null}

      <Select
        label="Related booking"
        value={bookingId}
        onChange={setBookingId}
        options={[
          { value: NONE, label: 'Not about a specific booking', icon: 'help-circle' },
          ...q.data.bookings.map((b) => ({
            value: b.id,
            label: `${b.service_categories?.name ?? b.category_code} · ${b.reference}`,
            description: b.status.replace(/_/g, ' '),
            icon: 'calendar' as const,
          })),
        ]}
      />
      <Field
        label="Title"
        required
        value={subject}
        onChangeText={(v) => {
          setSubject(v);
          setErrors((x) => ({ ...x, subject: undefined }));
        }}
        placeholder="e.g. Staff arrived 1 hour late"
        maxLength={120}
        error={errors.subject}
      />
      <Field
        label="Details"
        required
        value={message}
        onChangeText={(v) => {
          setMessage(v);
          setErrors((x) => ({ ...x, message: undefined }));
        }}
        placeholder="What happened, when, and what would help?"
        multiline
        maxLength={2000}
        error={errors.message}
      />
    </Screen>
  );
}
