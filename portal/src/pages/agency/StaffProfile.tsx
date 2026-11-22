import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ErrorBox, Loading } from '@/components/ui';
import { STAFF_STATUS, STATUS, VERIFICATION, type Staff } from '@/lib/booking';
import { formatDate } from '@/lib/format';
import { publicUrl } from '@/lib/offers';
import { formatPhone } from '@/lib/phone';
import { supabase, unwrap } from '@/lib/supabase';

const CONTACT_LABEL: Record<string, string> = { call: 'Phone call', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

export function StaffProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['staff-profile', id],
    queryFn: async () => {
      const [staff, cats, assignments, zones] = await Promise.all([
        supabase.from('staff').select('*').eq('id', id).single(),
        supabase.from('service_categories').select('code, name'),
        supabase.from('assignments').select('status, bookings(id, reference, status, category_code)').eq('staff_id', id).order('proposed_at', { ascending: false }),
        supabase.from('service_zones').select('pincode, area_name'),
      ]);
      return {
        staff: unwrap(staff) as Staff,
        names: Object.fromEntries(unwrap(cats).map((c) => [c.code, c.name])) as Record<string, string>,
        assignments: unwrap(assignments) as unknown as { status: string; bookings: { id: string; reference: string; status: keyof typeof STATUS; category_code: string } | null }[],
        zones: Object.fromEntries(unwrap(zones).map((z) => [z.pincode, z.area_name])) as Record<string, string>,
      };
    },
  });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? new Error('Not found')} onRetry={() => void q.refetch()} />;
  const { staff: s, names, assignments, zones } = q.data;
  const st = STAFF_STATUS[s.status];
  const ver = VERIFICATION[s.verification_status];
  const wa = s.whatsapp_phone ?? s.phone;
  const contacts: { label: string; href: string | null; icon: 'phone' | 'chat' | 'inbox' }[] = [
    { label: 'Call', href: s.phone ? `tel:+${s.phone}` : null, icon: 'phone' },
    { label: 'WhatsApp', href: wa ? `https://wa.me/${wa}` : null, icon: 'chat' },
    { label: 'SMS', href: s.phone ? `sms:+${s.phone}` : null, icon: 'chat' },
    { label: 'Email', href: s.email ? `mailto:${s.email}` : null, icon: 'inbox' },
  ];

  return (
    <>
      <Link to="/agency/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> Staff
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 p-6 text-center text-white">
              <div className="mx-auto mb-3 grid size-20 place-items-center overflow-hidden rounded-full bg-white/15 text-2xl font-extrabold ring-4 ring-white/30">
                {s.photo_url ? <img src={publicUrl('staff-photos', s.photo_url) ?? ''} alt="" className="size-full object-cover" /> : s.full_name.slice(0, 2).toUpperCase()}
              </div>
              <h1 className="text-2xl font-extrabold">{s.full_name}</h1>
              <p className="text-sm text-white/85">{s.code} · {s.experience_years} yrs experience{s.rating ? ` · ★ ${s.rating}` : ''}</p>
              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded-full bg-white px-1.5 py-0.5"><Badge tone={st.tone}>{st.label}</Badge></span>
                <span className="rounded-full bg-white px-1.5 py-0.5"><Badge tone={ver.tone}>{ver.label}</Badge></span>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-line">
              {contacts.map((c) => c.href ? (
                <a key={c.label} href={c.href} target={c.label === 'WhatsApp' ? '_blank' : undefined} rel="noreferrer" className="flex flex-col items-center gap-1 py-3 text-sm font-medium text-brand-500 hover:bg-surface-2">
                  <Icon name={c.icon} size={18} />{c.label}
                </a>
              ) : (
                <span key={c.label} className="flex flex-col items-center gap-1 py-3 text-sm text-muted opacity-50"><Icon name={c.icon} size={18} />{c.label}</span>
              ))}
            </div>
          </Card>
          {s.bio ? <Card className="p-5 text-sm"><p className="text-muted">About</p><p>{s.bio}</p></Card> : null}
          <Card className="p-5">
            <h2 className="mb-2 font-bold">Contact</h2>
            <Row label="Mobile" value={formatPhone(s.phone)} />
            <Row label="Alternate" value={formatPhone(s.alternate_phone)} />
            <Row label="WhatsApp" value={s.whatsapp_phone ? formatPhone(s.whatsapp_phone) : s.phone ? 'Same as mobile' : '—'} />
            <Row label="Email" value={s.email || '—'} />
            <Row label="Prefers" value={CONTACT_LABEL[s.preferred_contact] ?? s.preferred_contact} />
            <Row label="Address" value={s.address || '—'} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 font-bold">Work</h2>
            <Row label="Services" value={s.categories.map((c) => names[c] ?? c).join(', ') || '—'} />
            <Row label="Area" value={s.zone_pincode ? `${zones[s.zone_pincode] ?? ''} ${s.zone_pincode}` : '—'} />
            <Row label="Languages" value={s.languages.join(', ') || '—'} />
            <Row label="Skills" value={s.skills.map((x) => x.replace(/_/g, ' ')).join(', ') || '—'} />
            <Row label="Verified on" value={s.verified_at ? formatDate(s.verified_at) : 'Not yet'} />
          </Card>
          {s.emergency_contact_name || s.emergency_contact_phone ? (
            <Card className="p-5">
              <h2 className="mb-2 font-bold">Emergency contact</h2>
              <Row label="Name" value={s.emergency_contact_name || '—'} />
              <Row label="Phone" value={formatPhone(s.emergency_contact_phone)} />
            </Card>
          ) : null}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Button className="w-full" icon="edit" onClick={() => navigate(`/agency/staff/${id}/edit`)}>Edit staff details</Button>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Bookings</h2>
            {assignments.length === 0 ? <p className="text-sm text-muted">Not proposed for any booking yet.</p> : (
              <ul className="space-y-2">
                {assignments.filter((a) => a.bookings).map((a) => (
                  <li key={a.bookings!.id}>
                    <Link to={`/agency/bookings/${a.bookings!.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                      <span><b>{a.bookings!.reference}</b> · {names[a.bookings!.category_code] ?? a.bookings!.category_code}</span>
                      <Badge tone={STATUS[a.bookings!.status].tone}>{a.status === 'proposed' ? 'Proposed' : STATUS[a.bookings!.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
