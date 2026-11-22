import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useAppConfig } from '@/lib/config';
import { TERMINAL } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { photoUrl, pickAndUploadPhoto } from '@/lib/storage';
import { DEMO_MODE, demoSignIn, resetDemoData, supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, radius, shadow, space } from '@/lib/theme';

import { SupportCard, type AgencySupport } from './booking';
import { usePopup } from './popup';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Hero,
  Icon3D,
  Loading,
  MenuRow,
  Muted,
  Pressable3D,
  Row,
  Screen,
  SectionTitle,
  Strong,
  type IconName,
} from './ui';

/** Big avatar with camera badge + editable name, shown in the hero. */
function ProfileHeader() {
  const { profile, refreshProfile, isAgency } = useSession();
  const popup = usePopup();
  const [uploading, setUploading] = useState(false);

  async function changePhoto() {
    if (!profile) return;
    setUploading(true);
    try {
      const path = await pickAndUploadPhoto('avatars', profile.id);
      if (!path) return;
      unwrap(await supabase.from('profiles').update({ avatar_path: path }).eq('id', profile.id).select().single());
      await refreshProfile();
      popup.success({ title: 'Photo updated', message: 'Looking good!' });
    } catch (e) {
      popup.error('Could not update photo', e);
    } finally {
      setUploading(false);
    }
  }

  function editName() {
    if (!profile) return;
    void popup.confirm({
      title: 'Your name',
      message: 'This is how the agency will address you.',
      icon: 'person',
      reason: 'required',
      reasonLabel: 'Full name',
      reasonPlaceholder: 'e.g. Riya Malhotra',
      reasonInitial: profile.full_name ?? '',
      reasonSingleLine: true,
      reasonRequiredMessage: 'Please enter your name.',
      confirmLabel: 'Save',
      onConfirm: async (name) => {
        unwrap(await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', profile.id).select().single());
        await refreshProfile();
      },
      success: { title: 'Name saved' },
    });
  }

  return (
    <View style={{ alignItems: 'center', marginTop: space.sm }}>
      <Pressable3D onPress={changePhoto} accessibilityLabel="Change profile photo" tilt={12}>
        <Avatar name={profile?.full_name || 'You'} uri={photoUrl('avatars', profile?.avatar_path)} size={104} ring />
        <Animated.View
          entering={ZoomIn.delay(300).springify()}
          style={[
            {
              position: 'absolute',
              right: 0,
              bottom: 4,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: '#fff',
            },
            shadow(2),
          ]}
        >
          <Ionicons name={uploading ? 'hourglass' : 'camera'} size={16} color="#fff" />
        </Animated.View>
      </Pressable3D>
      <Pressable3D onPress={editName} accessibilityLabel="Edit name" style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: '#fff' }}>{profile?.full_name || 'Add your name'}</Text>
        <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.85)" />
      </Pressable3D>
      <Text style={{ fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
        {profile?.phone ? `+${profile.phone}` : ''} · {isAgency ? (profile?.role === 'admin' ? 'Agency admin' : 'Coordinator') : 'Customer'}
      </Text>
    </View>
  );
}

function Stat({ icon, value, label, tone }: { icon: IconName; value: number | string; label: string; tone: 'primary' | 'green' | 'orange' }) {
  return (
    <View style={[{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, alignItems: 'center', gap: 4 }, shadow(1)]}>
      <Icon3D name={icon} tone={tone} size={38} />
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{value}</Text>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
    </View>
  );
}

/** Demo build only: jump between the customer and agency views, or start over. */
function DemoControls({ current }: { current: 'customer' | 'agency' }) {
  const popup = usePopup();
  if (!DEMO_MODE) return null;
  const other = current === 'customer' ? 'agency' : 'customer';
  return (
    <>
      <SectionTitle>Demo</SectionTitle>
      <MenuRow
        icon={other === 'agency' ? 'business' : 'person'}
        tone="orange"
        title={other === 'agency' ? 'Switch to Agency view' : 'Switch to Customer view'}
        subtitle={other === 'agency' ? 'Handle requests, quotes, staff and payments' : 'Book services and approve staff'}
        onPress={() => void demoSignIn(other)}
        index={10}
      />
      <MenuRow
        icon="refresh"
        tone="danger"
        title="Reset demo data"
        subtitle="Start over with the sample bookings"
        index={11}
        onPress={() =>
          popup.confirm({
            title: 'Reset the demo?',
            message: 'All bookings, requests and changes made on this phone will be replaced with the sample data.',
            icon: 'refresh',
            destructive: true,
            confirmLabel: 'Reset',
            onConfirm: () => resetDemoData(),
          })
        }
      />
    </>
  );
}

