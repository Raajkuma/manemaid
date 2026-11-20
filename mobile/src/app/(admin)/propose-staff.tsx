import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { usePopup } from '@/components/popup';
import { Avatar, Badge, Card, EmptyState, ErrorState, Icon3D, Loading, Muted, Pressable3D, Row, Screen, Strong } from '@/components/ui';
import { useLiveQuery } from '@/lib/hooks';
import { photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { goBack } from '@/lib/navigation';

export default function ProposeStaff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [candidates, photos] = await Promise.all([
        supabase.rpc('staff_candidates', { p_booking_id: id }),
        supabase.from('staff').select('id, photo_url'),
      ]);
      return {
        candidates: unwrap(candidates),
        photos: Object.fromEntries(unwrap(photos).map((p) => [p.id, p.photo_url])),
      };
    },
    { key: `candidates:${id}` },
  );

  function propose(staffId: string, name: string) {
    void popup
      .confirm({
        title: `Propose ${name}?`,
        message: 'The customer will see their profile and must approve before the booking is confirmed.',
        icon: 'person-add',
        reason: 'optional',
        reasonLabel: 'Note for the customer (optional)',
        reasonPlaceholder: 'e.g. Great with North Indian cooking',
        confirmLabel: 'Propose',
        onConfirm: async (note) => {
          unwrap(await supabase.rpc('propose_staff', { p_booking_id: id, p_staff_id: staffId, p_note: note || undefined }));
        },
        success: { title: 'Proposal sent', message: 'The customer has been asked to approve.' },
      })
      .then((ok) => ok && goBack(`/manage/${id}`));
  }

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name="people" float />
        <Muted style={{ flex: 1, fontSize: 14 }}>
          Ranked by verification, availability, area and rating. Confirm availability with the worker before proposing.
        </Muted>
      </Row>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !q.data?.candidates.length ? (
        <EmptyState icon="people" title="No staff offer this service" body="Add staff with this service from the Staff tab." />
      ) : (
        q.data.candidates.map((c, i) => {
          const verified = c.verification_status === 'verified';
          const blocked = !verified || c.has_conflict || c.status === 'on_leave';
          return (
            // The card holds two separate buttons (propose / view profile) side by side:
            // a button inside a button is invalid on web and mis-routes clicks.
            <Card key={c.staff_id} index={i} style={blocked ? { opacity: 0.6 } : undefined}>
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
              <Pressable3D
                style={{ flex: 1 }}
                tilt={4}
                onPress={() =>
                blocked
                  ? popup.info({
                      title: `${c.full_name} can't be proposed`,
                      message: !verified ? 'Verify this staff member first.' : c.has_conflict ? 'They already have a booking at that time.' : 'They are on leave.',
                      icon: 'alert',
                      tone: 'orange',
                    })
                  : propose(c.staff_id, c.full_name)
              }
              accessibilityLabel={`Propose ${c.full_name}`}
            >
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
                <Avatar name={c.full_name} uri={photoUrl('staff-photos', q.data!.photos[c.staff_id])} size={54} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Strong>{c.full_name}</Strong>
                    <Muted>{c.code}</Muted>
                  </Row>
                  <Muted>
                    {c.experience_years} yrs · {c.languages.join(', ')}
                    {c.rating ? ` · ★ ${c.rating}` : ''}
                  </Muted>
                  <Row style={{ flexWrap: 'wrap', marginTop: 4 }}>
                    <Badge label={verified ? 'Verified' : 'Not verified'} tone={verified ? 'green' : 'danger'} icon={verified ? 'shield-checkmark' : 'shield-outline'} />
                    {c.has_conflict ? <Badge label="Schedule clash" tone="danger" icon="time" /> : null}
                    {c.status === 'on_leave' ? <Badge label="On leave" tone="orange" /> : null}
                    <Badge label={c.zone_match ? 'Same area' : 'Other area'} tone={c.zone_match ? 'primary' : 'neutral'} icon="location" />
                    {!c.language_match ? <Badge label="Language mismatch" tone="orange" /> : null}
                  </Row>
                </View>
              </Row>
              </Pressable3D>
                <Pressable3D onPress={() => router.push(`/staff-profile/${c.staff_id}`)} accessibilityLabel={`View ${c.full_name}`} style={{ padding: 4 }}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                </Pressable3D>
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
