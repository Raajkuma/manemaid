import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader, Switch, useFeedback, type Tone } from '@/components/ui';
import { formatDay } from '@/lib/booking';
import { supabase, unwrap, type Tables } from '@/lib/supabase';

export type Greeting = Tables<'greetings'>;
export type GreetingStatus = 'live' | 'scheduled' | 'ended' | 'hidden';

/** Today's date in India (greetings run on India calendar days, like the server). */
export const indiaToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export function greetingStatus(g: Pick<Greeting, 'active' | 'starts_on' | 'ends_on'>, today = indiaToday()): GreetingStatus {
  if (!g.active) return 'hidden';
  if (g.starts_on > today) return 'scheduled';
  if (g.ends_on < today) return 'ended';
  return 'live';
}
export const GREETING_STATUS: Record<GreetingStatus, { label: string; tone: Tone }> = {
  live: { label: 'Live today', tone: 'ok' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  ended: { label: 'Ended', tone: 'neutral' },
  hidden: { label: 'Hidden', tone: 'warn' },
};
export const GREETING_AUDIENCE: Record<string, string> = {
  all: 'All customers',
  active_customers: 'Customers with a confirmed or active booking',
};

export function Greetings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const q = useQuery({
    queryKey: ['greetings'],
    queryFn: async () => {
      const [g, d] = await Promise.all([
        supabase.from('greetings').select('*').order('starts_on', { ascending: false }),
        supabase.from('greeting_deliveries').select('greeting_id'),
      ]);
      const counts: Record<string, number> = {};
      for (const x of unwrap(d)) counts[x.greeting_id] = (counts[x.greeting_id] ?? 0) + 1;
      return { greetings: unwrap(g) as Greeting[], counts };
    },
  });
  const toggle = useMutation({
    mutationFn: async (g: Greeting) => {
      const { error } = await supabase.from('greetings').update({ active: !g.active }).eq('id', g.id);
      if (error) throw error;
      return !g.active;
    },
    onSuccess: (on) => {
      void qc.invalidateQueries();
      toast(on ? 'Greeting is active again' : 'Greeting hidden');
    },
    onError: (e) => toast(e.message, 'bad'),
  });

  return (
    <>
      <PageHeader
        title="Greetings"
        subtitle="Festival and celebration wishes. Customers see a pop-up once, the first time they open the app on those days."
        actions={<Button icon="plus" onClick={() => navigate('/agency/greetings/new')}>New greeting</Button>}
      />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.greetings.length ? (
        <Card><EmptyState icon="sparkles" title="No greetings yet" body="Wish your customers for Diwali, Pongal, New Year and more." action={<Button icon="plus" onClick={() => navigate('/agency/greetings/new')}>Create a greeting</Button>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.greetings.map((g) => {
            const st = GREETING_STATUS[greetingStatus(g)];
            const seen = q.data.counts[g.id] ?? 0;
            return (
              <Card key={g.id} className={`flex gap-3 p-4 ${g.active ? '' : 'opacity-70'}`}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/agency/greetings/${g.id}`)}>
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {g.push_to_inbox ? <Badge tone="neutral" dot={false}>+ Inbox</Badge> : null}
                  </div>
                  <p className="font-bold hover:text-brand-500">🎉 {g.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{g.message}</p>
                  <p className="mt-2 text-xs text-muted">
                    {formatDay(g.starts_on)}{g.ends_on !== g.starts_on ? ` → ${formatDay(g.ends_on)}` : ''} · {GREETING_AUDIENCE[g.audience]}
                  </p>
                  <p className="text-xs text-muted">Seen by <b className="text-ink">{seen}</b> {seen === 1 ? 'customer' : 'customers'}</p>
                </button>
                <Switch checked={g.active} label={g.active ? `Hide ${g.title}` : `Show ${g.title}`} disabled={toggle.isPending} onChange={() => toggle.mutate(g)} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
