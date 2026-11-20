import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { usePopup } from '@/components/popup';
import { Button, Card, Chip, ChipGroup, Field, FieldLabel, Icon3D, Muted, Row, Screen, Strong } from '@/components/ui';
import { errorFeedback } from '@/lib/feedback';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';
import { goBack } from '@/lib/navigation';

const LABELS = [
  { label: 'Home', icon: 'home-outline' },
  { label: 'Work', icon: 'briefcase-outline' },
  { label: 'Parents', icon: 'people-outline' },
  { label: 'Other', icon: 'location-outline' },
] as const;

type Errors = Partial<Record<'flat' | 'building' | 'line1' | 'landmark' | 'pincode' | 'city', string>>;

export default function AddressForm() {
  const { profile } = useSession();
  const popup = usePopup();
  const [label, setLabel] = useState('Home');
  const [flat, setFlat] = useState('');
  const [building, setBuilding] = useState('');
  const [line1, setLine1] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [access, setAccess] = useState('');
  const [makeDefault, setMakeDefault] = useState(true);
  const [check, setCheck] = useState<{ pincode: string; ok: boolean } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const serviceable = check && check.pincode === pincode ? check.ok : null;

  // Live serviceability check (PRD §4.2).
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) return;
    let cancelled = false;
    supabase.rpc('check_serviceable', { p_pincode: pincode }).then(({ data }) => {
      if (!cancelled) setCheck({ pincode, ok: !!data });
    });
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  function validate(): Errors {
    const e: Errors = {};
    if (!flat.trim()) e.flat = 'Flat / house number is required';
    if (!building.trim()) e.building = 'Building or society is required';
    if (line1.trim().length < 3) e.line1 = 'Street address is required';
    if (!landmark.trim()) e.landmark = 'A landmark helps staff find you';
    if (!/^\d{6}$/.test(pincode)) e.pincode = 'Enter a 6-digit PIN code';
    if (city.trim().length < 2) e.city = 'City is required';
    return e;
  }

  const clear = (k: keyof Errors) => errors[k] && setErrors((cur) => ({ ...cur, [k]: undefined }));

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      errorFeedback();
      return;
    }
    if (!profile) return;
    setSaving(true);
    try {
      const { count } = await supabase.from('customer_addresses').select('id', { count: 'exact', head: true });
      const isDefault = makeDefault || !count;
      if (isDefault) {
        // Only one default per customer (enforced by a unique index).
        await supabase.from('customer_addresses').update({ is_default: false }).eq('is_default', true);
      }
      unwrap(
        await supabase
          .from('customer_addresses')
          .insert({
            customer_id: profile.id,
            label,
            flat_no: flat.trim(),
            building: building.trim(),
            line1: line1.trim(),
            landmark: landmark.trim(),
            pincode,
            city: city.trim(),
            access_notes: access.trim() || null,
            is_default: isDefault,
          })
          .select()
          .single(),
      );
      popup.success({
        title: 'Address saved',
        message: serviceable === false ? "We don't serve this PIN code yet — we'll let you know when we do." : 'You can now book services here.',
      });
      goBack('/profile');
    } catch (err) {
      popup.error('Could not save address', err);
    } finally {
      setSaving(false);
    }
  }

  const missing = Object.values(errors).filter(Boolean).length;

  return (
    <Screen
      edges={[]}
      footer={
        <>
          {missing ? <Muted style={{ textAlign: 'center', color: colors.danger }}>Please fill the {missing} highlighted field{missing > 1 ? 's' : ''}</Muted> : null}
          <Button label="Save address" icon="checkmark" onPress={save} loading={saving} />
        </>
      }
    >
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name="location" tone="orange" size={52} float />
        <View style={{ flex: 1 }}>
          <Strong>Where do you need help?</Strong>
          <Muted>Fields marked * are required.</Muted>
        </View>
      </Row>

      <FieldLabel label="Save as" required />
      <ChipGroup>
        {LABELS.map((l) => (
          <Chip key={l.label} label={l.label} icon={l.icon} selected={label === l.label} onPress={() => setLabel(l.label)} />
        ))}
      </ChipGroup>

      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Flat / house no." required value={flat} onChangeText={(v) => { setFlat(v); clear('flat'); }} placeholder="4B" error={errors.flat} />
        </View>
        <View style={{ flex: 1.6 }}>
          <Field label="Building / society" required value={building} onChangeText={(v) => { setBuilding(v); clear('building'); }} placeholder="Lake View Apts" error={errors.building} />
        </View>
      </Row>
      <Field label="Street address" required icon="map-outline" value={line1} onChangeText={(v) => { setLine1(v); clear('line1'); }} placeholder="Street, area" autoComplete="street-address" error={errors.line1} />
      <Field label="Landmark" required icon="flag-outline" value={landmark} onChangeText={(v) => { setLandmark(v); clear('landmark'); }} placeholder="Near…" error={errors.landmark} />
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="PIN code"
            required
            value={pincode}
            onChangeText={(t) => {
              setPincode(t.replace(/\D/g, ''));
              clear('pincode');
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="postal-code"
            error={errors.pincode}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="City" required value={city} onChangeText={(v) => { setCity(v); clear('city'); }} error={errors.city} />
        </View>
      </Row>
      {serviceable !== null ? (
        <Animated.View entering={FadeIn}>
          <Card style={{ backgroundColor: serviceable ? colors.greenSoft : colors.orangeSoft, paddingVertical: space.md }}>
            <Row style={{ gap: space.md }}>
              <Icon3D name={serviceable ? 'checkmark' : 'alert'} tone={serviceable ? 'green' : 'orange'} size={36} />
              <Muted style={{ flex: 1, color: serviceable ? colors.green : colors.orange, fontSize: 14 }}>
                {serviceable ? 'Great — we serve this PIN code.' : "We don't serve this PIN code yet. You can save it, but can't book there yet."}
              </Muted>
            </Row>
          </Card>
        </Animated.View>
      ) : null}
      <Field label="Access instructions" icon="key-outline" value={access} onChangeText={setAccess} placeholder="Gate pass, intercom, parking… (optional)" multiline />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Use as default address</Strong>
            <Muted>Pre-selected for new requests</Muted>
          </View>
          <Switch value={makeDefault} onValueChange={setMakeDefault} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>
    </Screen>
  );
}
