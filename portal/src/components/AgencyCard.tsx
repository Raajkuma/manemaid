import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button, Card, Field, Input, useFeedback } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Agency = Tables<'agency_settings'>;

/** Agency contact + UPI details (same fields as the app's Agency settings screen). */
export function AgencyCard({ agency }: { agency: Agency }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [v, setV] = useState(agency);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Agency) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const fields: [keyof Agency, string, string?][] = [
    ['agency_name', 'Agency name'],
    ['support_hours', 'Support hours', 'Mon–Sat, 8 AM – 8 PM'],
    ['support_phone', 'Support phone', '919800000000'],
    ['whatsapp_phone', 'WhatsApp number', 'Blank = support phone'],
    ['alternate_phone', 'Alternate number'],
    ['support_email', 'Support email'],
    ['upi_id', 'UPI ID', 'agency@okbank'],
    ['upi_payee_name', 'UPI payee name'],
  ];
  async function save() {
    if (!String(v.agency_name ?? '').trim()) return toast('Agency name is required', 'bad');
    setBusy(true);
    try {
      const { id: _id, updated_at: _u, ...row } = v;
      const clean = Object.fromEntries(Object.entries(row).map(([k, x]) => [k, typeof x === 'string' ? x.trim() || null : x]));
      unwrap(await supabase.from('agency_settings').update(clean as Partial<Agency>).eq('id', true).select().single());
      await qc.invalidateQueries({ queryKey: ['services-areas'] });
      toast('Agency details saved');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-bold">Agency contact & payment</h2>
        <p className="text-sm text-muted">Shown to customers after their payment is confirmed, and on the UPI payment screen.</p>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {fields.map(([k, label, ph]) => (
          <Field key={k} label={label} htmlFor={`a-${k}`} required={k === 'agency_name'}>
            <Input id={`a-${k}`} value={String(v[k] ?? '')} onChange={set(k)} placeholder={ph} />
          </Field>
        ))}
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button loading={busy} onClick={() => void save()} disabled={JSON.stringify(v) === JSON.stringify(agency)}>Save details</Button>
      </div>
    </Card>
  );
}
