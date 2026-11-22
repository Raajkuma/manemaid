import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Icon } from '@/components/icons';
import { Button, Card, ChoiceChips, ErrorBox, Field, Input, Loading, Select, Switch, Textarea, useFeedback } from '@/components/ui';
import { formatDay, formatINR } from '@/lib/booking';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

const CUSTOM = '__custom__';
const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0;

export function SendQuote() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, toast } = useFeedback();
  const q = useQuery({
    queryKey: ['send-quote', id],
    queryFn: async () => {
      const [booking, templates] = await Promise.all([
        supabase.from('bookings').select('reference, category_code, offer_title, status, service_categories(name)').eq('id', id).single(),
        supabase.from('scope_templates').select('*').eq('active', true).order('sort_order'),
      ]);
      return {
        booking: unwrap(booking) as unknown as { reference: string; category_code: string; offer_title: string | null; status: string; service_categories: { name: string } | null },
        templates: unwrap(templates) as Tables<'scope_templates'>[],
      };
    },
  });

  const [templateId, setTemplateId] = useState('');
  const [scope, setScope] = useState('');
  const [price, setPrice] = useState('');
  const [withTax, setWithTax] = useState(false);
  const [tax, setTax] = useState('');
  const [terms, setTerms] = useState('Free replacement within 7 days. One month notice for cancellation.');
  const [validDays, setValidDays] = useState('7');
  const [errors, setErrors] = useState<{ scope?: string; price?: string; tax?: string }>({});

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? new Error('Not found')} onRetry={() => void q.refetch()} />;
  const b = q.data.booking;
  // Templates for this service first, like the app.
  const templates = [...q.data.templates].sort(
    (a, c) => Number(c.category_code === b.category_code) - Number(a.category_code === b.category_code) || a.sort_order - c.sort_order,
  );
  const validUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(validDays));
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();
  const taxAmount = withTax ? num(tax) : 0;
  const total = num(price) + taxAmount;

  function send() {
    const e: typeof errors = {};
    if (scope.trim().length < 4) e.scope = 'Choose a template or write the scope of work';
    if (num(price) <= 0) e.price = 'Enter the monthly service price';
    if (withTax && num(tax) <= 0) e.tax = 'Enter the tax amount or turn tax off';
    setErrors(e);
    if (Object.keys(e).length) return;
    confirm({
      title: 'Send this quotation?',
      message: `${formatINR(total)} per month${withTax ? ' (incl. tax)' : ''}, valid until ${formatDay(validUntil)}. The customer is notified in the app.`,
      confirmLabel: 'Send',
      onConfirm: async () => {
        unwrap(await supabase.rpc('send_quotation', {
          p_booking_id: id,
          p_scope: scope.trim(),
          p_monthly_price: num(price),
          p_valid_until: validUntil,
          p_tax: taxAmount,
          p_terms: terms.trim() || undefined,
        }));
        await qc.invalidateQueries();
        toast('Quotation sent');
        navigate(`/agency/bookings/${id}`);
      },
    });
  }

  return (
    <>
      <Link to={`/agency/bookings/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon name="back" size={16} /> {b.reference}
      </Link>
      <h1 className="mb-1 text-2xl font-extrabold">Send quotation</h1>
      <p className="mb-6 text-muted">{b.service_categories?.name ?? b.category_code} · {b.reference}</p>

      <div className="max-w-2xl space-y-5">
        {b.offer_title ? (
          <div className="flex items-center gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
            <Icon name="tag" size={20} />
            <div className="text-sm"><b>Customer claimed: {b.offer_title}</b><br />Reflect the offer in the price or the terms below.</div>
          </div>
        ) : null}
        <Card className="space-y-4 p-5">
          <Field label="Scope of work" htmlFor="tpl" required error={errors.scope}>
            <Select id="tpl" value={templateId} onChange={(ev) => {
              const v = ev.target.value;
              setTemplateId(v);
              if (v === CUSTOM) setScope('');
              else setScope(templates.find((t) => t.id === v)?.body ?? '');
              setErrors((x) => ({ ...x, scope: undefined }));
            }}>
              <option value="">Choose a template…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              <option value={CUSTOM}>Write a custom scope</option>
            </Select>
          </Field>
          <Field label="Scope (edit if needed)" htmlFor="scope" required>
            <Textarea id="scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. Daily cleaning, 2 hrs, Mon–Sat, includes laundry" invalid={!!errors.scope} />
          </Field>
        </Card>
        <Card className="space-y-4 p-5">
          <Field label="Service price per month (₹)" htmlFor="price" required error={errors.price}>
            <Input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 8500" invalid={!!errors.price} />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-medium">Add tax</p><p className="text-xs text-muted">Optional — only if you charge GST</p></div>
            <Switch checked={withTax} onChange={setWithTax} label="Add tax" />
          </div>
          {withTax ? (
            <Field label="Tax amount (₹)" htmlFor="tax" required error={errors.tax}>
              <Input id="tax" inputMode="numeric" value={tax} onChange={(e) => setTax(e.target.value.replace(/[^\d.]/g, ''))} invalid={!!errors.tax} />
            </Field>
          ) : null}
          <Field label="Terms" htmlFor="terms"><Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} className="min-h-16" /></Field>
          <Field label="Valid for">
            <ChoiceChips value={validDays} onChange={setValidDays} options={[{ value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} />
          </Field>
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-muted">Customer pays monthly · valid until {formatDay(validUntil)}</span>
            <span className="font-display text-2xl font-extrabold text-brand-500">{formatINR(total)}</span>
          </div>
        </Card>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(`/agency/bookings/${id}`)}>Cancel</Button>
          <Button icon="check" onClick={send}>Review & send</Button>
        </div>
      </div>
    </>
  );
}
