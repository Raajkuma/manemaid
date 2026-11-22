import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View, useWindowDimensions } from 'react-native';

import { DayStrip } from '@/components/day-strip';
import { OfferBanner, offerImageUrl } from '@/components/offers';
import { usePopup } from '@/components/popup';
import { Button, Card, Chip, ChipGroup, ErrorState, Field, FieldLabel, Loading, Muted, Row, Screen, Select, Strong } from '@/components/ui';
import { errorFeedback } from '@/lib/feedback';
import { useLiveQuery } from '@/lib/hooks';
import { goBack } from '@/lib/navigation';
import { addDaysISO, endOfDayIso, startOfDayIso, type Offer } from '@/lib/promotions';
import { pickAndUploadPhoto } from '@/lib/storage';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, gradients, radius, space } from '@/lib/theme';
import { toISODate } from '@/lib/format';

type StartChoice = 'now' | 'tomorrow' | 'date';
type EndChoice = '7' | '30' | 'date' | 'none';
type Errors = Partial<Record<'title' | 'body' | 'terms' | 'end', string>>;

export default function OfferForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useLiveQuery(
    async () => {
      const [cats, offer] = await Promise.all([
        supabase.from('service_categories').select('code, name').eq('active', true).order('sort_order'),
        id ? supabase.from('offers').select('*').eq('id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (offer.error) throw new Error(offer.error.message);
      return { categories: unwrap(cats), offer: (offer.data ?? null) as Offer | null };
    },
    { key: `offer-form:${id ?? 'new'}` },
  );

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error) return <Screen edges={[]}><ErrorState message={q.error} onRetry={q.reload} /></Screen>;
  if (id && !q.data?.offer) return <Screen edges={[]}><ErrorState message="This offer was not found. It may have been deleted." onRetry={q.reload} /></Screen>;
  // Keyed by offer so the form starts from the loaded values.
  return <OfferFormBody key={id ?? 'new'} id={id} existing={q.data!.offer} categories={q.data!.categories} />;
}

function OfferFormBody({ id, existing, categories }: { id?: string; existing: Offer | null; categories: { code: string; name: string }[] }) {
  const editing = !!id;
  const popup = usePopup();
  const { profile } = useSession();
  const { width } = useWindowDimensions();
  const today = toISODate(new Date());

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [terms, setTerms] = useState(existing?.terms ?? '');
  const [category, setCategory] = useState<string | null>(existing?.category_code ?? null);
  const [audience, setAudience] = useState<'all' | 'new_customers'>((existing?.audience as 'all' | 'new_customers') ?? 'all');
  const [startChoice, setStartChoice] = useState<StartChoice>(existing ? 'date' : 'now');
  const [startDate, setStartDate] = useState(existing ? toISODate(new Date(existing.starts_at)) : today);
  const [endChoice, setEndChoice] = useState<EndChoice>(existing ? (existing.ends_at ? 'date' : 'none') : '30');
  const [endDate, setEndDate] = useState(existing?.ends_at ? toISODate(new Date(existing.ends_at)) : addDaysISO(today, 30));
  const [active, setActive] = useState(existing?.active ?? true);
  const [imagePath, setImagePath] = useState<string | null>(existing?.image_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const serviceName = categories.find((c) => c.code === category)?.name ?? null;

  const startIso = () =>
    startChoice === 'now' || (startChoice === 'date' && startDate === today)
      ? new Date().toISOString()
      : startOfDayIso(startChoice === 'tomorrow' ? addDaysISO(today, 1) : startDate);
  const endIso = () =>
    endChoice === 'none' ? null : endOfDayIso(endChoice === '7' ? addDaysISO(today, 7) : endChoice === '30' ? addDaysISO(today, 30) : endDate);

  async function choosePhoto() {
    setUploading(true);
    try {
      const path = await pickAndUploadPhoto('offer-images', 'banners', { aspect: [16, 9], maxWidth: 1600 });
      if (path) setImagePath(path);
    } catch (e) {
      popup.error('Could not add the picture', e);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const e: Errors = {};
    if (title.trim().length < 3) e.title = 'Give the offer a short title (at least 3 characters).';
    else if (title.trim().length > 60) e.title = 'Keep the title to 60 characters so it fits on phones.';
    if (body.trim().length < 3) e.body = 'Add a short description customers will read.';
    else if (body.trim().length > 300) e.body = 'Keep the description to 300 characters.';
    if (terms.length > 1000) e.terms = 'Keep the terms to 1000 characters.';
    const s = startIso();
    const en = endIso();
    if (en && new Date(en) <= new Date(s)) e.end = 'The end date must be after the start date.';
    else if (en && new Date(en) <= new Date() && active) e.end = 'This end date is in the past, so customers would never see the offer.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      errorFeedback();
      return;
    }
    setSaving(true);
    try {
      const row = {
        title: title.trim(),
        body: body.trim(),
        terms: terms.trim() || null,
        category_code: category,
        audience,
        starts_at: s,
        ends_at: en,
        active,
        image_path: imagePath,
      };
      if (editing) unwrap(await supabase.from('offers').update(row).eq('id', id!).select().single());
      else unwrap(await supabase.from('offers').insert({ ...row, created_by: profile?.id ?? null }).select().single());
      popup.success({ title: editing ? 'Offer saved' : active ? 'Offer published' : 'Offer saved (hidden)' });
      goBack('/offers');
    } catch (err) {
      popup.error('Could not save the offer', err);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    void popup.confirm({
      title: 'Delete this offer?',
      message: 'Customers will no longer see it. Bookings that already claimed it keep the offer name.',
      icon: 'trash',
      destructive: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        unwrap(await supabase.from('offers').delete().eq('id', id!).select());
        goBack('/offers');
      },
      success: { title: 'Offer deleted' },
    });
  }

  const previewOffer = {
    id: 'preview',
    title: title.trim() || 'Your offer title',
    body: body.trim() || 'A short description customers will read.',
    terms: null,
    image_path: imagePath,
    category_code: category,
    audience,
    starts_at: new Date().toISOString(),
    ends_at: endIso(),
    active: true,
    sort_order: 0,
    created_by: null,
    created_at: '',
    updated_at: '',
  } as Offer;
  const img = offerImageUrl(imagePath);

  return (
    <Screen
      edges={[]}
      footer={
        <>
          <Button label={editing ? 'Save changes' : active ? 'Publish offer' : 'Save as hidden'} icon="checkmark" onPress={() => void save()} loading={saving} />
          {editing ? <Button label="Delete offer" icon="trash-outline" variant="danger" onPress={remove} /> : null}
        </>
      }
    >
      <Card index={0}>
        <FieldLabel label="Banner picture" />
        <View style={{ aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', marginBottom: space.sm }}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <LinearGradient colors={gradients.hero} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={34} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          )}
        </View>
        <Row style={{ gap: space.sm }}>
          <Button small variant="secondary" icon="image-outline" label={img ? 'Change picture' : 'Add picture'} onPress={() => void choosePhoto()} loading={uploading} style={{ flex: 1 }} />
          {img ? <Button small variant="ghost" icon="trash-outline" label="Remove" onPress={() => setImagePath(null)} /> : null}
        </Row>
        <Muted style={{ marginTop: space.sm }}>Any photo works — it is cropped to a wide banner automatically.</Muted>
      </Card>

      <Card index={1}>
        <Field label={`Title (${title.trim().length}/60)`} required value={title} onChangeText={setTitle} placeholder="e.g. Welcome offer: 20% off your first month" error={errors.title} />
        <Field label={`Short description (${body.trim().length}/300)`} required value={body} onChangeText={setBody} placeholder="What is the offer and why book now?" multiline error={errors.body} />
        <Field label="Terms (optional)" value={terms} onChangeText={setTerms} placeholder="e.g. New customers only. Applied in your quotation." multiline error={errors.terms} />
      </Card>

      <Card index={2}>
        <Select
          label="Service"
          value={category ?? 'any'}
          options={[{ value: 'any', label: 'Any service' }, ...categories.map((c) => ({ value: c.code, label: c.name }))]}
          onChange={(v) => setCategory(v === 'any' ? null : v)}
        />
        <FieldLabel label="Show to" />
        <ChipGroup>
          <Chip label="All customers" selected={audience === 'all'} onPress={() => setAudience('all')} />
          <Chip label="New customers only" selected={audience === 'new_customers'} onPress={() => setAudience('new_customers')} />
        </ChipGroup>

        <FieldLabel label="Starts" />
        <ChipGroup>
          <Chip label="Right away" selected={startChoice === 'now'} onPress={() => setStartChoice('now')} />
          <Chip label="Tomorrow" selected={startChoice === 'tomorrow'} onPress={() => setStartChoice('tomorrow')} />
          <Chip label="Pick a date" selected={startChoice === 'date'} onPress={() => setStartChoice('date')} />
        </ChipGroup>
        {startChoice === 'date' ? <DayStrip label="Start date" value={startDate} onChange={setStartDate} from={today} /> : null}

        <FieldLabel label="Ends" />
        <ChipGroup>
          <Chip label="In 7 days" selected={endChoice === '7'} onPress={() => setEndChoice('7')} />
          <Chip label="In 30 days" selected={endChoice === '30'} onPress={() => setEndChoice('30')} />
          <Chip label="Pick a date" selected={endChoice === 'date'} onPress={() => setEndChoice('date')} />
          <Chip label="No end date" selected={endChoice === 'none'} onPress={() => setEndChoice('none')} />
        </ChipGroup>
        {endChoice === 'date' ? <DayStrip label="End date" value={endDate} onChange={setEndDate} from={today} days={120} /> : null}
        {errors.end ? <Muted style={{ color: colors.danger, marginBottom: space.sm }}>{errors.end}</Muted> : null}

        <Row style={{ gap: space.md, marginTop: space.sm }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Visible to customers</Strong>
            <Muted>Turn off to keep it as a draft or pause it.</Muted>
          </View>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" accessibilityLabel="Visible to customers" />
        </Row>
      </Card>

      <Strong style={{ marginTop: space.sm, marginBottom: space.sm }}>Preview in the customer app</Strong>
      <View pointerEvents="none" style={{ alignItems: 'center', marginBottom: space.lg }}>
        <OfferBanner offer={previewOffer} serviceName={serviceName} width={Math.min(width - space.lg * 2, 380)} />
      </View>
    </Screen>
  );
}
