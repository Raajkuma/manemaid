import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { Icon } from '@/components/icons';
import { Badge, Button, Card, ErrorBox, Loading, PageHeader, StatCard } from '@/components/ui';
import { QUEUE_GROUPS, STATUS } from '@/lib/booking';
import { formatDate, timeAgo } from '@/lib/format';
import { offerStatus } from '@/lib/offers';
import { useSession } from '@/lib/session';
import { supabase, unwrap } from '@/lib/supabase';

export function AgencyOverview() {
  const { profile } = useSession();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [offers, bookings, tickets, recent] = await Promise.all([
        supabase.from('offers').select('id, active, starts_at, ends_at'),
        supabase.from('bookings').select('status, payment_status, offer_id, created_at').limit(1000),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase
          .from('bookings')
          .select('id, reference, created_at, offer_title, status, service_categories(name), profiles(full_name)')
          .not('offer_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      if (tickets.error) throw tickets.error;
      const all = unwrap(bookings);
      // Same groups as the Work queue (app and console), so the numbers always match.
      const group = Object.fromEntries(QUEUE_GROUPS.map((g) => [g.key, all.filter(g.match).length]));
      return {
        group,
        liveOffers: unwrap(offers).filter((o) => offerStatus(o) === 'live').length,
        claimsThisMonth: all.filter((b) => b.offer_id && new Date(b.created_at) >= monthStart).length,
        openTickets: tickets.count ?? 0,
        recent: unwrap(recent),
      };
    },
  });

  const first = profile?.full_name?.split(' ')[0];

  return (
    <>
      <PageHeader
        title={first ? `Hello, ${first}` : 'Overview'}
        subtitle="Your bookings, support and offers at a glance — the same data as the app, updated live."
        actions={<Button icon="plus" onClick={() => navigate('/agency/offers/new')}>New offer</Button>}
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/agency/queue"><StatCard icon="sparkles" label="Needs action" value={q.data!.group.action} tone="warn" /></Link>
            <Link to="/agency/queue"><StatCard icon="tag" label="Payments to check" value={q.data!.group.payments} tone="ok" /></Link>
            <Link to="/agency/support"><StatCard icon="chat" label="Open support requests" value={q.data!.openTickets} tone="bad" /></Link>
            <Link to="/agency/offers"><StatCard icon="tag" label={`Live offers · ${q.data!.claimsThisMonth} claims this month`} value={q.data!.liveOffers} tone="brand" /></Link>
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-bold">Recent offer claims</h2>
              <Link to="/agency/offers" className="text-sm font-medium text-brand-500 hover:underline">Manage offers</Link>
            </div>
            {q.data!.recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">No bookings have claimed an offer yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {q.data!.recent.map((b) => (
                  <li key={b.id}>
                    <Link to={`/agency/bookings/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                      <div className="grid size-9 place-items-center rounded-lg bg-accent-soft text-brand-500"><Icon name="tag" size={17} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{b.reference} · {(b.service_categories as { name: string } | null)?.name ?? 'Service'}</p>
                        <p className="truncate text-xs text-muted">{(b.profiles as { full_name: string | null } | null)?.full_name || 'Customer'} claimed “{b.offer_title}”</p>
                      </div>
                      <Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge>
                      <span className="text-xs text-muted" title={formatDate(b.created_at)}>{timeAgo(b.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
