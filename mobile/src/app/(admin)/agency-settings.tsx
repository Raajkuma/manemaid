import { useState } from 'react';
import { View } from 'react-native';

import { usePopup } from '@/components/popup';
import { Button, Card, ErrorState, Field, Heading, Icon3D, Loading, Muted, Row, Screen } from '@/components/ui';
import type { Tables } from '@/lib/database.types';
import { errorFeedback } from '@/lib/feedback';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { space } from '@/lib/theme';
import { goBack } from '@/lib/navigation';

const local = (s: string | null) => (s ? s.replace(/^91/, '') : '');
function toE164(s: string): string | null {
  const d = s.replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10) return `91${d}`;
  if (d.length >= 11 && d.length <= 13) return d;
  return 'invalid';
}

export default function AgencySettings() {
  const q = useLiveQuery(async () => unwrap(await supabase.from('agency_settings').select('*').single()), { key: 'agency-settings' });
  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;
  return <SettingsForm initial={q.data} />;
}

function SettingsForm({ initial }: { initial: Tables<'agency_settings'> }) {
  const popup = usePopup();
  const [name, setName] = useState(initial.agency_name);
  const [phone, setPhone] = useState(local(initial.support_phone));
  const [wa, setWa] = useState(local(initial.whatsapp_phone));
  const [alt, setAlt] = useState(local(initial.alternate_phone));
  const [email, setEmail] = useState(initial.support_email ?? '');
  const [hours, setHours] = useState(initial.support_hours ?? '');
  const [upi, setUpi] = useState(initial.upi_id ?? '');
  const [payee, setPayee] = useState(initial.upi_payee_name ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Agency name is required';
    if (toE164(phone) === 'invalid' || !phone) e.phone = 'Enter a valid support number';
    if (toE164(wa) === 'invalid') e.wa = 'Enter a valid number';
    if (toE164(alt) === 'invalid') e.alt = 'Enter a valid number';
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (upi && !/^[\w.-]+@[\w.-]+$/.test(upi.trim())) e.upi = 'UPI IDs look like name@bank';
    setErrors(e);
    if (Object.keys(e).length) {
      errorFeedback();
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('agency_settings')
      .update({
        agency_name: name.trim(),
        support_phone: toE164(phone),
        whatsapp_phone: toE164(wa),
        alternate_phone: toE164(alt),
        support_email: email.trim() || null,
        support_hours: hours.trim() || null,
        upi_id: upi.trim() || null,
        upi_payee_name: payee.trim() || null,
      })
      .eq('id', true);
    setSaving(false);
    if (error) return popup.error('Could not save settings', error);
    popup.success({ title: 'Settings saved', message: 'Customers will see the new details right away.' });
    goBack('/account');
  }

  return (
    <Screen edges={[]} footer={<Button label="Save settings" icon="checkmark" onPress={save} loading={saving} />}>
      <Card index={0}>
        <Row style={{ gap: space.md, marginBottom: space.md }}>
          <Icon3D name="business" />
          <Heading style={{ fontSize: 17 }}>Agency</Heading>
        </Row>
        <Field label="Agency name" required value={name} onChangeText={setName} error={errors.name} />
        <Field label="Support hours" icon="time-outline" value={hours} onChangeText={setHours} placeholder="Mon–Sat, 8 AM – 8 PM" />
      </Card>

      <Card index={1}>
        <Row style={{ gap: space.md, marginBottom: space.sm }}>
          <Icon3D name="headset" tone="green" />
          <View style={{ flex: 1 }}>
            <Heading style={{ fontSize: 17 }}>Support contacts</Heading>
            <Muted>Shown to customers only after their payment is confirmed.</Muted>
          </View>
        </Row>
        <Field label="Support phone" required icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        <Field label="WhatsApp number" icon="logo-whatsapp" value={wa} onChangeText={setWa} keyboardType="phone-pad" placeholder="Leave blank to use support phone" error={errors.wa} />
        <Field label="Alternate number" icon="call-outline" value={alt} onChangeText={setAlt} keyboardType="phone-pad" error={errors.alt} />
        <Field label="Support email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      </Card>

      <Card index={2}>
        <Row style={{ gap: space.md, marginBottom: space.sm }}>
          <Icon3D name="wallet" tone="orange" />
          <View style={{ flex: 1 }}>
            <Heading style={{ fontSize: 17 }}>Payments (UPI)</Heading>
            <Muted>Customers pay here, then submit the transaction reference for you to verify.</Muted>
          </View>
        </Row>
        <Field label="UPI ID" icon="at-outline" value={upi} onChangeText={setUpi} autoCapitalize="none" placeholder="agency@okbank" error={errors.upi} />
        <Field label="Payee name" value={payee} onChangeText={setPayee} placeholder="As shown in UPI apps" />
      </Card>
    </Screen>
  );
}
