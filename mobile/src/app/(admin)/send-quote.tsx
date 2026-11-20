import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { usePopup } from '@/components/popup';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Divider,
  ErrorState,
  Field,
  FieldLabel,
  Icon3D,
  KeyValue,
  Loading,
  Muted,
  Row,
  Screen,
  Select,
  Strong,
} from '@/components/ui';
import { errorFeedback } from '@/lib/feedback';
import { CATEGORY_ICON, formatDate, formatINR, toISODate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import { supabase, unwrap } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';
import { goBack } from '@/lib/navigation';

const VALIDITY = [3, 7, 14];
const CUSTOM = '__custom__';
const num = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(/[^\d.]/g, '')));

export default function SendQuote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const popup = usePopup();
  const q = useLiveQuery(
    async () => {
      const [booking, templates] = await Promise.all([
        supabase.from('bookings').select('reference, category_code, service_categories(name)').eq('id', id).single(),
        supabase.from('scope_templates').select('*').eq('active', true).order('sort_order'),
      ]);
      return { booking: unwrap(booking), templates: unwrap(templates) };
    },
    { key: `send-quote:${id}` },
  );

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [scope, setScope] = useState('');
  const [price, setPrice] = useState('');
  const [withTax, setWithTax] = useState(false);
  const [tax, setTax] = useState('');
  const [terms, setTerms] = useState('Free replacement within 7 days. One month notice for cancellation.');
  const [validDays, setValidDays] = useState(7);
  const [errors, setErrors] = useState<{ scope?: string; price?: string; tax?: string }>({});

  const validUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + validDays);
    return toISODate(d);
  })();
  const taxAmount = withTax ? num(tax) : 0;
  const total = num(price) + taxAmount;

  // Templates for this booking's service first, then the rest.
  const category = q.data?.booking.category_code;
  const templates = [...(q.data?.templates ?? [])].sort(
    (a, b) => Number(b.category_code === category) - Number(a.category_code === category) || a.sort_order - b.sort_order,
  );

  function pickTemplate(value: string) {
    setTemplateId(value);
    if (value === CUSTOM) {
      setScope('');
    } else {
      const t = templates.find((x) => x.id === value);
      if (t) setScope(t.body);
    }
    setErrors((e) => ({ ...e, scope: undefined }));
  }

  function send() {
    const e: typeof errors = {};
    if (scope.trim().length < 4) e.scope = 'Choose a template or write the scope of work';
    if (num(price) <= 0) e.price = 'Enter the monthly service price';
    if (withTax && num(tax) <= 0) e.tax = 'Enter the tax amount or turn tax off';
    setErrors(e);
    if (Object.keys(e).length) {
      errorFeedback();
      return;
    }
    void popup
      .confirm({
        title: 'Send this quotation?',
        message: `${formatINR(total)} per month${withTax ? ' (incl. tax)' : ''}, valid until ${formatDate(validUntil)}.`,
        icon: 'paper-plane',
        confirmLabel: 'Send',
        onConfirm: async () => {
          unwrap(
            await supabase.rpc('send_quotation', {
              p_booking_id: id,
              p_scope: scope.trim(),
              p_monthly_price: num(price),
              p_valid_until: validUntil,
              p_tax: taxAmount,
              p_terms: terms.trim() || undefined,
            }),
          );
        },
        success: { title: 'Quotation sent', message: 'The customer has been notified.' },
      })
      .then((ok) => ok && goBack(`/manage/${id}`));
  }

  if (q.loading) return <Screen width="form" edges={[]}><Loading /></Screen>;
  if (q.error || !q.data) return <Screen width="form" edges={[]}><ErrorState message={q.error ?? 'Not found'} onRetry={q.reload} /></Screen>;

  const b = q.data.booking as unknown as { reference: string; category_code: string; service_categories: { name: string } | null };

  return (
    <Screen width="form" edges={[]} footer={<Button label="Review & send" icon="paper-plane" onPress={send} />}>
      <Row style={{ gap: space.md, marginBottom: space.lg }}>
        <Icon3D name={CATEGORY_ICON[b.category_code] ?? 'briefcase'} float />
        <View style={{ flex: 1 }}>
          <Strong>{b.service_categories?.name ?? b.category_code}</Strong>
          <Muted>Quotation for {b.reference}</Muted>
        </View>
      </Row>

      <Card index={0}>
        <Select
          label="Scope of work"
          required
          value={templateId}
          onChange={pickTemplate}
          placeholder="Choose a template…"
          error={errors.scope && !scope ? errors.scope : null}
          options={[
            ...templates.map((t) => ({
              value: t.id,
              label: t.title,
              description: t.body,
              icon: (t.category_code ? CATEGORY_ICON[t.category_code] : undefined) ?? 'document-text',
            })),
            { value: CUSTOM, label: 'Custom scope', description: 'Write your own scope of work', icon: 'create' },
          ]}
          footer={
            <Button small variant="ghost" icon="settings-outline" label="Manage templates" onPress={() => router.push('/templates')} />
          }
        />
        <Field
          label={templateId && templateId !== CUSTOM ? 'Scope (edit if needed)' : 'Scope details'}
          required
          value={scope}
          onChangeText={(v) => {
            setScope(v);
            setErrors((e) => ({ ...e, scope: undefined }));
          }}
          placeholder="e.g. Daily cleaning, 2 hrs, Mon–Sat, includes laundry"
          multiline
          error={scope ? errors.scope : null}
        />
      </Card>

      <Card index={1}>
        <Field
          label="Service price per month (₹)"
          required
          icon="cash-outline"
          value={price}
          onChangeText={(v) => {
            setPrice(v.replace(/[^\d]/g, ''));
            setErrors((e) => ({ ...e, price: undefined }));
          }}
          keyboardType="number-pad"
          placeholder="e.g. 8500"
          error={errors.price}
        />
        <Row style={{ justifyContent: 'space-between', marginBottom: withTax ? space.md : 0 }}>
          <View style={{ flex: 1 }}>
            <Strong style={{ fontSize: 15 }}>Add tax</Strong>
            <Muted>Optional — only if you charge GST</Muted>
          </View>
          <Switch value={withTax} onValueChange={setWithTax} trackColor={{ true: colors.primary }} />
        </Row>
        {withTax ? (
          <Field
            label="Tax amount (₹)"
            icon="receipt-outline"
            value={tax}
            onChangeText={(v) => {
              setTax(v.replace(/[^\d]/g, ''));
              setErrors((e) => ({ ...e, tax: undefined }));
            }}
            keyboardType="number-pad"
            error={errors.tax}
          />
        ) : null}
      </Card>

      <Card index={2}>
        <Field label="Terms" value={terms} onChangeText={setTerms} multiline />
        <FieldLabel label="Valid for" />
        <ChipGroup>
          {VALIDITY.map((d) => (
            <Chip key={d} label={`${d} days`} selected={validDays === d} onPress={() => setValidDays(d)} />
          ))}
        </ChipGroup>
      </Card>

      <Card index={3} style={{ backgroundColor: colors.primarySoft }}>
        <KeyValue label="Service price" value={formatINR(num(price))} />
        {withTax ? <KeyValue label="Tax" value={formatINR(taxAmount)} /> : null}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Strong>Customer pays monthly</Strong>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>{formatINR(total)}</Text>
        </Row>
        <Muted style={{ marginTop: space.sm }}>Valid until {formatDate(validUntil)}. Sending replaces any open quotation.</Muted>
      </Card>
    </Screen>
  );
}
