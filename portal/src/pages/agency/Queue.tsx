import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { Badge, Card, ChoiceChips, EmptyState, ErrorBox, Loading, PageHeader, StatCard } from '@/components/ui';
import { BOOKING_SELECT, ENGAGEMENT, PAYMENT, QUEUE_GROUPS, STATUS, formatSchedule, type BookingRow } from '@/lib/booking';
import { timeAgo } from '@/lib/format';
import { supabase, unwrap } from '@/lib/supabase';

export function useQueue() {
  return useQuery({
    queryKey: ['queue'],
    queryFn: async () =>
      unwrap(await supabase.from('bookings').select(BOOKING_SELECT).order('updated_at', { ascending: false }).limit(200)) as unknown as BookingRow[],
  });
}

export function BookingCard({ b }: { b: BookingRow }) {
  const st = STATUS[b.status];
  const showPay = ['confirmed', 'active'].includes(b.status);
  return (
    <Link to={`/agency/bookings/${b.id}`} className="group block">
      <Card className="h-full p-4 transition group-hover:border-brand-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold group-hover:text-brand-500">{b.service_categories?.name ?? b.category_code}</p>
            <p className="truncate text-sm text-muted">
              {b.profiles?.full_name || 'Customer'} · {b.customer_addresses?.pincode ?? ''}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted">{b.reference}</span>
        </div>
        <p className="mt-1.5 text-xs text-muted">{ENGAGEMENT[b.engagement_type]} · {formatSchedule(b)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={st.tone}>{st.label}</Badge>
          {showPay ? <Badge tone={PAYMENT[b.payment_status].tone}>{PAYMENT[b.payment_status].label}</Badge> : null}
          {b.offer_title ? <Badge tone="warn">Offer</Badge> : null}
          <span className="ml-auto text-xs text-muted">{timeAgo(b.updated_at)}</span>
        </div>
      </Card>
    </Link>
  );
}

export function Queue() {
  const q = useQueue();
  const [group, setGroup] = useState('action');
  const all = q.data ?? [];
  const counts = Object.fromEntries(QUEUE_GROUPS.map((g) => [g.key, all.filter(g.match).length]));
  const current = QUEUE_GROUPS.find((g) => g.key === group)!;
  const list = all.filter(current.match);

  return (
    <>
      <PageHeader title="Work queue" subtitle="Everything that needs you — the same queue as the app, updated live." />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard icon="sparkles" label="Needs action" value={counts.action} tone="warn" />
            <StatCard icon="tag" label="Payments" value={counts.payments} tone="ok" />
            <StatCard icon="clock" label="Waiting on customer" value={counts.waiting} tone="info" />
          </div>
          <div className="mb-5">
            <ChoiceChips value={group} onChange={setGroup} options={QUEUE_GROUPS.map((g) => ({ value: g.key, label: `${g.label} · ${counts[g.key]}` }))} />
          </div>
          {list.length === 0 ? (
            <Card><EmptyState icon="check" title="All clear" body="New enquiries appear here instantly." /></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          )}
        </>
      )}
    </>
  );
}
