import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { Icon, type IconName } from '@/components/icons';
import { Badge, Button, Card, Field, Input, PageHeader, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { ROLE_LABEL } from '@/lib/format';
import { cropImage, publicUrl, uploadImage } from '@/lib/offers';
import { formatPhone } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';

const TOOLS: { to: string; icon: IconName; title: string; body: string }[] = [
  { to: '/agency/offers', icon: 'tag', title: 'Offers', body: 'Post and schedule offers for customers' },
  { to: '/agency/greetings', icon: 'sparkles', title: 'Greetings', body: 'Festival and celebration wishes' },
  { to: '/agency/settings', icon: 'settings', title: 'Agency settings', body: 'Support numbers, WhatsApp, hours and UPI ID' },
  { to: '/agency/templates', icon: 'file', title: 'Scope templates', body: 'Reusable scopes for quotations' },
  { to: '/agency/staff/new', icon: 'users', title: 'Add staff member', body: 'Photo, contacts, skills and verification' },
  { to: '/agency/support', icon: 'chat', title: 'Support requests', body: 'Customer requests, urgent first' },
];

export function Account() {
  const { profile, role, reload, signOut } = useSession();
  const { toast } = useFeedback();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!profile) return null;
  const img = publicUrl('avatars', profile.avatar_path);

  async function saveName() {
    if (name.trim().length < 2) return toast('Please enter your name', 'bad');
    setSaving(true);
    try {
      unwrap(await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', profile!.id).select().single());
      await reload();
      toast('Name saved');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      // Avatars live in a folder named after the user (storage policy).
      const path = await uploadImage('avatars', profile!.id, await cropImage(file, 1, 600));
      unwrap(await supabase.from('profiles').update({ avatar_path: path }).eq('id', profile!.id).select().single());
      await reload();
      toast('Photo updated');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle="Your details — the same account as the ManeMaid app." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="space-y-5 p-5">
          <div className="flex items-center gap-4">
            <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-accent-soft text-2xl font-bold text-brand-500">
              {img ? <img src={img} alt="" className="size-full object-cover" /> : (profile.full_name || 'Me').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold">{profile.full_name || 'Add your name'}</p>
              <p className="text-sm text-muted">{formatPhone(profile.phone)}</p>
              <Badge tone={role === 'developer' ? 'info' : 'brand'}>{ROLE_LABEL[role ?? ''] ?? role}</Badge>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <Button variant="secondary" icon="upload" loading={uploading} onClick={() => fileRef.current?.click()}>Change photo</Button>
          <Field label="Your name" htmlFor="me-name">
            <div className="flex gap-2">
              <Input id="me-name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button loading={saving} disabled={name.trim() === (profile.full_name ?? '')} onClick={() => void saveName()}>Save</Button>
            </div>
          </Field>
          <Button variant="ghost" icon="logout" className="text-bad hover:bg-bad-soft" onClick={() => void signOut()}>Sign out</Button>
        </Card>
        <Card className="p-2">
          <p className="px-3 pt-3 pb-2 text-sm font-semibold text-muted">Agency tools</p>
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-surface-2">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-brand-500"><Icon name={t.icon} size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{t.title}</span><span className="block text-sm text-muted">{t.body}</span></span>
              <Icon name="chevron" size={16} className="text-muted" />
            </Link>
          ))}
        </Card>
      </div>
    </>
  );
}
