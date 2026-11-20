import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Switch, View } from 'react-native';

import { usePopup } from '@/components/popup';
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipGroup,
  ErrorState,
  Field,
  FieldLabel,
  Heading,
  Icon3D,
  Loading,
  Muted,
  Pressable3D,
  Row,
  Screen,
  Select,
  Strong,
  type IconName,
} from '@/components/ui';
import type { Database } from '@/lib/database.types';
import { errorFeedback } from '@/lib/feedback';
import { CATEGORY_ICON, LANGUAGES } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { photoUrl, pickAndUploadPhoto } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, shadow, space, type Tone } from '@/lib/theme';
import { goBack } from '@/lib/navigation';

type StaffInsert = Database['public']['Tables']['staff']['Insert'];
type VerificationStatus = Database['public']['Enums']['verification_status'];
type StaffStatus = Database['public']['Enums']['staff_status'];

const CONTACTS: { value: string; label: string; icon: IconName }[] = [
  { value: 'call', label: 'Call', icon: 'call-outline' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { value: 'sms', label: 'SMS', icon: 'chatbubble-outline' },
  { value: 'email', label: 'Email', icon: 'mail-outline' },
];

type Errors = Partial<Record<'name' | 'phone' | 'alt' | 'wa' | 'email' | 'address' | 'categories' | 'emergency', string>>;

const digits = (s: string) => s.replace(/\D/g, '');
/** Accepts 10-digit Indian numbers with or without +91. Returns 91XXXXXXXXXX. */
function toE164(s: string): string | null {
  const d = digits(s);
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith('91')) return d;
  return null;
}
const local = (s: string | null | undefined) => (s ? s.replace(/^91/, '') : '');

function Section({ icon, tone, title, children }: { icon: IconName; tone: Tone; title: string; children: ReactNode }) {
  return (
    <Card>
      <Row style={{ gap: space.md, marginBottom: space.md }}>
        <Icon3D name={icon} tone={tone} size={38} />
        <Heading style={{ fontSize: 17 }}>{title}</Heading>
      </Row>
      {children}
    </Card>
  );
}

type FormData = {
  categories: { code: string; name: string }[];
  zones: { pincode: string; area_name: string; city: string }[];
  staff: Database['public']['Tables']['staff']['Row'] | null;
};

export default function StaffForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useLiveQuery(
    async (): Promise<FormData> => {
      const [categories, zones, staff] = await Promise.all([
        supabase.from('service_categories').select('code, name').eq('active', true).order('sort_order'),
        supabase.from('service_zones').select('pincode, area_name, city').eq('active', true).order('area_name'),
        id ? supabase.from('staff').select('*').eq('id', id).single() : Promise.resolve({ data: null, error: null }),
      ]);
      if (staff.error) throw new Error(staff.error.message);
      return { categories: unwrap(categories), zones: unwrap(zones), staff: staff.data };
    },
    { key: `staff-form:${id ?? 'new'}` },
  );

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;
  return <StaffFormBody key={id ?? 'new'} id={id} data={q.data} />;
}

