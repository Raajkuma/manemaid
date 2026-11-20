import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Field, Heading, Icon3D, Muted, Row } from '@/components/ui';
import { errorFeedback, successFeedback } from '@/lib/feedback';
import { errorMessage } from '@/lib/format';
import { useSession } from '@/lib/session';
import { DEMO_MODE, demoSignIn, supabase } from '@/lib/supabase';
import { colors, fonts, gradients, space } from '@/lib/theme';

const PERKS = [
  { icon: 'shield-checkmark', tone: 'green', label: 'Verified staff' },
  { icon: 'thumbs-up', tone: 'orange', label: 'You approve' },
  { icon: 'headset', tone: 'blue', label: 'Active support' },
] as const;

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { session, profileError, refreshProfile, signOut } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, '');
  const e164 = `+91${digits}`;

  async function sendCode() {
    if (digits.length !== 10) {
      setError('Enter your 10-digit mobile number');
      errorFeedback();
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (e) {
      errorFeedback();
      return setError(errorMessage(e));
    }
    successFeedback();
    setStep('code');
  }

  async function verify() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      errorFeedback();
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'sms' });
    setBusy(false);
    if (e) {
      errorFeedback();
      setError(errorMessage(e));
    } else successFeedback();
    // On success the session listener switches the app to the right area.
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + space.xxl, paddingBottom: 90, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ position: 'absolute', bottom: -40, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Icon3D name="home" size={92} gradient={['#FFFFFF', '#E4DEFF']} float />
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={{ fontFamily: fonts.display, fontSize: 36, color: '#fff', marginTop: space.lg, letterSpacing: -0.8 }}>
            ManeMaid
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250).springify()} style={{ fontFamily: fonts.body, fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            Trusted home help, managed for you
          </Animated.Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: space.lg, marginTop: -64, flex: 1 }}>
          <Animated.View entering={FadeInUp.delay(200).springify().damping(16)}>
            <Card style={{ padding: space.xl }}>
              {session && profileError ? (
                <View style={{ gap: space.md }}>
                  <Heading>{"We couldn't load your account"}</Heading>
                  <Muted>{profileError}</Muted>
                  <Button label="Try again" icon="refresh" onPress={() => void refreshProfile()} />
                  <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
                </View>
              ) : step === 'phone' ? (
                <Animated.View key="phone" entering={FadeInDown.springify()}>
                  <Heading>Welcome 👋</Heading>
                  <Muted style={{ marginTop: 4, marginBottom: space.lg, fontSize: 14 }}>
                    {"Sign in with your mobile number. We'll text you a 6-digit code."}
                  </Muted>
                  <Field
                    label="Mobile number"
                    required
                    icon="call-outline"
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(t.replace(/[^\d ]/g, ''));
                      if (error) setError(null);
                    }}
                    placeholder="+91  98765 43210"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    maxLength={11}
                    error={error}
                  />
                  <Button label="Send code" icon="arrow-forward" onPress={sendCode} loading={busy} />
                </Animated.View>
              ) : (
                <Animated.View key="code" entering={FadeInDown.springify()}>
                  <Heading>Enter the code</Heading>
                  <Muted style={{ marginTop: 4, marginBottom: space.lg, fontSize: 14 }}>Sent to +91 {digits}</Muted>
                  <Field
                    label="6-digit code"
                    required
                    icon="keypad-outline"
                    value={code}
                    onChangeText={(t) => {
                      setCode(t.replace(/\D/g, ''));
                      if (error) setError(null);
                    }}
                    keyboardType="number-pad"
                    autoComplete="sms-otp"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoFocus
                    error={error}
                    style={{ letterSpacing: 8, fontFamily: fonts.bold, fontSize: 20 }}
                  />
                  <Button label="Verify and continue" icon="checkmark" onPress={verify} loading={busy} />
                  <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
                    <Button
                      small
                      label="Change number"
                      variant="ghost"
                      onPress={() => {
                        setStep('phone');
                        setCode('');
                        setError(null);
                      }}
                    />
                    <Button small label="Resend code" variant="ghost" onPress={sendCode} disabled={busy} />
                  </Row>
                </Animated.View>
              )}
            </Card>
          </Animated.View>

          {DEMO_MODE ? (
            <Animated.View entering={FadeInUp.delay(300).springify().damping(16)}>
              <Card style={{ marginTop: space.md, borderWidth: 1.5, borderColor: colors.orange }}>
                <Row style={{ gap: space.md, marginBottom: space.md }}>
                  <Icon3D name="flask" tone="orange" size={44} />
                  <View style={{ flex: 1 }}>
                    <Heading style={{ fontSize: 17 }}>Demo mode</Heading>
                    <Muted>Works offline. No SMS, no real payments. Data stays on this phone.</Muted>
                  </View>
                </Row>
                <View style={{ gap: space.sm }}>
                  <Button label="Try as Customer" icon="person" loading={busy} onPress={() => void demoSignIn('customer')} />
                  <Button label="Try as Agency" icon="business" variant="secondary" loading={busy} onPress={() => void demoSignIn('agency')} />
                </View>
                <Muted style={{ marginTop: space.md, textAlign: 'center' }}>Or sign in with any number and the code 123456.</Muted>
              </Card>
            </Animated.View>
          ) : null}

          <Row style={{ justifyContent: 'space-around', marginTop: space.lg }}>
            {PERKS.map((p, i) => (
              <View key={p.label} style={{ alignItems: 'center', gap: 6 }}>
                <Icon3D name={p.icon} tone={p.tone} size={44} delay={300 + i * 120} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>{p.label}</Text>
              </View>
            ))}
          </Row>
          <Muted style={{ textAlign: 'center', marginTop: space.xl, marginBottom: insets.bottom + space.lg }}>
            By continuing you agree to our{' '}
            <Text style={{ color: colors.primary, fontFamily: fonts.bold }} onPress={() => router.push('/legal')} accessibilityRole="link">
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: colors.primary, fontFamily: fonts.bold }}
              onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })}
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
            .
          </Muted>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
