import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { OfferPreview } from '@/components/OfferPreview';
import { Badge, Button, Card, ChoiceChips, ErrorBox, Field, Input, Loading, Select, Switch, Textarea, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { addDays, endOfDayIso, startOfDayIso, toDateInput } from '@/lib/format';
import { cropTo16x9, offerImageUrl, offerStatus, STATUS_META, uploadOfferImage, type Offer } from '@/lib/offers';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';

type StartChoice = 'now' | 'tomorrow' | 'date';
type EndChoice = '7' | '30' | 'date' | 'none';
type Errors = Partial<Record<'title' | 'body' | 'terms' | 'start' | 'end' | 'image', string>>;

const today = () => toDateInput(new Date().toISOString());

export function OfferEditor() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useSession();
  const { toast, confirm } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ['offer-editor', id ?? 'new'],
    queryFn: async () => {
      const [cats, offer] = await Promise.all([
        supabase.from('service_categories').select('code, name').eq('active', true).order('sort_order'),
        id ? supabase.from('offers').select('*').eq('id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      return { categories: unwrap(cats), offer: unwrap(offer) as Offer | null };
    },
  });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [terms, setTerms] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState<'all' | 'new_customers'>('all');
  const [startChoice, setStartChoice] = useState<StartChoice>('now');
  const [startDate, setStartDate] = useState(today());
  const [endChoice, setEndChoice] = useState<EndChoice>('30');
  const [endDate, setEndDate] = useState(toDateInput(addDays(new Date(), 30).toISOString()));
  const [active, setActive] = useState(true);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<Blob | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Fill the form once when editing an existing offer.
  useEffect(() => {
    const o = q.data?.offer;
    if (!o || loadedFor === o.id) return;
    setLoadedFor(o.id);
    setTitle(o.title);
    setBody(o.body);
    setTerms(o.terms ?? '');
    setCategory(o.category_code ?? '');
    setAudience(o.audience as 'all' | 'new_customers');
    setStartChoice('date');
    setStartDate(toDateInput(o.starts_at));
    setEndChoice(o.ends_at ? 'date' : 'none');
    if (o.ends_at) setEndDate(toDateInput(o.ends_at));
    setActive(o.active);
    setImagePath(o.image_path);
  }, [q.data, loadedFor]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => void q.refetch()} />;
  if (editing && !q.data?.offer) {
    return <ErrorBox error={new Error('This offer was not found. It may have been deleted.')} />;
  }

  const categories = q.data?.categories ?? [];
  const serviceName = categories.find((c) => c.code === category)?.name ?? null;

  function computeStart(): string {
    if (startChoice === 'now') return new Date().toISOString();
    if (startChoice === 'tomorrow') return startOfDayIso(toDateInput(addDays(new Date(), 1).toISOString()));
    // A start date of today means "from now", so the offer goes live immediately.
    return startDate === today() ? new Date().toISOString() : startOfDayIso(startDate);
  }
  function computeEnd(): string | null {
    if (endChoice === 'none') return null;
    if (endChoice === '7') return endOfDayIso(toDateInput(addDays(new Date(), 7).toISOString()));
    if (endChoice === '30') return endOfDayIso(toDateInput(addDays(new Date(), 30).toISOString()));
    return endOfDayIso(endDate);
  }

  function validate(): Errors {
    const e: Errors = {};
    if (title.trim().length < 3) e.title = 'Give the offer a short title (at least 3 characters).';
    else if (title.trim().length > 60) e.title = 'Keep the title to 60 characters so it fits on phones.';
    if (body.trim().length < 3) e.body = 'Add a short description customers will read.';
    else if (body.trim().length > 300) e.body = 'Keep the description to 300 characters.';
    if (terms.length > 1000) e.terms = 'Keep the terms to 1000 characters.';
    if (startChoice === 'date' && !startDate) e.start = 'Pick a start date.';
    if (endChoice === 'date' && !endDate) e.end = 'Pick an end date.';
    const s = startChoice === 'date' && startDate ? computeStart() : computeStart();
    const en = computeEnd();
    if (!e.end && en && new Date(en) <= new Date(s)) e.end = 'The end date must be after the start date.';
    if (!e.end && en && new Date(en) <= new Date() && active) e.end = 'This end date is in the past, so customers would never see the offer.';
    return e;
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setErrors((x) => ({ ...x, image: 'That image is too large. Use one under 15 MB.' }));
      return;
    }
    try {
      const blob = await cropTo16x9(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setPendingImage(blob);
      setImagePreview(URL.createObjectURL(blob));
      setErrors((x) => ({ ...x, image: undefined }));
    } catch (e) {
      setErrors((x) => ({ ...x, image: errorMessage(e) }));
    }
  }

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast('Please fix the highlighted fields', 'bad');
      return;
    }
    setSaving(true);
    try {
      let path = imagePath;
      if (pendingImage) path = await uploadOfferImage(pendingImage);
      const row = {
        title: title.trim(),
        body: body.trim(),
        terms: terms.trim() || null,
        category_code: category || null,
        audience,
        starts_at: computeStart(),
        ends_at: computeEnd(),
        active,
        image_path: path,
      };
      if (editing) {
        unwrap(await supabase.from('offers').update(row).eq('id', id!).select().single());
      } else {
        unwrap(await supabase.from('offers').insert({ ...row, created_by: profile?.id ?? null }).select().single());
      }
      await qc.invalidateQueries({ queryKey: ['offers'] });
      toast(editing ? 'Offer saved' : active ? 'Offer published' : 'Offer saved (hidden)');
      navigate('/agency/offers');
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    confirm({
      title: 'Delete this offer?',
      message: 'Customers will no longer see it. Bookings that already claimed it keep the offer name. This cannot be undone.',
      confirmLabel: 'Delete offer',
      danger: true,
      onConfirm: async () => {
        unwrap(await supabase.from('offers').delete().eq('id', id!).select());
        await qc.invalidateQueries({ queryKey: ['offers'] });
        toast('Offer deleted');
        navigate('/agency/offers');
      },
    });
  }

  const status = q.data?.offer ? STATUS_META[offerStatus(q.data.offer)] : null;
  const shownImage = imagePreview ?? offerImageUrl(imagePath);
  const previewEnd = (() => {
    try {
      return computeEnd();
    } catch {
      return null;
    }
  })();

  return (
    <>
      <Link to="/agency/offers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> All offers
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold sm:text-[28px]">{editing ? 'Edit offer' : 'New offer'}</h1>
        {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="space-y-5 p-5 sm:p-6">
            <h2 className="text-base font-bold">What customers see</h2>
            <Field label="Banner image" hint="Any photo works — we crop it to a wide banner automatically." error={errors.image}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="aspect-video w-48 overflow-hidden rounded-xl border border-line bg-surface-2">
                  {shownImage ? <img src={shownImage} alt="Banner preview" className="size-full object-cover" /> : (
                    <div className="grid size-full place-items-center text-muted"><Icon name="image" size={28} /></div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onPickImage(e.target.files?.[0])} />
                  <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
                    {shownImage ? 'Change image' : 'Upload image'}
                  </Button>
                  {shownImage ? (
                    <Button variant="ghost" icon="trash" onClick={() => { setImagePath(null); setPendingImage(null); setImagePreview(null); }}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </Field>
            <Field label="Title" htmlFor="title" required error={errors.title} counter={{ value: title.trim().length, max: 60 }}>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Welcome offer: 20% off your first month" invalid={!!errors.title} />
            </Field>
            <Field label="Short description" htmlFor="body" required error={errors.body} counter={{ value: body.trim().length, max: 300 }}>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What is the offer and why should customers book now?" invalid={!!errors.body} />
            </Field>
            <Field label="Terms (optional)" htmlFor="terms" hint="Shown on the offer's detail page." error={errors.terms} counter={{ value: terms.length, max: 1000 }}>
              <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. New customers only. Applied in your quotation." invalid={!!errors.terms} />
            </Field>
          </Card>

          <Card className="space-y-5 p-5 sm:p-6">
            <h2 className="text-base font-bold">Who and when</h2>
            <Field label="Service" htmlFor="service" hint="Customers who tap “Book now” go straight to this service.">
              <Select id="service" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Any service</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Show to">
              <ChoiceChips
                value={audience}
                onChange={setAudience}
                options={[
                  { value: 'all', label: 'All customers' },
                  { value: 'new_customers', label: 'New customers only' },
                ]}
              />
              <p className="text-xs text-muted">“New customers” are people who haven't made a booking yet.</p>
            </Field>
            <Field label="Starts" error={errors.start}>
              <ChoiceChips<StartChoice>
                value={startChoice}
                onChange={setStartChoice}
                options={[
                  { value: 'now', label: 'Right away' },
                  { value: 'tomorrow', label: 'Tomorrow' },
                  { value: 'date', label: 'Pick a date' },
                ]}
              />
              {startChoice === 'date' ? (
                <Input type="date" aria-label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-2 max-w-52" />
              ) : null}
            </Field>
            <Field label="Ends" error={errors.end}>
              <ChoiceChips<EndChoice>
                value={endChoice}
                onChange={setEndChoice}
                options={[
                  { value: '7', label: 'In 7 days' },
                  { value: '30', label: 'In 30 days' },
                  { value: 'date', label: 'Pick a date' },
                  { value: 'none', label: 'No end date' },
                ]}
              />
              {endChoice === 'date' ? (
                <Input type="date" aria-label="End date" value={endDate} min={today()} onChange={(e) => setEndDate(e.target.value)} className="mt-2 max-w-52" />
              ) : null}
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Visible to customers</p>
                <p className="text-xs text-muted">Turn off to keep it as a draft or pause it.</p>
              </div>
              <Switch checked={active} onChange={setActive} label="Visible to customers" />
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {editing ? (
              <Button variant="ghost" icon="trash" className="text-bad hover:bg-bad-soft" onClick={remove}>
                Delete offer
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/agency/offers')}>Cancel</Button>
              <Button icon="check" loading={saving} onClick={() => void save()}>
                {editing ? 'Save changes' : active ? 'Publish offer' : 'Save as hidden'}
              </Button>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="mb-4 text-sm font-semibold text-muted">Preview in the customer app</p>
            <OfferPreview title={title.trim()} body={body.trim()} imageUrl={shownImage} endsAt={previewEnd} serviceName={serviceName} />
          </Card>
        </aside>
      </div>
    </>
  );
}