function StaffFormBody({ id, data }: { id?: string; data: FormData }) {
  const popup = usePopup();
  const editing = !!id;
  const x = data.staff;

  const [photo, setPhoto] = useState<string | null>(x?.photo_url ?? null);
  const [name, setName] = useState(x?.full_name ?? '');
  const [phone, setPhone] = useState(local(x?.phone));
  const [alt, setAlt] = useState(local(x?.alternate_phone));
  const [sameWa, setSameWa] = useState(!x?.whatsapp_phone || x.whatsapp_phone === x.phone);
  const [wa, setWa] = useState(local(x?.whatsapp_phone));
  const [email, setEmail] = useState(x?.email ?? '');
  const [preferred, setPreferred] = useState(x?.preferred_contact ?? 'call');
  const [address, setAddress] = useState(x?.address ?? '');
  const [zone, setZone] = useState<string | null>(x?.zone_pincode ?? null);
  const [categories, setCategories] = useState<string[]>(x?.categories ?? []);
  const [languages, setLanguages] = useState<string[]>(x?.languages ?? []);
  const [skills, setSkills] = useState((x?.skills ?? []).map((s) => s.replace(/_/g, ' ')).join(', '));
  const [experience, setExperience] = useState(x ? String(x.experience_years) : '');
  const [bio, setBio] = useState(x?.bio ?? '');
  const [emName, setEmName] = useState(x?.emergency_contact_name ?? '');
  const [emPhone, setEmPhone] = useState(local(x?.emergency_contact_phone));
  const [verification, setVerification] = useState<VerificationStatus>(x?.verification_status ?? 'pending');
  const [status, setStatus] = useState<StaffStatus>(x?.status ?? 'available');
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const clear = (k: keyof Errors) => errors[k] && setErrors((cur) => ({ ...cur, [k]: undefined }));

  async function choosePhoto() {
    setUploading(true);
    try {
      const path = await pickAndUploadPhoto('staff-photos', 'staff');
      if (path) setPhoto(path);
    } catch (e) {
      popup.error('Could not upload photo', e);
    } finally {
      setUploading(false);
    }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Full name is required';
    if (!toE164(phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (alt && !toE164(alt)) e.alt = 'Enter a valid 10-digit number';
    if (!sameWa && wa && !toE164(wa)) e.wa = 'Enter a valid 10-digit number';
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (address.trim().length < 5) e.address = 'Home address is required';
    if (!categories.length) e.categories = 'Pick at least one service';
    if (emPhone && !toE164(emPhone)) e.emergency = 'Enter a valid 10-digit number';
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      errorFeedback();
      popup.info({ title: 'A few details are missing', message: 'Please fix the highlighted fields.', icon: 'alert', tone: 'orange' });
      return;
    }
    const row: StaffInsert = {
      full_name: name.trim(),
      photo_url: photo,
      phone: toE164(phone),
      alternate_phone: alt ? toE164(alt) : null,
      whatsapp_phone: sameWa ? toE164(phone) : wa ? toE164(wa) : null,
      email: email.trim() || null,
      preferred_contact: preferred,
      address: address.trim(),
      zone_pincode: zone,
      categories,
      languages,
      skills: skills
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean),
      experience_years: Number(experience) || 0,
      bio: bio.trim() || null,
      emergency_contact_name: emName.trim() || null,
      emergency_contact_phone: emPhone ? toE164(emPhone) : null,
      verification_status: verification,
      status,
    };
    setSaving(true);
    try {
      const saved = unwrap(
        editing
          ? await supabase.from('staff').update(row).eq('id', id!).select().single()
          : await supabase.from('staff').insert(row).select().single(),
      );
      popup.success({
        title: editing ? 'Staff updated' : `${saved.full_name.split(' ')[0]} added! 🎉`,
        message: editing ? undefined : `Staff code ${saved.code}. ${verification === 'verified' ? 'Ready to be proposed.' : 'Verify them before proposing.'}`,
      });
      if (editing) goBack(`/staff-profile/${id}`);
      else router.replace(`/staff-profile/${saved.id}`);
    } catch (err) {
      popup.error('Could not save staff member', err);
    } finally {
      setSaving(false);
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <Screen
      edges={[]}
      footer={
        <>
          {errorCount ? <Muted style={{ textAlign: 'center', color: colors.danger }}>Please fix {errorCount} field{errorCount > 1 ? 's' : ''}</Muted> : null}
          <Button label={editing ? 'Save changes' : 'Add staff member'} icon="checkmark" onPress={save} loading={saving} />
        </>
      }
    >
      <View style={{ alignItems: 'center', marginBottom: space.lg }}>
        <Pressable3D onPress={choosePhoto} accessibilityLabel="Choose staff photo" tilt={12}>
          <Avatar name={name || 'New staff'} uri={photoUrl('staff-photos', photo)} size={112} ring />
          <View
            style={[
              { position: 'absolute', right: 2, bottom: 6, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
              shadow(2),
            ]}
          >
            <Ionicons name={uploading ? 'hourglass' : 'camera'} size={17} color="#fff" />
          </View>
        </Pressable3D>
        <Muted style={{ marginTop: space.sm }}>{photo ? 'Tap to change photo' : 'Tap to add a photo'}</Muted>
      </View>

      <Section icon="person" tone="primary" title="Personal details">
        <Field label="Full name" required value={name} onChangeText={(v) => { setName(v); clear('name'); }} placeholder="e.g. Sunita Sharma" autoCapitalize="words" error={errors.name} />
        <Field label="Home address" required icon="home-outline" value={address} onChangeText={(v) => { setAddress(v); clear('address'); }} placeholder="House, street, area, city" multiline error={errors.address} />
        <Select
          label="Service area"
          value={zone}
          onChange={setZone}
          placeholder="Choose the area they work in"
          options={data.zones.map((z) => ({ value: z.pincode, label: `${z.area_name} · ${z.pincode}`, description: z.city, icon: 'location' }))}
        />
      </Section>

      <Section icon="call" tone="green" title="Contact details">
        <Field label="Mobile number" required icon="call-outline" value={phone} onChangeText={(v) => { setPhone(v); clear('phone'); }} keyboardType="phone-pad" placeholder="98765 43210" maxLength={14} error={errors.phone} />
        <Field label="Alternate number" icon="call-outline" value={alt} onChangeText={(v) => { setAlt(v); clear('alt'); }} keyboardType="phone-pad" placeholder="Optional" maxLength={14} error={errors.alt} />
        <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
          <Strong style={{ fontSize: 14 }}>WhatsApp on same number</Strong>
          <Switch value={sameWa} onValueChange={setSameWa} trackColor={{ true: colors.primary }} />
        </Row>
        {!sameWa ? (
          <Field label="WhatsApp number" icon="logo-whatsapp" value={wa} onChangeText={(v) => { setWa(v); clear('wa'); }} keyboardType="phone-pad" maxLength={14} error={errors.wa} />
        ) : null}
        <Field label="Email" icon="mail-outline" value={email} onChangeText={(v) => { setEmail(v); clear('email'); }} keyboardType="email-address" autoCapitalize="none" placeholder="Optional" error={errors.email} />
        <FieldLabel label="Preferred way to reach them" />
        <ChipGroup>
          {CONTACTS.map((c) => (
            <Chip key={c.value} label={c.label} icon={c.icon} selected={preferred === c.value} onPress={() => setPreferred(c.value)} />
          ))}
        </ChipGroup>
      </Section>

      <Section icon="briefcase" tone="orange" title="Work profile">
        <FieldLabel label="Services offered" required />
        <ChipGroup>
          {data.categories.map((c) => (
            <Chip
              key={c.code}
              label={c.name}
              icon={CATEGORY_ICON[c.code]}
              selected={categories.includes(c.code)}
              onPress={() => {
                setCategories((cur) => toggle(cur, c.code));
                clear('categories');
              }}
            />
          ))}
        </ChipGroup>
        {errors.categories ? <Muted style={{ color: colors.danger, marginTop: -space.sm, marginBottom: space.md }}>{errors.categories}</Muted> : null}
        <FieldLabel label="Languages spoken" />
        <ChipGroup>
          {LANGUAGES.map((l) => (
            <Chip key={l} label={l} selected={languages.includes(l)} onPress={() => setLanguages((cur) => toggle(cur, l))} />
          ))}
        </ChipGroup>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field label="Experience (yrs)" value={experience} onChangeText={(v) => setExperience(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={{ flex: 2 }}>
            <Field label="Skills" value={skills} onChangeText={setSkills} placeholder="cleaning, laundry, ironing" />
          </View>
        </Row>
        <Field label="About" value={bio} onChangeText={setBio} placeholder="Short introduction customers will see" multiline />
      </Section>

      <Section icon="medkit" tone="danger" title="Emergency contact">
        <Field label="Contact name" value={emName} onChangeText={setEmName} placeholder="e.g. spouse, parent" />
        <Field label="Contact number" icon="call-outline" value={emPhone} onChangeText={(v) => { setEmPhone(v); clear('emergency'); }} keyboardType="phone-pad" maxLength={14} error={errors.emergency} />
      </Section>

      <Section icon="shield-checkmark" tone="blue" title="Verification & availability">
        <Select
          label="Verification status"
          value={verification}
          onChange={(v) => setVerification(v as VerificationStatus)}
          options={[
            { value: 'pending', label: 'Pending', description: 'Documents not checked yet', icon: 'time' },
            { value: 'in_progress', label: 'In progress', description: 'Checks under way', icon: 'hourglass' },
            { value: 'verified', label: 'Verified', description: 'Can be proposed to customers', icon: 'shield-checkmark' },
            { value: 'rejected', label: 'Rejected', description: 'Did not pass verification', icon: 'close-circle' },
          ]}
        />
        <Select
          label="Availability"
          value={status}
          onChange={(v) => setStatus(v as StaffStatus)}
          options={[
            { value: 'available', label: 'Available', icon: 'checkmark-circle' },
            { value: 'assigned', label: 'Assigned', icon: 'briefcase' },
            { value: 'on_leave', label: 'On leave', icon: 'airplane' },
            { value: 'inactive', label: 'Inactive', icon: 'pause-circle' },
          ]}
        />
      </Section>
    </Screen>
  );
}
