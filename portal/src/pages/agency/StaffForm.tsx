import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Button, Card, ChoiceChips, ErrorBox, Field, Input, Loading, Select, Switch, Textarea, cx, useFeedback } from '@/components/ui';
import { CONTACTS, LANGUAGES, STAFF_STATUS, VERIFICATION, localPhone, staffPhone, type Staff, type StaffStatus, type Verification } from '@/lib/booking';
import { errorMessage } from '@/lib/errors';
import { cropImage, publicUrl, uploadImage } from '@/lib/offers';
import { supabase, unwrap } from '@/lib/supabase';

type Errors = Partial<Record<'name' | 'phone' | 'alt' | 'wa' | 'email' | 'address' | 'categories' | 'emergency', string>>;

function Toggles({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={cx('h-9 rounded-full border px-3.5 text-sm font-medium transition', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-surface text-ink-soft hover:border-brand-300')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function StaffForm() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['staff-form', id ?? 'new'],
    queryFn: async () => {
      const [cats, zones, staff] = await Promise.all([
        supabase.from('service_categories').select('code, name').eq('active', true).order('sort_order'),
        supabase.from('service_zones').select('pincode, area_name').eq('active', true).order('area_name'),
        id ? supabase.from('staff').select('*').eq('id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      return { categories: unwrap(cats), zones: unwrap(zones), staff: unwrap(staff) as Staff | null };
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? new Error('Not found')} onRetry={() => void q.refetch()} />;
  if (id && !q.data.staff) return <ErrorBox error={new Error('This staff member was not found.')} />;
  return <StaffFormBody key={id ?? 'new'} id={id} data={q.data} />;
}

function StaffFormBody({ id, data }: { id?: string; data: { categories: { code: string; name: string }[]; zones: { pincode: string; area_name: string }[]; staff: Staff | null } }) {
  const x = data.staff;
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(x?.photo_url ?? null);
  const [name, setName] = useState(x?.full_name ?? '');
  const [phone, setPhone] = useState(localPhone(x?.phone));
  const [alt, setAlt] = useState(localPhone(x?.alternate_phone));
  const [sameWa, setSameWa] = useState(!x?.whatsapp_phone || x.whatsapp_phone === x.phone);
  const [wa, setWa] = useState(localPhone(x?.whatsapp_phone));
  const [email, setEmail] = useState(x?.email ?? '');
  const [preferred, setPreferred] = useState(x?.preferred_contact ?? 'call');
  const [address, setAddress] = useState(x?.address ?? '');
  const [zone, setZone] = useState(x?.zone_pincode ?? '');
  const [categories, setCategories] = useState<string[]>(x?.categories ?? []);
  const [languages, setLanguages] = useState<string[]>(x?.languages ?? []);
  const [skills, setSkills] = useState((x?.skills ?? []).map((s) => s.replace(/_/g, ' ')).join(', '));
  const [experience, setExperience] = useState(x ? String(x.experience_years) : '');
  const [bio, setBio] = useState(x?.bio ?? '');
  const [emName, setEmName] = useState(x?.emergency_contact_name ?? '');
  const [emPhone, setEmPhone] = useState(localPhone(x?.emergency_contact_phone));
  const [verification, setVerification] = useState<Verification>(x?.verification_status ?? 'pending');
  const [status, setStatus] = useState<StaffStatus>(x?.status ?? 'available');
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setPhoto(await uploadImage('staff-photos', 'staff', await cropImage(file, 1, 800)));
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    // Same checks as the app's staff form.
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Full name is required';
    if (!staffPhone(phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (alt && !staffPhone(alt)) e.alt = 'Enter a valid 10-digit number';
    if (!sameWa && wa && !staffPhone(wa)) e.wa = 'Enter a valid 10-digit number';
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (address.trim().length < 5) e.address = 'Home address is required';
    if (!categories.length) e.categories = 'Pick at least one service';
    if (emPhone && !staffPhone(emPhone)) e.emergency = 'Enter a valid 10-digit number';
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields', 'bad');
      return;
    }
    setSaving(true);
    try {
      const row = {
        full_name: name.trim(),
        photo_url: photo,
        phone: staffPhone(phone),
        alternate_phone: alt ? staffPhone(alt) : null,
        whatsapp_phone: sameWa ? staffPhone(phone) : wa ? staffPhone(wa) : null,
        email: email.trim() || null,
        preferred_contact: preferred,
        address: address.trim(),
        zone_pincode: zone || null,
        categories,
        languages,
        skills: skills.split(',').map((s) => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean),
        experience_years: Number(experience) || 0,
        bio: bio.trim() || null,
        emergency_contact_name: emName.trim() || null,
        emergency_contact_phone: emPhone ? staffPhone(emPhone) : null,
        verification_status: verification,
        status,
      };
      const saved = unwrap(
        editing ? await supabase.from('staff').update(row).eq('id', id!).select().single() : await supabase.from('staff').insert(row).select().single(),
      ) as Staff;
      await qc.invalidateQueries();
      toast(editing ? 'Staff updated' : `${saved.full_name} added · ${saved.code}`);
      navigate(`/agency/staff/${saved.id}`);
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setSaving(false);
    }
  }

  const img = publicUrl('staff-photos', photo);
  const phoneInput = (value: string, set: (v: string) => void, idAttr: string, invalid?: boolean) => (
    <div className="flex">
      <span className="inline-flex h-11 items-center rounded-l-xl border border-r-0 border-line bg-surface-2 px-3 text-muted">+91</span>
      <Input id={idAttr} inputMode="numeric" value={value} onChange={(e) => set(e.target.value.replace(/[^\d ]/g, ''))} className="rounded-l-none" invalid={invalid} placeholder="98765 43210" />
    </div>
  );

  return (
    <>
      <Link to={editing ? `/agency/staff/${id}` : '/agency/staff'} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> {editing ? 'Back to profile' : 'Staff'}
      </Link>
      <h1 className="mb-6 text-2xl font-extrabold">{editing ? `Edit ${x?.full_name}` : 'Add staff member'}</h1>
      <div className="max-w-3xl space-y-5">
        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-xl font-bold text-brand-500">
            {img ? <img src={img} alt="" className="size-full object-cover" /> : (name.slice(0, 2).toUpperCase() || <Icon name="users" />)}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <Button variant="secondary" icon="upload" loading={uploading} onClick={() => fileRef.current?.click()}>{img ? 'Change photo' : 'Add photo'}</Button>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Personal details</h2>
          <Field label="Full name" htmlFor="s-name" required error={errors.name}><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} /></Field>
          <Field label="Service area" htmlFor="s-zone">
            <Select id="s-zone" value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">Not set</option>
              {data.zones.map((z) => <option key={z.pincode} value={z.pincode}>{z.area_name} · {z.pincode}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Home address" htmlFor="s-addr" required error={errors.address}><Textarea id="s-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-16" invalid={!!errors.address} /></Field></div>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Contact</h2>
          <Field label="Mobile" htmlFor="s-phone" required error={errors.phone}>{phoneInput(phone, setPhone, 's-phone', !!errors.phone)}</Field>
          <Field label="Alternate number" htmlFor="s-alt" error={errors.alt}>{phoneInput(alt, setAlt, 's-alt', !!errors.alt)}</Field>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <span className="text-sm font-medium">WhatsApp is the same as mobile</span>
            <Switch checked={sameWa} onChange={setSameWa} label="WhatsApp same as mobile" />
          </div>
          {!sameWa ? <Field label="WhatsApp number" htmlFor="s-wa" error={errors.wa}>{phoneInput(wa, setWa, 's-wa', !!errors.wa)}</Field> : null}
          <Field label="Email" htmlFor="s-email" error={errors.email}><Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} /></Field>
          <div className="sm:col-span-2"><Field label="Preferred contact"><ChoiceChips value={preferred} onChange={setPreferred} options={CONTACTS} /></Field></div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-bold">Work</h2>
          <Field label="Services" required error={errors.categories}>
            <Toggles options={data.categories.map((c) => ({ value: c.code, label: c.name }))} value={categories} onChange={setCategories} />
          </Field>
          <Field label="Languages spoken"><Toggles options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={languages} onChange={setLanguages} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Skills" htmlFor="s-skills" hint="Comma separated, e.g. cleaning, laundry"><Input id="s-skills" value={skills} onChange={(e) => setSkills(e.target.value)} /></Field>
            <Field label="Years of experience" htmlFor="s-exp"><Input id="s-exp" inputMode="numeric" value={experience} onChange={(e) => setExperience(e.target.value.replace(/\D/g, ''))} /></Field>
          </div>
          <Field label="About" htmlFor="s-bio"><Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-16" /></Field>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Emergency contact</h2>
          <Field label="Name" htmlFor="s-emn"><Input id="s-emn" value={emName} onChange={(e) => setEmName(e.target.value)} /></Field>
          <Field label="Phone" htmlFor="s-emp" error={errors.emergency}>{phoneInput(emPhone, setEmPhone, 's-emp', !!errors.emergency)}</Field>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Verification & availability</h2>
          <Field label="Verification" htmlFor="s-ver" hint={VERIFICATION[verification].body}>
            <Select id="s-ver" value={verification} onChange={(e) => setVerification(e.target.value as Verification)}>
              {(Object.keys(VERIFICATION) as Verification[]).map((v) => <option key={v} value={v}>{VERIFICATION[v].label}</option>)}
            </Select>
          </Field>
          <Field label="Status" htmlFor="s-status">
            <Select id="s-status" value={status} onChange={(e) => setStatus(e.target.value as StaffStatus)}>
              {(Object.keys(STAFF_STATUS) as StaffStatus[]).map((v) => <option key={v} value={v}>{STAFF_STATUS[v].label}</option>)}
            </Select>
          </Field>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(editing ? `/agency/staff/${id}` : '/agency/staff')}>Cancel</Button>
          <Button icon="check" loading={saving} onClick={() => void save()}>{editing ? 'Save changes' : 'Add staff member'}</Button>
        </div>
      </div>
    </>
  );
}
