import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { DayStrip } from '@/components/day-strip';
import { GreetingCard } from '@/components/greeting';
import { usePopup } from '@/components/popup';
import { Button, Card, Chip, ChipGroup, ErrorState, Field, FieldLabel, Loading, Muted, Row, Screen, Strong } from '@/components/ui';
import { errorFeedback } from '@/lib/feedback';
import { formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { goBack } from '@/lib/navigation';
import { indiaToday, type Greeting } from '@/lib/promotions';
import { useSession } from '@/lib/session';
import { pickAndUploadPhoto, photoUrl } from '@/lib/storage';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, space } from '@/lib/theme';

type Errors = Partial<Record<'title' | 'message' | 'dates', string>>;

export default function GreetingForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useLiveQuery(
    async () => {
      if (!id) return { greeting: null as Greeting | null };
      const { data, error } = await supabase.from('greetings').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return { greeting: (data ?? null) as Greeting | null };
    },
    { key: `greeting-form:${id ?? 'new'}` },
  );

  if (q.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.error) return <Screen edges={[]}><ErrorState message={q.error} onRetry={q.reload} /></Screen>;
  if (id && !q.data?.greeting) return <Screen edges={[]}><ErrorState message="This greeting was not found." onRetry={q.reload} /></Screen>;
  return <GreetingFormBody key={id ?? 'new'} id={id} existing={q.data!.greeting} />;
}

function GreetingFormBody({ id, existing }: { id?: string; existing: Greeting | null }) {
  const editing = !!id;
  const popup = usePopup();
  const { profile } = useSession();
  const today = indiaToday();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [imagePath, setImagePath] = useState<string | null>(existing?.image_path ?? null);
  const [audience, setAudience] = useState<'all' | 'active_customers'>((existing?.audience as 'all' | 'active_customers') ?? 'all');
  const [startsOn, setStartsOn] = useState(existing?.starts_on ?? today);
  const [endsOn, setEndsOn] = useState(existing?.ends_on ?? today);
  const [pushToInbox, setPushToInbox] = useState(existing?.push_to_inbox ?? true);
  const [active, setActive] = useState(existing?.active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function choosePhoto() {
    setUploading(true);
    try {
      const path = await pickAndUploadPhoto('offer-images', 'greetings', { aspect: [16, 9], maxWidth: 1600 });
      if (path) setImagePath(path);
    } catch (e) {
      popup.error('Could not add the picture', e);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const e: Errors = {};
    if (title.trim().length < 3) e.title = 'Give the greeting a short title (at least 3 characters).';
    else if (title.trim().length > 60) e.title = 'Keep the title to 60 characters.';
    if (message.trim().length < 3) e.message = 'Write the message customers will see.';
    else if (message.trim().length > 500) e.message = 'Keep the message to 500 characters.';
    if (endsOn < startsOn) e.dates = 'The last day must be on or after the first day.';
    else if (endsOn < today && active) e.dates = 'These dates are in the past, so customers would never see it.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      errorFeedback();
      return;
    }
    setSaving(true);
    try {
      const row = {
        title: title.trim(),
        message: message.trim(),
        image_path: imagePath,
        audience,
        starts_on: startsOn,
        ends_on: endsOn,
        push_to_inbox: pushToInbox,
        active,
      };
      if (editing) unwrap(await supabase.from('greetings').update(row).eq('id', id!).select().single());
      else unwrap(await supabase.from('greetings').insert({ ...row, created_by: profile?.id ?? null }).select().single());
      popup.success({ title: editing ? 'Greeting saved' : active ? 'Greeting scheduled' : 'Greeting saved (hidden)' });
      goBack('/greetings');
    } catch (err) {
      popup.error('Could not save the greeting', err);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    void popup.confirm({
      title: 'Delete this greeting?',
      message: 'Customers who have not seen it yet will not get it.',
      icon: 'trash',
      destructive: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        unwrap(await supabase.from('greetings').delete().eq('id', id!).select());
        goBack('/greetings');
      },
      success: { title: 'Greeting deleted' },
    });
  }

  return (
    <Screen
      edges={[]}
      footer={
        <>
          <Button label={editing ? 'Save changes' : active ? 'Schedule greeting' : 'Save as hidden'} icon="checkmark" onPress={() => void save()} loading={saving} />
          {editing ? <Button label="Delete greeting" icon="trash-outline" variant="danger" onPress={remove} /> : null}
        </>
      }
    >
      <Card index={0}>
        <Field label={`Title (${title.trim().length}/60)`} required value={title} onChangeText={setTitle} placeholder="e.g. Happy Diwali!" error={errors.title} />
        <Field label={`Message (${message.trim().length}/500)`} required value={message} onChangeText={setMessage} placeholder="e.g. Wishing you and your family a bright and joyful Diwali." multiline error={errors.message} />
        <Row style={{ gap: space.sm }}>
          <Button small variant="secondary" icon="image-outline" label={imagePath ? 'Change picture' : 'Add picture (optional)'} onPress={() => void choosePhoto()} loading={uploading} style={{ flex: 1 }} />
          {imagePath ? <Button small variant="ghost" icon="trash-outline" label="Remove" onPress={() => setImagePath(null)} /> : null}
        </Row>
      </Card>

      <Card index={1}>
        <FieldLabel label="Show to" />
        <ChipGroup>
          <Chip label="All customers" selected={audience === 'all'} onPress={() => setAudience('all')} />
          <Chip label="Active customers" selected={audience === 'active_customers'} onPress={() => setAudience('active_customers')} />
        </ChipGroup>
        <Muted style={{ marginTop: -space.sm, marginBottom: space.md }}>“Active customers” have a confirmed or active booking.</Muted>

        <FieldLabel label={`First day · ${formatDate(startsOn)}`} />
        <DayStrip
          label="First day"
          value={startsOn}
          from={today}
          days={120}
          onChange={(d) => {
            setStartsOn(d);
            if (endsOn < d) setEndsOn(d);
          }}
        />
        <FieldLabel label={`Last day · ${formatDate(endsOn)}`} />
        <DayStrip label="Last day" value={endsOn} from={startsOn < today ? today : startsOn} days={60} onChange={setEndsOn} />
        {errors.dates ? <Muted style={{ color: colors.danger, marginBottom: space.sm }}>{errors.dates}</Muted> : null}

        <Row style={{ gap: space.md, marginTop: space.sm }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Also add to their Inbox</Strong>
            <Muted>So they can read it again later.</Muted>
          </View>
          <Switch value={pushToInbox} onValueChange={setPushToInbox} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" accessibilityLabel="Also add to their Inbox" />
        </Row>
        <Row style={{ gap: space.md, marginTop: space.md }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Active</Strong>
            <Muted>Turn off to keep it as a draft.</Muted>
          </View>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" accessibilityLabel="Active" />
        </Row>
      </Card>

      <Strong style={{ marginTop: space.sm, marginBottom: space.sm }}>What customers will see</Strong>
      <View pointerEvents="none" style={{ alignItems: 'center', marginBottom: space.lg }}>
        <GreetingCard title={title.trim()} message={message.trim()} imagePath={photoUrl('offer-images', imagePath) ? imagePath : null} />
      </View>
    </Screen>
  );
}
