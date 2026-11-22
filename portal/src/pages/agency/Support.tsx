import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { Badge, Card, ChoiceChips, EmptyState, ErrorBox, Loading, PageHeader, StatCard } from '@/components/ui';
import { PRIORITY, PRIORITY_RANK, TICKET_CATEGORY, TICKET_FILTERS, TICKET_STATUS } from '@/lib/booking';
import { timeAgo } from '@/lib/format';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

type Row = Tables<'support_tickets'> & { profiles: { full_name: string | null; phone: string | null } | null };

export function Support() {
  const [filter, setFilter] = useState('active');
  const q = useQuery({
    queryKey: ['tickets'],
    queryFn: async () =>
      unwrap(await supabase.from('support_tickets').select('*, profiles(full_name, phone)').order('last_message_at', { ascending: false }).limit(200)) as unknown as Row[],
  });
  const all = q.data ?? [];
  const active = all.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const f = TICKET_FILTERS.find((x) => x.key === filter)!;
  // Urgent first, then priority customers, then oldest-waiting (same as the app).
  const list = all
    .filter((t) => f.statuses.includes(t.status))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.last_message_at.localeCompare(b.last_message_at));

  return (
    <>
      <PageHeader title="Support" subtitle="Customer requests — urgent and priority customers first." />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard icon="alert" label="Urgent" value={active.filter((t) => t.priority === 'urgent').length} tone="bad" />
            <StatCard icon="sparkles" label="Priority" value={active.filter((t) => t.priority === 'high').length} tone="warn" />
            <StatCard icon="clock" label="Standard" value={active.filter((t) => t.priority === 'normal').length} tone="neutral" />
          </div>
          <div className="mb-5">
            <ChoiceChips value={filter} onChange={setFilter} options={TICKET_FILTERS.map((x) => ({ value: x.key, label: `${x.label} · ${all.filter((t) => x.statuses.includes(t.status)).length}` }))} />
          </div>
          {list.length === 0 ? (
            <Card><EmptyState icon="chat" title="No requests here" body="New customer requests appear instantly." /></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => {
                const p = PRIORITY[t.priority];
                const s = TICKET_STATUS[t.status];
                return (
                  <Link key={t.id} to={`/agency/support/${t.id}`} className="group">
                    <Card className={`h-full p-4 transition group-hover:border-brand-300 ${t.priority === 'urgent' && (t.status === 'open' || t.status === 'in_progress') ? 'border-bad/60' : ''}`}>
                      <div className="flex justify-between gap-2">
                        <p className="font-bold group-hover:text-brand-500">{t.subject}</p>
                        <span className="text-xs text-muted">{t.reference}</span>
                      </div>
                      <p className="text-sm text-muted">{TICKET_CATEGORY[t.category] ?? t.category} · {t.profiles?.full_name || 'Customer'}{t.is_priority_customer ? ' ⭐' : ''}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        <Badge tone={p.tone}>{p.label}</Badge>
                        <span className="ml-auto text-xs text-muted">{timeAgo(t.last_message_at)}</span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