function SignOutButton() {
  const { signOut } = useSession();
  const popup = usePopup();
  return (
    <Button
      label="Sign out"
      variant="danger"
      icon="log-out-outline"
      style={{ marginTop: space.xl }}
      onPress={() =>
        popup.confirm({
          title: 'Sign out?',
          message: 'You can sign back in any time with your phone number.',
          icon: 'log-out',
          destructive: true,
          confirmLabel: 'Sign out',
          onConfirm: () => signOut(),
        })
      }
    />
  );
}

export function CustomerProfileScreen() {
  const popup = usePopup();
  const config = useAppConfig();
  const q = useLiveQuery(
    async () => {
      const [addresses, bookings, support] = await Promise.all([
        supabase.from('customer_addresses').select('*').order('created_at', { ascending: true }),
        supabase.from('bookings').select('status, payment_status'),
        supabase.rpc('get_agency_support'),
      ]);
      return {
        addresses: unwrap(addresses),
        bookings: unwrap(bookings),
        support: unwrap(support) as unknown as AgencySupport,
      };
    },
    { key: 'customer-profile', tables: ['bookings'] },
  );

  const active = q.data?.bookings.filter((b) => !TERMINAL.includes(b.status)).length ?? 0;
  const done = q.data?.bookings.filter((b) => b.status === 'completed').length ?? 0;

  function removeAddress(id: string, label: string) {
    void popup.confirm({
      title: `Delete "${label}"?`,
      message: 'This address will be removed from your account.',
      icon: 'trash',
      destructive: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
        if (error) throw new Error(error.code === '23503' ? 'This address is used by a booking and cannot be deleted.' : error.message);
        await q.reload();
      },
      success: { title: 'Address deleted' },
    });
  }

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh} hero={<Hero title="" eyebrow="My profile"><ProfileHeader /></Hero>}>
      <Row style={{ gap: space.sm, marginBottom: space.md }}>
        <Stat icon="calendar" value={active} label="Active" tone="primary" />
        <Stat icon="checkmark-done" value={done} label="Completed" tone="green" />
        <Stat icon="location" value={q.data?.addresses.length ?? 0} label="Addresses" tone="orange" />
      </Row>

      {q.loading ? (
        <Loading />
      ) : (
        <>
          {q.data ? <SupportCard support={q.data.support} /> : null}

          <SectionTitle action={<Button small label="Add" icon="add" variant="ghost" onPress={() => router.push('/address-form')} />}>
            Saved addresses
          </SectionTitle>
          {!q.data?.addresses.length ? (
            <EmptyState icon="location" title="No addresses yet" body="Add where you need help." tone="orange" />
          ) : (
            q.data.addresses.map((a, i) => (
              <Card key={a.id} index={i}>
                <Row style={{ alignItems: 'flex-start', gap: space.md }}>
                  <Icon3D name={a.label === 'Work' ? 'briefcase' : a.label === 'Parents' ? 'people' : 'home'} tone="orange" size={42} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Strong>{a.label}</Strong>
                      {a.is_default ? <Badge label="Default" tone="primary" /> : null}
                    </Row>
                    <Muted>{[a.flat_no, a.building, a.line1, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(', ')}</Muted>
                  </View>
                  <Pressable3D onPress={() => removeAddress(a.id, a.label)} accessibilityLabel={`Delete ${a.label} address`} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable3D>
                </Row>
              </Card>
            ))
          )}
        </>
      )}

      <EmailOffersCard />

      <SectionTitle>Help & account</SectionTitle>
      {config.supportTickets ? (
      <MenuRow
        icon={q.data?.support.unlocked ? 'star' : 'headset'}
        tone={q.data?.support.unlocked ? 'orange' : 'green'}
        title={q.data?.support.unlocked ? 'Priority support' : 'Support centre'}
        subtitle={q.data?.support.unlocked ? 'Replies within 4 hours, plus a direct line' : 'Raise a request · replies within 24 hours'}
        right={q.data?.support.unlocked ? <Badge label="Priority" tone="orange" icon="star" /> : undefined}
        onPress={() => router.push('/support')}
        index={0}
      />
      ) : null}
      <MenuRow icon="document-text" tone="blue" title="Terms & privacy" subtitle="How we work, and how we protect your data" onPress={() => router.push('/legal')} index={1} />
      <DemoControls current="customer" />
      <SignOutButton />
    </Screen>
  );
}

