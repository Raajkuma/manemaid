import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, Dialog, ErrorBox, Field, Input, Loading, PageHeader, Switch, Textarea, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Category = Tables<'service_categories'>;
type Zone = Tables<'service_zones'>;
type Agency = Tables<'agency_settings'>;

function useData() {
  return useQuery({
    queryKey: ['services-areas'],
    queryFn: async () => {
      const [c, z, a] = await Promise.all([
        supabase.from('service_categories').select('*').order('sort_order'),
        supabase.from('service_zones').select('*').order('city').order('area_name'),
        supabase.from('agency_settings').select('*').maybeSingle(),
      ]);
      return { categories: unwrap(c) as Category[], zones: unwrap(z) as Zone[], agency: unwrap(a) as Agency | null };
    },
  });
}

function CategoryDialog({ value, onClose }: { value: Category | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const editing = value && value !== 'new' ? value : null;
  const [code, setCode] = useState(editing?.code ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [sort, setSort] = useState(String(editing?.sort_order ?? 10));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing && !/^[a-z][a-z0-9_]{1,30}$/.test(code)) return setErr('Code: lower-case letters, numbers and _ (e.g. pet_care). It cannot be changed later.');
    if (name.trim().length < 2) return setErr('Enter a name customers will see.');
    setBusy(true);
    try {
      const row = { name: name.trim(), description: description.trim() || null, sort_order: Number(sort) || 0 };
      if (editing) unwrap(await supabase.from('service_categories').update(row).eq('code', editing.code).select().single());
      else unwrap(await supabase.from('service_categories').insert({ code, ...row }).select().single());
      await qc.invalidateQueries({ queryKey: ['services-areas'] });
      toast(editing ? 'Service updated' : 'Service added');
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!value} onClose={onClose} title={editing ? `Edit ${editing.name}` : 'Add a service'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={() => void save()}>Save</Button></>}>
      <div className="space-y-4">
        {!editing ? (
          <Field label="Code" htmlFor="c-code" required hint="Used internally; cannot be changed later.">
            <Input id="c-code" value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="pet_care" />
          </Field>
        ) : null}
        <Field label="Name" htmlFor="c-name" required><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pet care" /></Field>
        <Field label="Description" htmlFor="c-desc"><Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16" /></Field>
        <Field label="Order" htmlFor="c-sort" hint="Lower numbers show first."><Input id="c-sort" type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="max-w-28" /></Field>
        {err ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p> : null}
      </div>
    </Dialog>
  );
}

function ZoneDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [pincode, setPincode] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!/^\d{6}$/.test(pincode)) return setErr('Enter a 6-digit PIN code.');
    if (!area.trim() || !city.trim()) return setErr('Enter the area and city.');
    setBusy(true);
    try {
      unwrap(await supabase.from('service_zones').insert({ pincode, area_name: area.trim(), city: city.trim() }).select().single());
      await qc.invalidateQueries({ queryKey: ['services-areas'] });
      toast(`${area.trim()} added — customers there can book now`);
      setPincode(''); setArea(''); setErr(null);
      onClose();
    } catch (e) {
      setErr(/duplicate/i.test(errorMessage(e)) ? 'That PIN code is already listed.' : errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add a service area" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={() => void save()}>Add area</Button></>}>
      <div className="space-y-4">
        <Field label="PIN code" htmlFor="z-pin" required><Input id="z-pin" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="560001" /></Field>
        <Field label="Area name" htmlFor="z-area" required><Input id="z-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="MG Road" /></Field>
        <Field label="City" htmlFor="z-city" required><Input id="z-city" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        {err ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p> : null}
      </div>
    </Dialog>
  );
}

export function ServicesAreas() {
  const q = useData();
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [cat, setCat] = useState<Category | 'new' | null>(null);
  const [zoneOpen, setZoneOpen] = useState(false);

  async function toggle(table: 'service_categories' | 'service_zones', keyCol: 'code' | 'pincode', key: string, active: boolean) {
    try {
      if (table === 'service_categories') unwrap(await supabase.from(table).update({ active }).eq('code', key).select());
      else unwrap(await supabase.from(table).update({ active }).eq('pincode', key).select());
      await qc.invalidateQueries({ queryKey: ['services-areas'] });
      toast(active ? 'Visible to customers' : 'Hidden from customers');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    }
    void keyCol;
  }

  return (
    <>
      <PageHeader title="Services & areas" subtitle="What customers can book and where you serve." />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-bold">Services</h2>
                <p className="text-sm text-muted">Hidden services disappear from the app's “Book a service” list.</p>
              </div>
              <Button variant="secondary" icon="plus" onClick={() => setCat('new')}>Add service</Button>
            </div>
            <ul className="divide-y divide-line">
              {q.data!.categories.map((c) => (
                <li key={c.code} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.name} <code className="ml-1 text-xs font-normal text-muted">{c.code}</code></p>
                    {c.description ? <p className="truncate text-sm text-muted">{c.description}</p> : null}
                  </div>
                  {!c.active ? <Badge tone="warn">Hidden</Badge> : null}
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => setCat(c)}>Edit</Button>
                  <Switch checked={c.active} label={c.active ? `Hide ${c.name}` : `Show ${c.name}`} onChange={(on) => void toggle('service_categories', 'code', c.code, on)} />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-bold">Service areas</h2>
                <p className="text-sm text-muted">Customers can only book at addresses in these PIN codes.</p>
              </div>
              <Button variant="secondary" icon="plus" onClick={() => setZoneOpen(true)}>Add area</Button>
            </div>
            <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
              {q.data!.zones.map((z) => (
                <li key={z.pincode} className="flex items-center gap-3 border-line px-5 py-3 sm:border-b">
                  <Icon name="map" size={17} className="text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{z.area_name}</p>
                    <p className="text-xs text-muted">{z.pincode} · {z.city}</p>
                  </div>
                  <Switch checked={z.active} label={z.active ? `Stop serving ${z.area_name}` : `Serve ${z.area_name}`} onChange={(on) => void toggle('service_zones', 'pincode', z.pincode, on)} />
                  <button type="button" aria-label={`Remove ${z.area_name}`} className="rounded-lg p-1.5 text-muted hover:bg-bad-soft hover:text-bad" onClick={() => confirm({
                    title: `Remove ${z.area_name}?`,
                    message: 'Customers in this PIN code will no longer be able to book. If addresses already use it, switch it off instead.',
                    confirmLabel: 'Remove area',
                    danger: true,
                    onConfirm: async () => {
                      unwrap(await supabase.from('service_zones').delete().eq('pincode', z.pincode).select());
                      await qc.invalidateQueries({ queryKey: ['services-areas'] });
                      toast('Area removed');
                    },
                  })}>
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 text-sm text-muted">
            Agency contact numbers and UPI details are edited under <b className="text-ink">Agency → Agency settings</b>.
          </Card>
        </div>
      )}
      {cat ? <CategoryDialog key={cat === 'new' ? 'new' : cat.code} value={cat} onClose={() => setCat(null)} /> : null}
      <ZoneDialog open={zoneOpen} onClose={() => setZoneOpen(false)} />
    </>
  );
}
