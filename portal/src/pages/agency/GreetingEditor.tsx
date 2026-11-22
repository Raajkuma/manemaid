import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ChoiceChips, ErrorBox, Field, Input, Loading, Switch, Textarea, useFeedback } from '@/components/ui';
import { formatDay } from '@/lib/booking';
import { errorMessage } from '@/lib/errors';
import { cropImage, publicUrl, uploadImage } from '@/lib/offers';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';

import { GREETING_STATUS, greetingStatus, indiaToday, type Greeting } from './Greetings';

/** Same card the customer app shows (mobile/src/components/greeting.tsx). */
function GreetingPreview({ title, message, image }: { title: string; message: string; image: string | null }) {
  return (
    <div className="mx-auto w-[300px] overflow-hidden rounded-[24px] border border-line bg-white text-center text-[#1b1f3b] shadow-card">
      <div className="aspect-video bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700">
        {image ? <img src={image} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-5xl">🎉</div>}
      </div>
      <div className="space-y-2 p-5">
        <p className="font-display text-xl font-extrabold">{title || 'Your greeting title'}</p>
        <p className="text-sm text-[#3a3f63]">{message || 'Your message to customers.'}</p>
        <p className="text-xs text-[#7a8098]">— Team ManeMaid</p>
        <span className="mt-2 block rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white">Thank you!</span>
      </div>
    </div>
  );
}

export function GreetingEditor() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['greeting', id ?? 'new'],
    queryFn: async () => (id ? (unwrap(await supabase.from('greetings').select('*').eq('id', id).maybeSingle()) as Greeting | null) : null),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  if (id && !q.data) return <ErrorBox error={new Error('This greeting was not found.')} />;
  return <Body key={id ?? 'new'} id={id} g={q.data ?? null} />;
}

function Body({ id, g }: { id?: string; g: Greeting | null }) {
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useSession();
  const { toast, confirm } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const today = indiaToday();

  const [title, setTitle] = useState(g?.title ?? '');
  const [message, setMessage] = useState(g?.message ?? '');
  const [image, setImage] = useState<string | null>(g?.image_path ?? null);
  const [audience, setAudience] = useState<'all' | 'active_customers'>((g?.audience as 'all' | 'active_customers') ?? 'all');
  const [startsOn, setStartsOn] = useState(g?.starts_on ?? today);
  const [endsOn, setEndsOn] = useState(g?.ends_on ?? today);
  const [inbox, setInbox] = useState(g?.push_to_inbox ?? true);
  const [active, setActive] = useState(g?.active ?? true);
  const [errors, setErrors] = useState<Partial<Record<'title' | 'message' | 'dates', string>>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadImage('offer-images', 'greetings', await cropImage(file, 16 / 9, 1600)));
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    // Same checks as the app's greeting form.
    const e: typeof errors = {};
    if (title.trim().length < 3) e.title = 'Give the greeting a short title (at least 3 characters).';
    else if (title.trim().length > 60) e.title = 'Keep the title to 60 characters.';
    if (message.trim().length < 3) e.message = 'Write the message customers will see.';
    else if (message.trim().length > 500) e.message = 'Keep the message to 500 characters.';
    if (!startsOn || !endsOn || endsOn < startsOn) e.dates = 'The last day must be on or after the first day.';
    else if (endsOn < today && active) e.dates = 'These dates are in the past, so customers would never see it.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return toast('Please fix the highlighted fields', 'bad');
    setSaving(true);
    try {
      const row = { title: title.trim(), message: message.trim(), image_path: image, audience, starts_on: startsOn, ends_on: endsOn, push_to_inbox: inbox, active };
      if (editing) unwrap(await supabase.from('greetings').update(row).eq('id', id!).select().single());
      else unwrap(await supabase.from('greetings').insert({ ...row, created_by: profile?.id ?? null }).select().single());
      await qc.invalidateQueries();
      toast(editing ? 'Greeting saved' : active ? 'Greeting scheduled' : 'Greeting saved (hidden)');
      navigate('/agency/greetings');
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setSaving(false);
    }
  }

  const st = g ? GREETING_STATUS[greetingStatus(g)] : null;

  return (
    <>
      <Link to="/agency/greetings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> All greetings
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">{editing ? 'Edit greeting' : 'New greeting'}</h1>
        {st ? <Badge tone={st.tone}>{st.label}</Badge> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <Field label="Title" htmlFor="g-title" required error={errors.title} counter={{ value: title.trim().length, max: 60 }}>
              <Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Happy Diwali!" invalid={!!errors.title} />
            </Field>
            <Field label="Message" htmlFor="g-msg" required error={errors.message} counter={{ value: message.trim().length, max: 500 }}>
              <Textarea id="g-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Wishing you and your family a bright and joyful Diwali." invalid={!!errors.message} />
            </Field>
            <Field label="Picture (optional)" hint="Any photo works — it is cropped to a wide banner automatically.">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
              <div className="flex gap-2">
                <Button variant="secondary" icon="upload" loading={uploading} onClick={() => fileRef.current?.click()}>{image ? 'Change picture' : 'Upload picture'}</Button>
                {image ? <Button variant="ghost" icon="trash" onClick={() => setImage(null)}>Remove</Button> : null}
              </div>
            </Field>
          </Card>
          <Card className="space-y-4 p-5">
            <Field label="Show to" hint="“Active customers” have a confirmed or active booking.">
              <ChoiceChips value={audience} onChange={setAudience} options={[{ value: 'all', label: 'All customers' }, { value: 'active_customers', label: 'Active customers' }]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First day" htmlFor="g-start" required>
                <Input id="g-start" type="date" value={startsOn} min={editing ? undefined : today} onChange={(e) => { setStartsOn(e.target.value); if (endsOn < e.target.value) setEndsOn(e.target.value); }} />
              </Field>
              <Field label="Last day" htmlFor="g-end" required>
                <Input id="g-end" type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </Field>
            </div>
            {errors.dates ? <p className="text-sm text-bad">{errors.dates}</p> : <p className="text-xs text-muted">Shown {startsOn === endsOn ? `on ${formatDay(startsOn)}` : `from ${formatDay(startsOn)} to ${formatDay(endsOn)}`} (India time).</p>}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
              <div><p className="text-sm font-semibold">Also add to their Inbox</p><p className="text-xs text-muted">So they can read it again later.</p></div>
              <Switch checked={inbox} onChange={setInbox} label="Also add to their Inbox" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
              <div><p className="text-sm font-semibold">Active</p><p className="text-xs text-muted">Turn off to keep it as a draft.</p></div>
              <Switch checked={active} onChange={setActive} label="Active" />
            </div>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editing ? (
              <Button variant="ghost" icon="trash" className="text-bad hover:bg-bad-soft" onClick={() => confirm({
                title: 'Delete this greeting?', message: 'Customers who have not seen it yet will not get it.', confirmLabel: 'Delete', danger: true,
                onConfirm: async () => { unwrap(await supabase.from('greetings').delete().eq('id', id!).select()); await qc.invalidateQueries(); toast('Greeting deleted'); navigate('/agency/greetings'); },
              })}>Delete greeting</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/agency/greetings')}>Cancel</Button>
              <Button icon="check" loading={saving} onClick={() => void save()}>{editing ? 'Save changes' : active ? 'Schedule greeting' : 'Save as hidden'}</Button>
            </div>
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="mb-4 text-sm font-semibold text-muted">What customers will see</p>
            <GreetingPreview title={title.trim()} message={message.trim()} image={publicUrl('offer-images', image)} />
          </Card>
        </aside>
      </div>
    </>
  );
}