export function AgencyAccountScreen() {
  return (
    <Screen hero={<Hero title="" eyebrow="Agency account"><ProfileHeader /></Hero>}>
      <SectionTitle>Agency tools</SectionTitle>
      <MenuRow icon="pricetag" tone="orange" title="Offers" subtitle="Post and schedule offers for customers" onPress={() => router.push('/offers')} index={0} />
      <MenuRow icon="gift" tone="primary" title="Greetings" subtitle="Festival and celebration wishes" onPress={() => router.push('/greetings')} index={1} />
      <MenuRow icon="business" title="Agency settings" subtitle="Support numbers, WhatsApp, hours and UPI ID" onPress={() => router.push('/agency-settings')} index={2} />
      <MenuRow icon="document-text" tone="orange" title="Scope templates" subtitle="Reusable scopes for quotations" onPress={() => router.push('/templates')} index={3} />
      <MenuRow icon="person-add" tone="green" title="Add staff member" subtitle="Photo, contacts, skills and verification" onPress={() => router.push('/staff-form')} index={4} />
      <MenuRow icon="chatbubbles" tone="blue" title="Support requests" subtitle="Customer requests, urgent first" onPress={() => router.push('/tickets')} index={5} />
      <MenuRow icon="document-text" tone="neutral" title="Terms & privacy" subtitle="What customers agree to" onPress={() => router.push('/legal')} index={6} />
      <Card index={7} style={{ backgroundColor: colors.primarySoft }}>
        <Muted style={{ color: colors.primaryDark }}>Service areas and categories can be edited in Supabase Studio.</Muted>
      </Card>
      <DemoControls current="agency" />
      <SignOutButton />
    </Screen>
  );
}


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Customer email + consent for offer emails (marketing_opt_in, recorded with a timestamp). */
function EmailOffersCard() {
  const { profile, refreshProfile } = useSession();
  const popup = usePopup();
  const [saving, setSaving] = useState(false);
  if (!profile) return null;
  const email = profile.email;

  function editEmail(thenOptIn = false) {
    void popup.confirm({
      title: email ? 'Your email' : 'Add your email',
      message: 'We use it to send booking updates and, if you agree, offers.',
      icon: 'mail',
      reason: 'required',
      reasonLabel: 'Email address',
      reasonPlaceholder: 'name@example.com',
      reasonInitial: email ?? '',
      reasonSingleLine: true,
      reasonKeyboard: 'email-address',
      reasonRequiredMessage: 'Please enter your email address.',
      reasonValidate: (t) => (EMAIL_RE.test(t) ? null : 'That does not look like an email address.'),
      confirmLabel: 'Save',
      onConfirm: async (value) => {
        const patch: { email: string; marketing_opt_in?: boolean } = { email: value.trim().toLowerCase() };
        if (thenOptIn) patch.marketing_opt_in = true;
        unwrap(await supabase.from('profiles').update(patch).eq('id', profile!.id).select().single());
        await refreshProfile();
      },
      success: { title: thenOptIn ? 'You will get our offers' : 'Email saved' },
    });
  }

  async function setOptIn(on: boolean) {
    if (on && !email) return editEmail(true);
    setSaving(true);
    try {
      unwrap(await supabase.from('profiles').update({ marketing_opt_in: on }).eq('id', profile!.id).select().single());
      await refreshProfile();
    } catch (e) {
      popup.error('Could not save', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionTitle>Email & offers</SectionTitle>
      <Card>
        <Pressable3D onPress={() => editEmail()} accessibilityLabel={email ? 'Change email' : 'Add email'} tilt={4}>
          <Row style={{ gap: space.md }}>
            <Icon3D name="mail" tone="blue" size={40} />
            <View style={{ flex: 1 }}>
              <Strong style={{ fontSize: 15 }}>{email ?? 'Add your email'}</Strong>
              <Muted>{email ? 'Tap to change' : 'For booking updates and offers'}</Muted>
            </View>
            <Ionicons name="create-outline" size={20} color={colors.muted} />
          </Row>
        </Pressable3D>
        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />
        <Row style={{ gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Send me offers by email</Strong>
            <Muted>New plans and discounts. You can turn this off any time.</Muted>
          </View>
          <Switch
            value={profile.marketing_opt_in}
            onValueChange={(v) => void setOptIn(v)}
            disabled={saving}
            trackColor={{ true: colors.primary, false: colors.line }}
            thumbColor="#fff"
            accessibilityLabel="Send me offers by email"
          />
        </Row>
      </Card>
    </>
  );
}
